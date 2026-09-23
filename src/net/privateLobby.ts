import { z } from "zod";
import {
  createConnectionId,
  createNonce,
  createSessionId,
  sessionCode,
} from "../game/core/ids";
import type { Role } from "../game/state/contracts";
import {
  clearFragment,
  decodeSignal,
  encodeSignal,
  fragmentFrom,
  linkFor,
  type Signal,
} from "./signalingLink";

export type Slot = 0 | 1 | 2;
export type Member = {
  name: string;
  role: Role | null;
  ready: boolean;
  connected: boolean;
  ping: number | null;
};
const roleSchema = z.enum(["agent", "archivist", "dispatcher"]);
const memberSchema = z.object({
  name: z.string().max(24),
  role: roleSchema.nullable(),
  ready: z.boolean(),
  connected: z.boolean(),
  ping: z.number().nullable(),
});
const messageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("HELLO"),
    v: z.literal(1),
    sessionId: z.string(),
    slot: z.union([z.literal(1), z.literal(2)]),
    nonce: z.string(),
    connectionId: z.string(),
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
  }),
  z.object({
    type: z.literal("CHOICE"),
    role: roleSchema.nullable(),
    ready: z.boolean(),
    name: z.string().min(1).max(24),
  }),
  z.object({ type: z.literal("PING"), at: z.number() }),
  z.object({ type: z.literal("PONG"), at: z.number() }),
  z.object({ type: z.literal("START_GAME"), role: roleSchema }),
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
const emptyMember = (name: string): Member => ({
  name,
  role: null,
  ready: false,
  connected: false,
  ping: null,
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

export class PrivateLobby {
  readonly sessionId: string;
  readonly code: string;
  readonly isHost: boolean;
  readonly members: [Member, Member, Member];
  readonly localSlot: Slot;
  onChange: () => void = () => undefined;
  onStart: (role: Role) => void = () => undefined;
  error = "";
  pendingOffer: (Signal & { kind: "offer" }) | null = null;
  answerLink = "";
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
    return new PrivateLobby(true, createSessionId(), 0);
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
    const members = this.members.map((m) => ({ ...m }));
    for (const entry of this.slots.values())
      this.send(entry.channel, { type: "LOBBY_STATE", members });
    this.emit();
  }
  async createOffer(slot: 1 | 2): Promise<void> {
    if (!this.isHost) throw new Error("Nur der Host erzeugt Einladungen.");
    this.slots.get(slot)?.peer.close();
    this.slots.delete(slot);
    this.members[slot] = emptyMember(`Gast ${slot}`);
    this.broadcast();
    const peer = new RTCPeerConnection(iceConfig);
    const channel = peer.createDataChannel("lobby", { ordered: true });
    const nonce = createNonce();
    const entry: PeerSlot = {
      peer,
      channel,
      nonce,
      connectionId: null,
      offerLink: "",
      status: "Offer wird vorbereitet",
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
    } catch (error) {
      peer.close();
      entry.status = "Direkte Verbindung fehlgeschlagen";
      entry.offerLink = "";
      this.fail(error);
    }
  }
  private bindHost(slot: 1 | 2, entry: PeerSlot): void {
    const { channel, peer } = entry;
    channel.onmessage = (event) => {
      try {
        const msg = messageSchema.parse(JSON.parse(String(event.data)));
        if (msg.type === "HELLO") {
          if (
            msg.v !== 1 ||
            msg.sessionId !== this.sessionId ||
            msg.slot !== slot ||
            msg.nonce !== entry.nonce ||
            msg.connectionId !== entry.connectionId
          )
            throw new Error("Fremde oder veraltete Verbindungsdaten.");
          this.members[slot] = { ...emptyMember(msg.name), connected: true };
          entry.status = "Verbunden";
          this.send(channel, {
            type: "WELCOME",
            v: 1,
            sessionId: this.sessionId,
            slot,
            connectionId: msg.connectionId,
          });
          this.broadcast();
        } else if (entry.status !== "Verbunden")
          throw new Error("Handshake fehlt.");
        else if (msg.type === "CHOICE") {
          const taken = this.members.some(
            (m, i) => i !== slot && m.role === msg.role && msg.role !== null,
          );
          this.members[slot] = {
            ...this.members[slot],
            name: msg.name,
            role: taken ? null : msg.role,
            ready: !taken && msg.role !== null && msg.ready,
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
        this.members[slot] = emptyMember(`Gast ${slot}`);
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
    const peer = new RTCPeerConnection(iceConfig);
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
          name,
        });
      channel.onmessage = (message) => this.handleGuestMessage(message);
      channel.onclose = () => {
        this.members[this.localSlot].connected = false;
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
      this.emit();
    } catch (error) {
      peer.close();
      this.guestPeer = null;
      this.guestChannel = null;
      this.fail(error);
      throw error;
    }
  }
  private handleGuestMessage(event: MessageEvent): void {
    try {
      const msg = messageSchema.parse(JSON.parse(String(event.data)));
      if (msg.type === "WELCOME") {
        if (
          msg.v !== 1 ||
          msg.sessionId !== this.sessionId ||
          msg.slot !== this.localSlot ||
          msg.connectionId !== this.guestConnectionId
        )
          throw new Error("Ungültige Host-Bestätigung.");
        this.members[this.localSlot].connected = true;
        this.emit();
      } else if (msg.type === "LOBBY_STATE") {
        for (let i = 0; i < 3; i++) this.members[i] = msg.members[i]!;
        this.emit();
      } else if (msg.type === "PING")
        this.send(this.guestChannel!, { type: "PONG", at: msg.at });
      else if (msg.type === "PONG") {
        this.members[this.localSlot].ping = Math.max(
          0,
          Math.round(performance.now() - msg.at),
        );
        this.emit();
      } else if (msg.type === "START_GAME") this.onStart(msg.role);
    } catch (error) {
      this.fail(error);
      this.guestChannel?.close();
    }
  }
  choose(role: Role | null, ready: boolean, name: string): void {
    const cleanName =
      name.trim().slice(0, 24) || `Spieler ${this.localSlot + 1}`;
    if (!this.members[this.localSlot].connected)
      throw new Error("Zuerst verbinden.");
    if (
      role &&
      this.members.some((m, i) => i !== this.localSlot && m.role === role)
    )
      throw new Error("Diese Rolle ist bereits vergeben.");
    if (this.isHost) {
      this.members[0] = {
        ...this.members[0],
        name: cleanName,
        role,
        ready: !!role && ready,
      };
      this.broadcast();
    } else
      this.send(this.guestChannel!, {
        type: "CHOICE",
        name: cleanName,
        role,
        ready,
      });
  }
  canStart(): boolean {
    return (
      this.isHost &&
      this.members.every((m) => m.connected && m.ready && m.role) &&
      new Set(this.members.map((m) => m.role)).size === 3
    );
  }
  start(): void {
    if (!this.canStart())
      throw new Error("Drei verbundene, eindeutige Rollen müssen bereit sein.");
    for (const [slot, entry] of this.slots)
      this.send(entry.channel, {
        type: "START_GAME",
        role: this.members[slot].role!,
      });
    this.onStart(this.members[0].role!);
  }
  ping(): void {
    const now = performance.now();
    if (this.isHost)
      for (const entry of this.slots.values())
        this.send(entry.channel, { type: "PING", at: now });
    else if (this.guestChannel)
      this.send(this.guestChannel, { type: "PING", at: now });
  }
  close(): void {
    if (this.pulseTimer !== null) clearInterval(this.pulseTimer);
    for (const entry of this.slots.values()) entry.peer.close();
    this.guestPeer?.close();
  }
}
