import { z } from "zod";
import Peer, { type DataConnection } from "peerjs";
import {
  createClientId,
  createConnectionId,
  createNonce,
  createSessionId,
  sessionCode,
} from "../game/core/ids";
import type { Role } from "../game/state/contracts";
import {
  DEFAULT_GAME_MODE,
  GameModeSchema,
  modeContentHash,
  type GameMode,
} from "../game/modes/config";
import { GameNetwork } from "./gameNetwork";
import { MAX_ENVELOPE_BYTES } from "./protocol";
import {
  clearFragment,
  decodeSignal,
  encodeSignal,
  fragmentFrom,
  inviteLinkFor,
  linkFor,
  sessionFromInvite,
  type Signal,
} from "./signalingLink";

export type Slot = 0 | 1 | 2;
export type Member = {
  name: string;
  role: Role | null;
  ready: boolean;
  connected: boolean;
  ping: number | null;
  contentHash: string | null;
};
const roleSchema = z.enum(["agent", "archivist", "dispatcher"]);
const memberSchema = z.object({
  name: z.string().max(24),
  role: roleSchema.nullable(),
  ready: z.boolean(),
  connected: z.boolean(),
  ping: z.number().nullable(),
  contentHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
});
const messageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("HELLO"),
    v: z.literal(1),
    sessionId: z.string(),
    slot: z.union([z.literal(1), z.literal(2)]),
    nonce: z.string(),
    connectionId: z.string(),
    clientId: z.string().regex(/^[0-9a-f]{32}$/),
    name: z.string().min(1).max(24),
  }),
  z.object({
    type: z.literal("WELCOME"),
    v: z.literal(1),
    sessionId: z.string(),
    slot: z.union([z.literal(1), z.literal(2)]),
    connectionId: z.string(),
  }),
  z.object({
    type: z.literal("LOBBY_STATE"),
    members: z.array(memberSchema).length(3),
    mode: GameModeSchema,
    modeHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
  }),
  z.object({
    type: z.literal("CHOICE"),
    role: roleSchema.nullable(),
    ready: z.boolean(),
    name: z.string().min(1).max(24),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  z.object({ type: z.literal("PING"), at: z.number() }),
  z.object({ type: z.literal("PONG"), at: z.number() }),
  z.object({
    type: z.literal("START_GAME"),
    v: z.literal(1),
    sessionId: z.string().regex(/^[0-9a-f]{32}$/),
    role: roleSchema,
    startTick: z.number().int().nonnegative(),
    scenarioId: z.string(),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    mode: GameModeSchema,
  }),
]);
type Message = z.infer<typeof messageSchema>;
type PeerSlot = {
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
  nonce: string;
  connectionId: string | null;
  offerLink: string;
  status: string;
};
const stunUrl = import.meta.env.VITE_STUN_URL ?? "stun:stun.l.google.com:19302";
const iceConfig: RTCConfiguration = {
  iceServers: stunUrl ? [{ urls: stunUrl }] : [],
};
const ICE_TIMEOUT = 15_000;
const CONNECT_TIMEOUT = 20_000;
const SIGNAL_TIMEOUT = 20_000;
const peerIdFor = (sessionId: string): string => `hh-${sessionId}`;
const signalHost = import.meta.env.VITE_SIGNAL_HOST;
const signalOptions = {
  config: iceConfig,
  ...(signalHost
    ? {
        host: signalHost,
        port: Number(import.meta.env.VITE_SIGNAL_PORT ?? 9000),
        path: import.meta.env.VITE_SIGNAL_PATH ?? "/peerjs",
        secure: false,
      }
    : {}),
};
const emptyMember = (name: string): Member => ({
  name,
  role: null,
  ready: false,
  connected: false,
  ping: null,
  contentHash: null,
});

