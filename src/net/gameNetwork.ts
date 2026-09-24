import core from "../content/core/fixture.json";
import audit from "../content/campaigns/audit/fixture.json";
import { loadContent } from "../content/registry";
import type { CampaignPackage } from "../content/schemas";
import { createActionId } from "../game/core/ids";
import type { ActionId, PlayerId, SessionId } from "../game/core/ids";
import type { PlayerViewState, Role } from "../game/state/contracts";
import { projectView } from "../game/state/projectView";
import {
  advanceToTick,
  createReplay,
  createSimulation,
  recordInput,
  TICK_MS,
  type LogEntry,
  type Replay,
  type SimCommand,
  type SimulationState,
  type StartConfig,
} from "../game/state/simulation";
import type { PrivateLobby } from "./privateLobby";
import {
  applyPatch,
  decodeEnvelope,
  encodeEnvelope,
  makePatch,
  MAX_BUFFERED_BYTES,
  packView,
  unpackView,
  viewHash,
  type Payload,
} from "./protocol";

const DISCONNECT_MS = 60_000;
const RATE_WINDOW_MS = 5_000;
const RATE_MAX = 100;
export type NetworkStatus =
  | "active"
  | "guest-disconnected"
  | "host-disconnected"
  | "connection-lost"
  | "host-aborted"
  | "guest-aborted"
  | "protocol-error"
  | "ended";

const terminal = (status: NetworkStatus): boolean =>
  status === "ended" || status === "host-aborted" || status === "guest-aborted";

export class GameNetwork {
  readonly isHost: boolean;
  readonly role: Role;
  readonly lobby: PrivateLobby;
  view: PlayerViewState | null = null;
  status: NetworkStatus = "active";
  error = "";
  remainingMs: number | null = null;
  pingMs: number | null = null;
  onChange: () => void = () => undefined;
  private listeners = new Set<() => void>();
  private state: SimulationState | null = null;
  private startConfig: StartConfig | null = null;
  private packages: CampaignPackage[] = [];
  private entries: LogEntry[] = [];
  private sendSeq = new Map<number, number>();
  private recvSeq = new Map<number, number>();
  private receivedAt = new Map<number, number[]>();
  private blockedSlots = new Set<number>();
  private lastPingAt = 0;
  private receiveChain = new Map<number, Promise<void>>();
  private lastSent = new Map<number, PlayerViewState>();
  private pendingSnapshot = new Set<number>();
  private publishing = false;
  private started = false;
  private dirty = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private deadline: number | null = null;
  private tickEpoch = performance.now();

