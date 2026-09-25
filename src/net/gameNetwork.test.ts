import { afterEach, describe, expect, it, vi } from "vitest";
import { GameNetwork } from "./gameNetwork";
import core from "../content/core/fixture.json";
import { loadContent } from "../content/registry";
import type { CampaignPackage } from "../content/schemas";
import { createActionId, type CaseId } from "../game/core/ids";
import {
  canonicalState,
  replaySimulation,
  type SimulationState,
} from "../game/state/simulation";
import type { PrivateLobby, Member, Slot } from "./privateLobby";
import type { Role } from "../game/state/contracts";
import { DEFAULT_GAME_MODE } from "../game/modes/config";

const ids = ["a", "b", "c"].map((c) => c.repeat(32));
const connections = [null, "d".repeat(32), "e".repeat(32)];
const roles: Role[] = ["archivist", "agent", "dispatcher"];
const members: [Member, Member, Member] = roles.map((role, i) => ({
  name: `P${i}`,
  role,
  ready: true,
  connected: true,
  ping: null,
  contentHash: null,
})) as [Member, Member, Member];
const live: GameNetwork[] = [];

type FakeChannel = {
  readyState: "open" | "closed";
  bufferedAmount: number;
  send: (raw: string) => void;
  close: () => void;
};
function fakeLobby(
  isHost: boolean,
  localSlot: Slot,
  channels: Partial<Record<Slot, FakeChannel>>,
): PrivateLobby {
  return {
    isHost,
    localSlot,
    sessionId: "f".repeat(32),
    members: structuredClone(members),
    mode: DEFAULT_GAME_MODE,
    playerIdFor: (slot: Slot) => ids[slot],
    connectionIdFor: (slot: Slot) => connections[isHost ? slot : localSlot],
    channelFor: (slot: Slot) => channels[slot] ?? null,
    dispose: () => undefined,
  } as unknown as PrivateLobby;
}
function channel(send: (raw: string) => void): FakeChannel {
  return {
    readyState: "open",
    bufferedAmount: 0,
    send,
    close() {
      this.readyState = "closed";
    },
  };
}
afterEach(() => {
  for (const game of live.splice(0)) game.destroy();
  vi.unstubAllGlobals();
});