export async function waitForIce(
  peer: RTCPeerConnection,
  timeout = ICE_TIMEOUT,
): Promise<void> {
  if (peer.iceGatheringState === "complete") return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(
        new Error("ICE-Zeitüberschreitung. Bitte einen neuen Link erzeugen."),
      );
    }, timeout);
    const check = () => {
      if (peer.iceGatheringState === "complete") {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      peer.removeEventListener("icegatheringstatechange", check);
    };
    peer.addEventListener("icegatheringstatechange", check);
    check();
  });
  if (!peer.localDescription?.sdp)
    throw new Error("Keine vollständige Verbindungsbeschreibung verfügbar.");
}

function isTopLevelType(raw: string, type: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      parsed.type === type
    );
  } catch {
    return false;
  }
}
function lobbyMessageTooLarge(raw: string): boolean {
  return new TextEncoder().encode(raw).length > MAX_ENVELOPE_BYTES;
}

export class PrivateLobby {
  readonly sessionId: string;
  readonly code: string;
  readonly isHost: boolean;
  readonly members: [Member, Member, Member];
  readonly localSlot: Slot;
  mode: GameMode = DEFAULT_GAME_MODE;
  modeHash: string | null = null;
  onChange: () => void = () => undefined;
  onStart: (role: Role, network: GameNetwork) => void = () => undefined;
  game: GameNetwork | null = null;
  private transferred = false;
  private readonly clientId = createClientId();
  private playerIds: [string, string | null, string | null] = [
    this.clientId,
    null,
    null,
  ];
  error = "";
  pendingOffer: (Signal & { kind: "offer" }) | null = null;
  answerLink = "";
  inviteLink = "";
  private signalingPeer: Peer | null = null;
  private signalingConnection: DataConnection | null = null;
  private signalingSlots = new Map<1 | 2, DataConnection>();
  private slots = new Map<1 | 2, PeerSlot>();
  private guestPeer: RTCPeerConnection | null = null;
  private guestChannel: RTCDataChannel | null = null;
  private guestConnectionId: string | null = null;
  private pulseTimer: number | null = null;