  private constructor(lobby: PrivateLobby, role: Role) {
    this.lobby = lobby;
    this.role = role;
    this.isHost = lobby.isHost;
  }
  static async host(lobby: PrivateLobby, role: Role): Promise<GameNetwork> {
    const network = new GameNetwork(lobby, role);
    const registry = await loadContent([core, audit]);
    network.packages = registry.packages;
    const players = ([0, 1, 2] as const).map((slot) => ({
      id: lobby.playerIdFor(slot) as PlayerId,
      role: lobby.members[slot].role!,
    }));
    const config = {
      sessionId: lobby.sessionId as SessionId,
      hostPlayerId: lobby.playerIdFor(0) as PlayerId,
      scenarioId: "core.scenario.first",
      players,
    };
    network.startConfig = config;
    network.state = createSimulation(
      config,
      crypto.randomUUID(),
      registry.gameplayHash,
    );
    for (const player of players)
      network.applyInput({
        type: "command",
        playerId: player.id,
        actionId: createActionId(),
        command: { kind: "READY", ready: true },
      });
    network.applyInput({
      type: "command",
      playerId: config.hostPlayerId,
      actionId: createActionId(),
      command: { kind: "START" },
    });
    network.view = projectView(network.state!, role, network.packages);
    network.tickEpoch = performance.now();
    return network;
  }
  static guest(
    lobby: PrivateLobby,
    role: Role,
    expectedHash?: string,
  ): GameNetwork {
    const network = new GameNetwork(lobby, role);
    if (expectedHash) void network.verifyContent(expectedHash);
    return network;
  }
  publicStart(): {
    startTick: number;
    scenarioId: string;
    contentHash: string;
  } {
    if (!this.state) throw new Error("Keine Host-Simulation.");
    return {
      startTick: this.state.hostTick,
      scenarioId: this.state.scenarioId,
      contentHash: this.state.contentHash,
    };
  }
  private async verifyContent(expectedHash: string): Promise<void> {
    try {
      const registry = await loadContent([core, audit]);
      if (registry.gameplayHash !== expectedHash)
        throw new Error("Inkompatibler Content-Hash.");
    } catch (error) {
      this.protocolError(0, error);
    }
  }
  startHost(): void {
    if (!this.isHost) return;
    this.started = true;
    for (const slot of [1, 2] as const) void this.sendSnapshot(slot);
    this.tickTimer = globalThis.setInterval(() => this.tick(), TICK_MS);
    this.emit();
  }
  private emit(): void {
    this.onChange();
    for (const listener of this.listeners) listener();
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }
  private player(slot: 0 | 1 | 2): PlayerId {
    return this.lobby.playerIdFor(slot) as PlayerId;
  }
  private send(slot: 0 | 1 | 2, payload: Payload): boolean {
    const channel = this.lobby.channelFor(slot);
    const connectionId = this.lobby.connectionIdFor(slot);
    if (!channel || channel.readyState !== "open" || !connectionId)
      return false;
    if (channel.bufferedAmount > MAX_BUFFERED_BYTES) return false;
    const seq = (this.sendSeq.get(slot) ?? 0) + 1;
    const raw = encodeEnvelope({
      v: 1,
      sessionId: this.lobby.sessionId,
      connectionId,
      seq,
      payload,
    });
    if (
      channel.bufferedAmount + new TextEncoder().encode(raw).length >
      MAX_BUFFERED_BYTES
    )
      return false;
    channel.send(raw);
    this.sendSeq.set(slot, seq);
    return true;
  }
  receive(slot: 0 | 1 | 2, raw: string): void {
    if (this.blockedSlots.has(slot)) return;
    const previous = this.receiveChain.get(slot) ?? Promise.resolve();
    const next = previous
      .then(() => this.handle(slot, raw))
      .catch((error: unknown) => this.protocolError(slot, error));
    this.receiveChain.set(slot, next);
  }
  private async handle(slot: 0 | 1 | 2, raw: string): Promise<void> {
    const envelope = decodeEnvelope(raw);
    if (envelope.sessionId !== this.lobby.sessionId)
      throw new Error("Fremde Session.");
    if (envelope.connectionId !== this.lobby.connectionIdFor(slot)) return; // late packet from replaced connection
    const last = this.recvSeq.get(slot) ?? 0;
    if (envelope.seq !== last + 1)
      throw new Error("Ungültige Nachrichtensequenz.");
    this.recvSeq.set(slot, envelope.seq);
    const now = performance.now();
    const times = (this.receivedAt.get(slot) ?? []).filter(
      (time) => now - time < RATE_WINDOW_MS,
    );
    times.push(now);
    this.receivedAt.set(slot, times);
    if (times.length > RATE_MAX)
      throw new Error("Zu viele Netzwerknachrichten.");
    const payload = envelope.payload;
    if (payload.type === "PING") {
      this.send(slot, { type: "PONG", at: payload.at });
      return;
    }
    if (payload.type === "PONG") {
      this.pingMs = Math.max(0, Math.round(performance.now() - payload.at));
      this.emit();
      return;
    }
    if (this.isHost) {
      if (slot === 0) throw new Error("Ungültiger Gastslot.");
      if (payload.type === "ACTION") {
        if (payload.baseRevision > this.state!.stateRevision) {
          this.send(slot, {
            type: "ACTION_REJECTED",
            actionId: payload.actionId,
            reason: "Zukünftige Revision.",
          });
          return;
        }
        const result = this.applyAction(
          slot,
          payload.actionId as ActionId,
          payload.command as SimCommand,
        );
        if (result)
          this.send(slot, {
            type: "ACTION_REJECTED",
            actionId: payload.actionId,
            reason: result,
          });
      } else if (payload.type === "SNAPSHOT_REQUEST")
        await this.sendSnapshot(slot);
      else throw new Error("Nachrichtentyp vom Gast nicht erlaubt.");
    } else {
      if (slot !== 0) throw new Error("Ungültiger Hostslot.");
      if (payload.type === "STATE_SNAPSHOT") {
        const next = await unpackView(payload.data, payload.hash);
        if (
          next.role.role !== this.role ||
          next.public.revision !== payload.revision
        )
          throw new Error("Falsche Rollenansicht.");
        if (!this.view || next.public.revision >= this.view.public.revision) {
          this.view = next;
          this.status = "active";
          this.emit();
        }
      } else if (payload.type === "STATE_PATCH") {
        if (!this.view || payload.baseRevision !== this.view.public.revision) {
          if (!this.view || payload.revision > this.view.public.revision)
            this.requestSnapshot();
          return;
        }
        try {
          const next = await applyPatch(this.view, payload);
          if (next.role.role !== this.role)
            throw new Error("Falsche Rollenansicht.");
          this.view = next;
          this.emit();
        } catch {
          this.requestSnapshot();
        }
      } else if (payload.type === "ACTION_REJECTED") {
        this.error = payload.reason;
        this.emit();
      } else if (payload.type === "PAUSE_STATE") {
        this.status = payload.paused ? "guest-disconnected" : "active";
        this.remainingMs = payload.remainingMs;
        this.emit();
      } else if (payload.type === "GAME_OVER") {
        this.status =
          payload.reason === "abandoned" || payload.reason === "host-left"
            ? "host-aborted"
            : payload.reason === "disconnect"
              ? "guest-aborted"
              : "ended";
        this.error =
          payload.reason === "abandoned" || payload.reason === "host-left"
            ? "Der Host hat die Partie beendet."
            : payload.reason === "disconnect"
              ? "Reconnect-Frist abgelaufen. Die Partie ist beendet."
              : "";
        this.emit();
      } else throw new Error("Nachrichtentyp vom Host nicht erlaubt.");
    }
  }
  private protocolError(slot: 0 | 1 | 2, error: unknown): void {
    this.blockedSlots.add(slot);
    this.status = "protocol-error";
    this.error = error instanceof Error ? error.message : "Protokollfehler.";
    this.lobby.channelFor(slot)?.close();
    this.emit();
  }
  private applyInput(input: Parameters<typeof recordInput>[2]): string | null {
    const result = recordInput(this.state!, this.entries, input, this.packages);
    if (result.transition.rejected) return result.transition.rejected;
    this.state = result.transition.state;
    this.entries = result.entries;
    this.view = projectView(this.state, this.role, this.packages);
    this.dirty = true;
    this.emit();
    if (this.state.phase === "results") this.finish();
    else if (this.started) void this.publish();
    return null;
  }
  private applyAction(
    slot: 0 | 1 | 2,
    actionId: ActionId,
    command: SimCommand,
  ): string | null {
    if (!this.isHost) return "Nur Host darf Aktionen ausführen.";
    return this.applyInput({
      type: "command",
      playerId: this.player(slot),
      actionId,
      command,
    });
  }
  submit(
    command: SimCommand,
    actionId: ActionId = createActionId(),
  ): string | null {
    if (this.isHost) return this.applyAction(0, actionId, command);
    if (!this.view) return "Noch kein Snapshot empfangen.";
    return this.send(0, {
      type: "ACTION",
      actionId,
      baseRevision: this.view.public.revision,
      command,
    })
      ? null
      : "Verbindung oder Sendepuffer nicht verfügbar.";
  }
  private tick(): void {
    if (!this.state || terminal(this.status)) return;
    const target = Math.max(
      this.state.hostTick,
      Math.floor((performance.now() - this.tickEpoch) / TICK_MS),
    );
    if (performance.now() - this.lastPingAt >= 5000) {
      this.lastPingAt = performance.now();
      for (const slot of [1, 2] as const)
        this.send(slot, { type: "PING", at: this.lastPingAt });
    }
    if (target > this.state.hostTick) {
      this.state = advanceToTick(this.state, target);
      this.view = projectView(this.state, this.role, this.packages);
      this.dirty = true;
      this.emit();
      if (this.state.phase === "results") this.finish();
      else void this.publish();
    }
    if (this.deadline !== null) {
      this.remainingMs = Math.max(
        0,
        Math.ceil(this.deadline - performance.now()),
      );
      if (this.remainingMs === 0) {
        this.deadline = null;
        this.applyInput({
          type: "system",
          event: { kind: "DISCONNECT_EXPIRED" },
        });
      }
      this.emit();
    }
  }
  private async publish(): Promise<void> {
    if (!this.isHost || this.publishing || !this.dirty || !this.state) return;
    this.publishing = true;
    try {
      do {
        this.dirty = false;
        const state = this.state;
        for (const slot of [1, 2] as const) {
          if (!this.lobby.members[slot].connected) continue;
          const next = projectView(
            state,
            this.lobby.members[slot].role!,
            this.packages,
          );
          const before = this.lastSent.get(slot);
          if (!before || this.pendingSnapshot.has(slot)) {
            await this.sendSnapshot(slot);
            continue;
          }
          if (next.public.revision === before.public.revision) continue;
          const hash = await viewHash(next);
          const sent = this.send(slot, {
            type: "STATE_PATCH",
            baseRevision: before.public.revision,
            revision: next.public.revision,
            changes: makePatch(before, next),
            hash,
          });
          if (sent) this.lastSent.set(slot, next);
          else this.pendingSnapshot.add(slot);
        }
      } while (this.dirty);
    } finally {
      this.publishing = false;
    }
  }
  private async sendSnapshot(slot: 1 | 2): Promise<void> {
    if (!this.state || !this.lobby.members[slot].connected) return;
    const view = projectView(
      this.state,
      this.lobby.members[slot].role!,
      this.packages,
    );
    const packed = await packView(view);
    if (
      this.send(slot, {
        type: "STATE_SNAPSHOT",
        revision: view.public.revision,
        encoding: "deflate-base64url",
        ...packed,
      })
    ) {
      this.lastSent.set(slot, view);
      this.pendingSnapshot.delete(slot);
    } else this.pendingSnapshot.add(slot);
  }
  private requestSnapshot(): void {
    this.send(0, {
      type: "SNAPSHOT_REQUEST",
      revision: this.view?.public.revision ?? 0,
    });
  }
  connectionOpened(slot: 0 | 1 | 2): void {
    this.blockedSlots.delete(slot);
    this.sendSeq.set(slot, 0);
    this.recvSeq.set(slot, 0);
    this.receivedAt.delete(slot);
    this.receiveChain.delete(slot);
    if (this.isHost && slot !== 0) {
      this.applyInput({
        type: "system",
        event: { kind: "RECONNECTED", playerId: this.player(slot) },
      });
      if (this.state?.pause === null) {
        this.deadline = null;
        this.remainingMs = null;
        this.status = "active";
        this.error = "";
        this.broadcastPause(false);
        this.emit();
      }
      void this.sendSnapshot(slot);
    } else {
      this.status = "active";
      this.error = "";
      this.requestSnapshot();
      this.emit();
    }
  }
  connectionClosed(slot: 0 | 1 | 2): void {
    if (terminal(this.status)) return;
    if (!this.isHost) {
      if (this.status !== "protocol-error") {
        this.status = "connection-lost";
        this.error =
          "Verbindung zum Host verloren. Bitte einen neuen Reconnect-Link anfordern.";
      }
      this.emit();
      return;
    }
    if (slot === 0 || !this.lobby.members[slot].connected) return;
    this.applyInput({
      type: "system",
      event: { kind: "DISCONNECTED", playerId: this.player(slot) },
    });
    if (this.status !== "protocol-error") this.status = "guest-disconnected";
    if (this.deadline === null)
      this.deadline = performance.now() + DISCONNECT_MS;
    this.remainingMs = Math.max(
      0,
      Math.ceil(this.deadline - performance.now()),
    );
    this.broadcastPause(true);
    this.emit();
  }
  private broadcastPause(paused: boolean): void {
    for (const slot of [1, 2] as const)
      this.send(slot, {
        type: "PAUSE_STATE",
        paused,
        remainingMs: paused ? this.remainingMs : null,
      });
  }
  private finish(): void {
    if (terminal(this.status)) return;
    const reason = this.state?.endReason ?? "abandoned";
    this.status =
      reason === "abandoned"
        ? "host-aborted"
        : reason === "disconnect"
          ? "guest-aborted"
          : "ended";
    this.deadline = null;
    void this.sendFinalViews(reason);
    this.emit();
  }
  private async sendFinalViews(
    reason: "completed" | "time" | "pressure" | "abandoned" | "disconnect",
  ): Promise<void> {
    for (const slot of [1, 2] as const) {
      if (this.lobby.members[slot].connected) {
        await this.sendSnapshot(slot);
        this.send(slot, { type: "GAME_OVER", reason });
      }
    }
  }
  getDebugState(): { revision: number; phase: string; entries: number } | null {
    return this.state
      ? {
          revision: this.state.stateRevision,
          phase: this.state.phase,
          entries: this.entries.length,
        }
      : null;
  }
  exportDebugReplay(): Replay | null {
    return this.isHost && this.startConfig && this.state
      ? createReplay(this.startConfig, this.state, this.entries)
      : null;
  }
  destroy(): void {
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    this.lobby.dispose();
  }
}