describe("host simulation over role-filtered channels", () => {
  it("pauses a hidden host and resumes its own pause on return", async () => {
    let visible = true;
    const callbacks: Array<() => void> = [];
    vi.stubGlobal("document", {
      get hidden() {
        return !visible;
      },
      addEventListener: (_name: string, callback: () => void) => {
        callbacks.push(callback);
      },
      removeEventListener: () => undefined,
    });
    const host = await GameNetwork.host(fakeLobby(true, 0, {}), "archivist");
    live.push(host);
    host.startHost();
    visible = false;
    expect(callbacks).toHaveLength(1);
    callbacks[0]!();
    expect(host.view?.public.pauseReason).toBe("host-menu");
    visible = true;
    callbacks[0]!();
    expect(host.view?.public.pauseReason).toBeNull();
  });

  it("resolves a case with three peers and keeps guest secrets out", async () => {
    const sentToAgent: string[] = [];
    const hostChannels: Partial<Record<Slot, FakeChannel>> = {
      1: channel((raw) => {
        sentToAgent.push(raw);
        agent.receive(0, raw);
      }),
      2: channel((raw) => dispatcher.receive(0, raw)),
    };
    const agentChannels: Partial<Record<Slot, FakeChannel>> = {
      0: channel((raw) => host.receive(1, raw)),
    };
    const dispatcherChannels: Partial<Record<Slot, FakeChannel>> = {
      0: channel((raw) => host.receive(2, raw)),
    };
    const host = await GameNetwork.host(
      fakeLobby(true, 0, hostChannels),
      "archivist",
    );
    const agent = GameNetwork.guest(
      fakeLobby(false, 1, agentChannels),
      "agent",
    );
    const dispatcher = GameNetwork.guest(
      fakeLobby(false, 2, dispatcherChannels),
      "dispatcher",
    );
    live.push(host, agent, dispatcher);
    host.startHost();
    await vi.waitFor(() => expect(agent.view?.role.role).toBe("agent"));
    await vi.waitFor(() =>
      expect(dispatcher.view?.role.role).toBe("dispatcher"),
    );
    expect(agent.getDebugState()).toBeNull();
    const agentJson = JSON.stringify(agent.view);
    expect(agentJson).not.toContain("dossier");
    expect(agentJson).not.toContain("ruleText");
    expect(agentJson).not.toContain("trueDestination");
    expect(agentJson).not.toContain("rngState");
    expect(agentJson).not.toContain("seed");
    expect(agent.view?.public.report).toBeNull();
    const caseId = "core.scenario.first.case.1" as CaseId;
    const repeatedActionId = createActionId();
    expect(
      agent.submit({ kind: "ACCEPT_CASE", caseId }, repeatedActionId),
    ).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(5));
    await vi.waitFor(() =>
      expect(agent.view?.public.activeCaseId).toBe(caseId),
    );
    const target =
      dispatcher.view?.role.role === "dispatcher"
        ? dispatcher.view.role.machine.availableDestinations[0]
        : undefined;
    expect(target).toBeDefined();
    expect(
      dispatcher.submit({
        kind: "SELECT_DESTINATION",
        caseId,
        destinationId: target!,
      }),
    ).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(6));
    expect(
      dispatcher.view?.role.role === "dispatcher"
        ? dispatcher.view.role.incident?.diagnosis
        : null,
    ).toContain("Hitze");
    expect(
      dispatcher.submit({
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: "core.control.heat",
        value: 0,
      }),
    ).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(7));
    expect(dispatcher.submit({ kind: "RECOVER_INCIDENT", caseId })).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(8));
    expect(
      dispatcher.submit({
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: "core.control.valve",
        value: true,
      }),
    ).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(9));
    expect(dispatcher.submit({ kind: "PREPARE", caseId })).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(10));
    expect(
      agent.submit({ kind: "APPROVE", caseId, approved: true }),
    ).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(11));
    expect(host.submit({ kind: "APPROVE", caseId, approved: true })).toBeNull();
    expect(
      dispatcher.submit({ kind: "APPROVE", caseId, approved: true }),
    ).toBeNull();
    await vi.waitFor(() => expect(host.getDebugState()?.entries).toBe(13));
    const oldPacket = sentToAgent.find((raw) => raw.includes("STATE_PATCH"))!;
    expect(oldPacket).toBeDefined();
    hostChannels[1]!.readyState = "closed";
    agentChannels[0]!.readyState = "closed";
    host.connectionClosed(1);
    host.lobby.members[1].connected = false;
    agent.connectionClosed(0);
    expect(host.status).toBe("guest-disconnected");
    const oldRevision = agent.view!.public.revision;
    connections[1] = "1".repeat(32);
    hostChannels[1] = channel((raw) => agent.receive(0, raw));
    agentChannels[0] = channel((raw) => host.receive(1, raw));
    host.lobby.members[1].connected = true;
    host.connectionOpened(1);
    agent.connectionOpened(0);
    await vi.waitFor(() =>
      expect(agent.view!.public.revision).toBeGreaterThan(oldRevision),
    );
    expect(host.status).toBe("active");
    const reconnectedRevision = agent.view!.public.revision;
    agent.receive(0, oldPacket);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(agent.view!.public.revision).toBe(reconnectedRevision);
    const entriesBeforeDuplicate = host.getDebugState()!.entries;
    expect(
      agent.submit({ kind: "ACCEPT_CASE", caseId }, repeatedActionId),
    ).toBeNull();
    await vi.waitFor(() => expect(agent.error).toBe("Duplicate action ID"));
    expect(host.getDebugState()!.entries).toBe(entriesBeforeDuplicate);
    expect(dispatcher.submit({ kind: "ROUTE_COMMIT", caseId })).toBeNull();
    await vi.waitFor(() =>
      expect(host.getDebugState()?.entries).toBe(entriesBeforeDuplicate + 1),
    );
    await vi.waitFor(() =>
      expect(agent.view?.public.revision).toBe(host.view?.public.revision),
    );
    await vi.waitFor(() =>
      expect(dispatcher.view?.public.revision).toBe(host.view?.public.revision),
    );
    expect(host.status).toBe("active");
    expect(agent.status).toBe("active");
    expect(agent.view?.public.phase).toBe("shift");
    expect(agent.view?.public.report).toBeNull();
    const resolved = (host as unknown as { state: SimulationState }).state
      .cases[0]!;
    expect(resolved.status).toBe("resolved");
    expect(
      resolved.resolvedElapsedMs! - resolved.acceptedElapsedMs!,
    ).toBeGreaterThanOrEqual(0);
    expect(agent.exportDebugReplay()).toBeNull();
    const replay = host.exportDebugReplay()!;
    expect(replay.entries).toHaveLength(host.getDebugState()!.entries);
    const packages = (await loadContent([core as CampaignPackage])).packages;
    expect(
      canonicalState(replaySimulation(replay, packages, replay.contentHash)),
    ).toBe(
      canonicalState((host as unknown as { state: SimulationState }).state),
    );
  });
  it("ends a paused shift when the 60 second reconnect window expires", async () => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    try {
      const lobby = fakeLobby(true, 0, {});
      const host = await GameNetwork.host(lobby, "archivist");
      live.push(host);
      host.connectionClosed(1);
      lobby.members[1].connected = false;
      expect(host.status).toBe("guest-disconnected");
      clock.mockReturnValue(61_001);
      (host as unknown as { tick(): void }).tick();
      expect(host.status).toBe("guest-aborted");
      expect(host.getDebugState()).toMatchObject({
        phase: "results",
        entries: 6,
      });
    } finally {
      clock.mockRestore();
    }
  });
});