  private constructor(isHost: boolean, sessionId: string, localSlot: Slot) {
    this.isHost = isHost;
    this.sessionId = sessionId;
    this.code = sessionCode(sessionId as ReturnType<typeof createSessionId>);
    this.localSlot = localSlot;
    this.members = [
      emptyMember("Host"),
      emptyMember("Gast 1"),
      emptyMember("Gast 2"),
    ];
    this.members[0].connected = true;
    this.pulseTimer = window.setInterval(() => this.ping(), 5000);
  }
  static host(): PrivateLobby {
    const lobby = new PrivateLobby(true, createSessionId(), 0);
    if (import.meta.env.VITE_SIGNAL_MODE !== "manual") lobby.startSignaling();
    return lobby;
  }
  private startSignaling(): void {
    const peer = new Peer(peerIdFor(this.sessionId), signalOptions);
    this.signalingPeer = peer;
    peer.on("open", () => {
      this.inviteLink = inviteLinkFor(this.sessionId);
      this.emit();
    });
    peer.on("connection", (connection) => {
      if (connection.metadata?.sessionId !== this.sessionId) {
        connection.close();
        return;
      }
      const slot = ([1, 2] as const).find(
        (candidate) =>
          !this.members[candidate].connected &&
          !this.signalingSlots.has(candidate),
      );
      if (!slot) {
        connection.on("open", () =>
          connection.send({ type: "error", message: "Lobby ist voll." }),
        );
        return;
      }
      this.signalingSlots.set(slot, connection);
      connection.on("open", () => {
        void this.createOffer(slot).then(() => {
          const offerLink = this.getSlot(slot).offerLink;
          if (connection.open && offerLink)
            connection.send({ type: "offer", link: offerLink });
          else if (connection.open)
            connection.send({
              type: "error",
              message:
                "Direkte Verbindung fehlgeschlagen. Manuelle Verbindung versuchen.",
            });
        });
      });
      connection.on("data", (raw: unknown) => {
        const answer = z
          .object({ type: z.literal("answer"), link: z.string().max(50_000) })
          .safeParse(raw);
        if (answer.success)
          void this.importAnswer(answer.data.link, slot).catch((error) =>
            this.fail(error),
          );
      });
      connection.on("close", () => {
        if (this.signalingSlots.get(slot) === connection)
          this.signalingSlots.delete(slot);
      });
    });
    peer.on("disconnected", () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on("error", () => {
      this.inviteLink = "";
      this.fail(
        new Error(
          "Ein-Link-Einladung nicht erreichbar. Manuelle Verbindung verwenden.",
        ),
      );
    });
  }
  static async fromInvite(input: string): Promise<PrivateLobby> {
    const sessionId = sessionFromInvite(input);
    const peer = new Peer(signalOptions);
    return new Promise<PrivateLobby>((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(
        () => fail(new Error("Einladungsdienst oder Host nicht erreichbar.")),
        SIGNAL_TIMEOUT,
      );
      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.destroy();
        reject(error);
      };
      peer.on("error", () =>
        fail(new Error("Einladungsdienst oder Host nicht erreichbar.")),
      );
      peer.on("open", () => {
        const connection = peer.connect(peerIdFor(sessionId), {
          reliable: true,
          serialization: "json",
          metadata: { sessionId },
        });
        connection.on("error", () => fail(new Error("Host nicht erreichbar.")));
        connection.on("close", () =>
          fail(new Error("Host hat die Einladung geschlossen.")),
        );
        connection.on("data", (raw: unknown) => {
          if (settled) return;
          const message = z
            .discriminatedUnion("type", [
              z.object({
                type: z.literal("offer"),
                link: z.string().max(50_000),
              }),
              z.object({
                type: z.literal("error"),
                message: z.string().max(200),
              }),
            ])
            .safeParse(raw);
          if (!message.success) return fail(new Error("Ungültige Einladung."));
          if (message.data.type === "error")
            return fail(new Error(message.data.message));
          void PrivateLobby.fromOffer(message.data.link)
            .then((lobby) => {
              if (lobby.sessionId !== sessionId)
                return fail(new Error("Fremde Einladung."));
              settled = true;
              clearTimeout(timer);
              lobby.signalingPeer = peer;
              lobby.signalingConnection = connection;
              lobby.bindGuestSignaling(connection);
              clearFragment();
              resolve(lobby);
            })
            .catch((error) =>
              fail(
                error instanceof Error
                  ? error
                  : new Error("Ungültige Einladung."),
              ),
            );
        });
      });
    });
  }
  private bindGuestSignaling(connection: DataConnection): void {
    connection.on("close", () => this.emit());
    connection.on("data", (raw: unknown) => {
      if (!this.game) return;
      const message = z
        .object({
          type: z.literal("offer"),
          link: z.string().max(50_000),
        })
        .safeParse(raw);
      if (message.success)
        void this.rejoin(
          message.data.link,
          this.members[this.localSlot].name,
        ).catch((error) => this.fail(error));
    });
  }
  get isAutomaticGuest(): boolean {
    return this.signalingConnection?.open ?? false;
  }
  get automaticSignalingEnabled(): boolean {
    return import.meta.env.VITE_SIGNAL_MODE !== "manual";
  }
  static async fromOffer(input: string): Promise<PrivateLobby> {
    const fragment = fragmentFrom(input);
    if (fragment.kind !== "offer")
      throw new Error("Dies ist kein Einladungslink.");
    const signal = await decodeSignal(fragment.payload);
    if (signal.kind !== "offer")
      throw new Error("Linktyp stimmt nicht überein.");
    const lobby = new PrivateLobby(false, signal.sessionId, signal.slot);
    lobby.pendingOffer = signal;
    return lobby;
  }
  getSlot(slot: 1 | 2): { status: string; offerLink: string } {
    const entry = this.slots.get(slot);
    return {
      status: entry?.status ?? "Noch kein Link",
      offerLink: entry?.offerLink ?? "",
    };
  }
  private emit(): void {
    this.onChange();
  }
  private fail(error: unknown): void {
    this.error =
      error instanceof Error ? error.message : "Verbindung fehlgeschlagen.";
    this.emit();
  }
  private send(channel: RTCDataChannel, message: Message): void {
    if (channel.readyState === "open") channel.send(JSON.stringify(message));
  }
  private broadcast(): void {
    if (!this.isHost) return;
    if (this.game) {
      this.emit();
      return;
    }
    const members = this.members.map((m) => ({ ...m }));
    for (const entry of this.slots.values())
      this.send(entry.channel, {
        type: "LOBBY_STATE",
        members,
        mode: this.mode,
        modeHash: this.modeHash,
      });
    this.emit();
  }
  async createOffer(slot: 1 | 2): Promise<void> {
    if (!this.isHost) throw new Error("Nur der Host erzeugt Einladungen.");
    this.slots.get(slot)?.peer.close();
    this.slots.delete(slot);
    if (!this.game) this.members[slot] = emptyMember(`Gast ${slot}`);
    else this.members[slot].connected = false;
    this.broadcast();
    const attempts = stunUrl ? [iceConfig, { iceServers: [] }] : [iceConfig];
    for (const [index, config] of attempts.entries()) {
      const peer = new RTCPeerConnection(config);
      const channel = peer.createDataChannel("lobby", { ordered: true });
      const nonce = createNonce();
      const entry: PeerSlot = {
        peer,
        channel,
        nonce,
        connectionId: null,
        offerLink: "",
        status: index
          ? "STUN nicht erreichbar · lokale Kandidaten"
          : "Offer wird vorbereitet",
      };
      this.slots.set(slot, entry);
      this.emit();
      try {
        this.bindHost(slot, entry);
        await peer.setLocalDescription(await peer.createOffer());
        await waitForIce(peer);
        if (this.slots.get(slot) !== entry) return;
        entry.offerLink = linkFor(
          "offer",
          await encodeSignal({
            v: 1,
            kind: "offer",
            sessionId: this.sessionId,
            slot,
            nonce,
            description: { type: "offer", sdp: peer.localDescription!.sdp },
          }),
        );
        entry.status = "Antwort fehlt";
        this.emit();
        return;
      } catch (error) {
        peer.close();
        entry.offerLink = "";
        if (
          index + 1 < attempts.length &&
          error instanceof Error &&
          error.message.startsWith("ICE-Zeitüberschreitung")
        )
          continue;
        entry.status = "Direkte Verbindung fehlgeschlagen";
        this.fail(error);
        return;
      }
    }
  }
  private bindHost(slot: 1 | 2, entry: PeerSlot): void {
    const { channel, peer } = entry;
    channel.onmessage = (event) => {
      const raw = String(event.data);
      if (lobbyMessageTooLarge(raw)) {
        this.fail(new Error("Netzwerknachricht zu groß."));
        channel.close();
        return;
      }
      if (this.game && !isTopLevelType(raw, "HELLO")) {
        this.game.receive(slot, raw);
        return;
      }
      try {
        const msg = messageSchema.parse(JSON.parse(raw));
        if (msg.type === "HELLO") {
          if (
            msg.v !== 1 ||
            msg.sessionId !== this.sessionId ||
            msg.slot !== slot ||
            msg.nonce !== entry.nonce ||
            msg.connectionId !== entry.connectionId
          )
            throw new Error("Fremde oder veraltete Verbindungsdaten.");
          if (this.playerIds[slot] && this.playerIds[slot] !== msg.clientId)
            throw new Error("Fremde Client-ID für reservierten Slot.");
          this.playerIds[slot] = msg.clientId;
          this.members[slot] = this.game
            ? { ...this.members[slot], name: msg.name, connected: true }
            : { ...emptyMember(msg.name), connected: true };
          entry.status = "Verbunden";
          this.send(channel, {
            type: "WELCOME",
            v: 1,
            sessionId: this.sessionId,
            slot,
            connectionId: msg.connectionId,
          });
          this.broadcast();
          if (this.game) this.game.connectionOpened(slot);
        } else if (entry.status !== "Verbunden")
          throw new Error("Handshake fehlt.");
        else if (msg.type === "CHOICE") {
          const taken = this.members.some(
            (m, i) => i !== slot && m.role === msg.role && msg.role !== null,
          );
          const compatible = msg.contentHash === this.modeHash;
          this.members[slot] = {
            ...this.members[slot],
            name: msg.name,
            role: taken ? null : msg.role,
            ready: !taken && compatible && msg.role !== null && msg.ready,
            contentHash: msg.contentHash,
          };
          this.broadcast();
        } else if (msg.type === "PING")
          this.send(channel, { type: "PONG", at: msg.at });
        else if (msg.type === "PONG") {
          this.members[slot].ping = Math.max(
            0,
            Math.round(performance.now() - msg.at),
          );
          this.broadcast();
        }
      } catch (error) {
        this.fail(error);
        channel.close();
      }
    };
    channel.onclose = () => {
      if (this.slots.get(slot) === entry) {
        this.game?.connectionClosed(slot);
        this.members[slot] = this.game
          ? { ...this.members[slot], connected: false }
          : emptyMember(`Gast ${slot}`);
        entry.status = "Getrennt";
        this.broadcast();
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" && this.slots.get(slot) === entry) {
        entry.status = "Direkte Verbindung fehlgeschlagen";
        this.fail(
          new Error(
            "Direkte Verbindung fehlgeschlagen. Ohne TURN-Relay können manche Netzwerke nicht verbunden werden. Neuen Link versuchen.",
          ),
        );
      }
    };
  }
  async importAnswer(input: string, slot: 1 | 2): Promise<void> {
    const entry = this.slots.get(slot);
    if (!entry || !entry.offerLink || entry.connectionId)
      throw new Error("Für diesen Slot gibt es kein offenes Offer.");
    const fragment = fragmentFrom(input);
    if (fragment.kind !== "answer")
      throw new Error("Bitte einen Answer-Link einfügen.");
    const signal = await decodeSignal(fragment.payload);
    if (
      signal.kind !== "answer" ||
      signal.sessionId !== this.sessionId ||
      signal.slot !== slot ||
      signal.nonce !== entry.nonce
    )
      throw new Error("Antwort gehört nicht zu diesem Slot oder ist veraltet.");
    entry.connectionId = signal.connectionId;
    entry.status = "Verbindung wird geprüft";
    this.emit();
    try {
      await entry.peer.setRemoteDescription(signal.description);
      window.setTimeout(() => {
        if (
          this.slots.get(slot) === entry &&
          entry.status === "Verbindung wird geprüft"
        ) {
          entry.status = "Direkte Verbindung fehlgeschlagen";
          this.fail(
            new Error(
              "Direkte Verbindung fehlgeschlagen. Ohne TURN-Relay kann diese Netzwerkkombination scheitern. Neuen Link versuchen.",
            ),
          );
        }
      }, CONNECT_TIMEOUT);
    } catch (error) {
      entry.connectionId = null;
      this.fail(error);
      throw error;
    }
  }
  async join(name: string): Promise<void> {
    const offer = this.pendingOffer;
    if (!offer) throw new Error("Einladung fehlt.");
    if (this.guestPeer) throw new Error("Einladung wurde bereits übernommen.");
    const attempts = stunUrl ? [iceConfig, { iceServers: [] }] : [iceConfig];
    for (const [index, config] of attempts.entries()) {
      const peer = new RTCPeerConnection(config);
      this.guestPeer = peer;
      this.guestConnectionId = createConnectionId();
      peer.ondatachannel = (event) => {
        const channel = event.channel;
        this.guestChannel = channel;
        channel.onopen = () =>
          this.send(channel, {
            type: "HELLO",
            v: 1,
            sessionId: this.sessionId,
            slot: offer.slot,
            nonce: offer.nonce,
            connectionId: this.guestConnectionId!,
            clientId: this.clientId,
            name,
          });
        channel.onmessage = (message) => this.handleGuestMessage(message);
        channel.onclose = () => {
          if (this.guestChannel !== channel) return;
          this.members[this.localSlot].connected = false;
          this.game?.connectionClosed(0);
          this.fail(new Error("Verbindung zum Host getrennt."));
        };
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed")
          this.fail(
            new Error(
              "Direkte Verbindung fehlgeschlagen. Ohne TURN-Relay kann diese Netzwerkkombination scheitern. Neue Einladung anfordern.",
            ),
          );
      };
      try {
        await peer.setRemoteDescription(offer.description);
        clearFragment();
        await peer.setLocalDescription(await peer.createAnswer());
        await waitForIce(peer);
        this.answerLink = linkFor(
          "answer",
          await encodeSignal({
            v: 1,
            kind: "answer",
            sessionId: this.sessionId,
            slot: offer.slot,
            nonce: offer.nonce,
            connectionId: this.guestConnectionId,
            description: { type: "answer", sdp: peer.localDescription!.sdp },
          }),
        );
        if (this.signalingConnection?.open)
          this.signalingConnection.send({
            type: "answer",
            link: this.answerLink,
          });
        this.emit();
        return;
      } catch (error) {
        peer.close();
        this.guestPeer = null;
        this.guestChannel = null;
        if (
          index + 1 < attempts.length &&
          error instanceof Error &&
          error.message.startsWith("ICE-Zeitüberschreitung")
        )
          continue;
        this.fail(error);
        throw error;
      }
    }
  }
  private handleGuestMessage(event: MessageEvent): void {
    const raw = String(event.data);
    if (lobbyMessageTooLarge(raw)) {
      this.fail(new Error("Netzwerknachricht zu groß."));
      this.guestChannel?.close();
      return;
    }
    if (this.game && !isTopLevelType(raw, "WELCOME")) {
      this.game.receive(0, raw);
      return;
    }
    try {
      const msg = messageSchema.parse(JSON.parse(raw));
      if (msg.type === "WELCOME") {
        if (
          msg.v !== 1 ||
          msg.sessionId !== this.sessionId ||
          msg.slot !== this.localSlot ||
          msg.connectionId !== this.guestConnectionId
        )
          throw new Error("Ungültige Host-Bestätigung.");
        this.members[this.localSlot].connected = true;
        if (this.game) this.game.connectionOpened(0);
        this.emit();
      } else if (msg.type === "LOBBY_STATE") {
        for (let i = 0; i < 3; i++) this.members[i] = msg.members[i]!;
        this.mode = msg.mode;
        this.modeHash = msg.modeHash;
        this.emit();
      } else if (msg.type === "PING")
        this.send(this.guestChannel!, { type: "PONG", at: msg.at });
      else if (msg.type === "PONG") {
        this.members[this.localSlot].ping = Math.max(
          0,
          Math.round(performance.now() - msg.at),
        );
        this.emit();
      } else if (msg.type === "START_GAME") {
        if (
          msg.v !== 1 ||
          msg.sessionId !== this.sessionId ||
          msg.role !== this.members[this.localSlot].role ||
          JSON.stringify(msg.mode) !== JSON.stringify(this.mode)
        )
          throw new Error("Fremde oder widersprüchliche Startnachricht.");
        this.game = GameNetwork.guest(this, msg.role, msg.contentHash);
        this.transferred = true;
        this.close();
        this.onStart(msg.role, this.game);
      }
    } catch (error) {
      this.fail(error);
      this.guestChannel?.close();
    }
  }
  async choose(role: Role | null, ready: boolean, name: string): Promise<void> {
    const cleanName =
      name.trim().slice(0, 24) || `Spieler ${this.localSlot + 1}`;
    if (!this.members[this.localSlot].connected)
      throw new Error("Zuerst verbinden.");
    if (
      role &&
      this.members.some((m, i) => i !== this.localSlot && m.role === role)
    )
      throw new Error("Diese Rolle ist bereits vergeben.");
    const hash = await modeContentHash(this.mode);
    if (this.modeHash && hash !== this.modeHash)
      throw new Error("Content-Hash stimmt nicht mit dem Host überein.");
    if (this.isHost) {
      this.modeHash = hash;
      this.members[0] = {
        ...this.members[0],
        name: cleanName,
        role,
        ready: !!role && ready,
        contentHash: hash,
      };
      this.broadcast();
    } else
      this.send(this.guestChannel!, {
        type: "CHOICE",
        name: cleanName,
        role,
        ready,
        contentHash: hash,
      });
  }
  async chooseMode(input: unknown): Promise<void> {
    if (!this.isHost || this.game)
      throw new Error("Nur der Host kann vor dem Start den Modus wählen.");
    const selectedMode = GameModeSchema.parse(input);
    this.mode = selectedMode;
    for (const member of this.members) {
      member.ready = false;
      member.contentHash = null;
    }
    this.modeHash = null;
    this.broadcast();
    const hash = await modeContentHash(selectedMode);
    if (this.mode !== selectedMode) return;
    this.modeHash = hash;
    this.broadcast();
  }
  canStart(): boolean {
    return (
      this.isHost &&
      this.members.every((m) => m.connected && m.ready && m.role) &&
      this.modeHash !== null &&
      this.members.every((m) => m.contentHash === this.modeHash) &&
      new Set(this.members.map((m) => m.role)).size === 3
    );
  }
  async start(): Promise<void> {
    if (!this.canStart())
      throw new Error("Drei verbundene, eindeutige Rollen müssen bereit sein.");
    this.game = await GameNetwork.host(this, this.members[0].role!);
    this.transferred = true;
    this.close();
    for (const [slot, entry] of this.slots)
      this.send(entry.channel, {
        type: "START_GAME",
        v: 1,
        sessionId: this.sessionId,
        role: this.members[slot].role!,
        mode: this.mode,
        ...this.game.publicStart(),
      });
    this.game.startHost();
    this.onStart(this.members[0].role!, this.game);
  }
  ping(): void {
    const now = performance.now();
    if (this.isHost)
      for (const entry of this.slots.values())
        this.send(entry.channel, { type: "PING", at: now });
    else if (this.guestChannel)
      this.send(this.guestChannel, { type: "PING", at: now });
  }
  playerIdFor(slot: Slot): string {
    const id = this.playerIds[slot];
    if (!id) throw new Error("Spieler-ID fehlt.");
    return id;
  }
  connectionIdFor(slot: Slot): string | null {
    return slot === 0
      ? this.guestConnectionId
      : (this.slots.get(slot)?.connectionId ?? null);
  }
  channelFor(slot: Slot): RTCDataChannel | null {
    return slot === 0
      ? this.guestChannel
      : this.slots.get(slot)?.status === "Verbunden"
        ? this.slots.get(slot)!.channel
        : null;
  }
  async createReconnectOffer(slot: 1 | 2): Promise<void> {
    if (
      !this.game ||
      !this.isHost ||
      !["guest-disconnected", "protocol-error"].includes(this.game.status)
    )
      throw new Error("Reconnect ist derzeit nicht möglich.");
    await this.createOffer(slot);
    const connection = this.signalingSlots.get(slot);
    const offerLink = this.getSlot(slot).offerLink;
    if (connection?.open && offerLink)
      connection.send({ type: "offer", link: offerLink });
  }
  async rejoin(input: string, name: string): Promise<void> {
    if (!this.game || this.isHost)
      throw new Error("Kein Gast-Reconnect möglich.");
    const fragment = fragmentFrom(input);
    if (fragment.kind !== "offer")
      throw new Error("Ein Offer-Link wird benötigt.");
    this.answerLink = "";
    this.emit();
    const signal = await decodeSignal(fragment.payload);
    if (
      signal.kind !== "offer" ||
      signal.sessionId !== this.sessionId ||
      signal.slot !== this.localSlot
    )
      throw new Error("Fremder Reconnect-Link.");
    this.guestPeer?.close();
    this.guestPeer = null;
    this.guestChannel = null;
    this.pendingOffer = signal;
    await this.join(name);
  }
  close(): void {
    if (this.pulseTimer !== null) clearInterval(this.pulseTimer);
    this.pulseTimer = null;
    if (!this.transferred) this.dispose();
  }
  dispose(): void {
    if (this.pulseTimer !== null) clearInterval(this.pulseTimer);
    for (const entry of this.slots.values()) entry.peer.close();
    this.guestPeer?.close();
    this.signalingConnection?.close();
    for (const connection of this.signalingSlots.values()) connection.close();
    this.signalingPeer?.destroy();
  }
}
