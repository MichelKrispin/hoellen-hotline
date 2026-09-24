import { describe, expect, it } from "vitest";
import core from "../../content/core/fixture.json";
import { loadContent } from "../../content/registry";
import type { CampaignPackage } from "../../content/schemas";
import { caseContent, generateCase } from "../cases/generate";
import { Random, normalizeSeed } from "../core/random";
import { evaluateDestination, machineCanBeConfigured } from "../rules/evaluate";
import { projectView } from "./projectView";
import type { ActionId, CaseId, PlayerId, SessionId } from "../core/ids";
import {
  advanceToTick,
  canonicalState,
  createReplay,
  createSimulation,
  recordInput,
  replaySimulation,
  reduceInput,
  type SimCommand,
  type SimulationState,
  type StartConfig,
} from "./simulation";

const packages = [core as CampaignPackage];
const agent = "agent-player" as PlayerId;
const archivist = "archivist-player" as PlayerId;
const dispatcher = "dispatcher-player" as PlayerId;
const config: StartConfig = {
  sessionId: "0123456789abcdef0123456789abcdef" as SessionId,
  hostPlayerId: agent,
  scenarioId: "core.scenario.first",
  players: [
    { id: agent, role: "agent" },
    { id: archivist, role: "archivist" },
    { id: dispatcher, role: "dispatcher" },
  ],
  shiftTicks: 500,
};

describe("deterministic simulation", () => {
  it("freezes shift time and dialogue cooldowns during host and disconnect pauses", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    let state = createSimulation(config, "pause", hash);
    let serial = 0;
    const send = (playerId: PlayerId, command: SimCommand) => {
      const result = reduceInput(
        state,
        {
          type: "command",
          playerId,
          actionId: `pause-${++serial}` as ActionId,
          command,
        },
        packages,
      );
      expect(result.rejected).toBeUndefined();
      state = result.state;
    };
    for (const playerId of [agent, archivist, dispatcher])
      send(playerId, { kind: "READY", ready: true });
    send(agent, { kind: "START" });
    const caseId = state.cases[0]!.id;
    send(agent, { kind: "ACCEPT_CASE", caseId });
    send(agent, { kind: "DIALOGUE", caseId, choiceId: "ask" });
    const elapsed = state.shift.elapsedMs;
    const cooldown = projectView(state, "agent", packages).role;
    expect(cooldown.role === "agent" && cooldown.cooldownMs).toBe(3000);
    send(agent, { kind: "PAUSE" });
    state = advanceToTick(state, state.hostTick + 100);
    expect(state.shift.elapsedMs).toBe(elapsed);
    const pausedCooldown = projectView(state, "agent", packages).role;
    expect(pausedCooldown.role === "agent" && pausedCooldown.cooldownMs).toBe(
      3000,
    );
    send(agent, { kind: "RESUME" });
    state = advanceToTick(state, state.hostTick + 10);
    const resumedCooldown = projectView(state, "agent", packages).role;
    expect(resumedCooldown.role === "agent" && resumedCooldown.cooldownMs).toBe(
      2000,
    );
    state = reduceInput(
      state,
      { type: "system", event: { kind: "DISCONNECTED", playerId: archivist } },
      packages,
    ).state;
    const disconnectElapsed = state.shift.elapsedMs;
    state = advanceToTick(state, state.hostTick + 100);
    expect(state.shift.elapsedMs).toBe(disconnectElapsed);
    const disconnectCooldown = projectView(state, "agent", packages).role;
    expect(
      disconnectCooldown.role === "agent" && disconnectCooldown.cooldownMs,
    ).toBe(2000);
  });
  it("keeps three queued cases and accepts only the front case", async () => {
    const expanded = structuredClone(core) as CampaignPackage;
    expanded.scenarios[0]!.casePlan.count = 8;
    expanded.scenarios[0]!.victory.count = 8;
    const expandedPackages = [expanded];
    const hash = (await loadContent(expandedPackages)).gameplayHash;
    let state = createSimulation(config, "queue", hash);
    let serial = 0;
    const attempt = (playerId: PlayerId, command: SimCommand) => {
      const result = reduceInput(
        state,
        {
          type: "command",
          playerId,
          actionId: `queue-${++serial}` as ActionId,
          command,
        },
        expandedPackages,
      );
      if (!result.rejected) state = result.state;
      return result.rejected;
    };
    for (const playerId of [agent, archivist, dispatcher])
      expect(attempt(playerId, { kind: "READY", ready: true })).toBeUndefined();
    expect(attempt(agent, { kind: "START" })).toBeUndefined();
    expect(state.cases.map((item) => item.status)).toEqual([
      "queued",
      "queued",
      "queued",
    ]);
    expect(
      attempt(agent, { kind: "ACCEPT_CASE", caseId: state.cases[1]!.id }),
    ).toBe("Case cannot be accepted");
    expect(
      attempt(agent, { kind: "ACCEPT_CASE", caseId: state.cases[0]!.id }),
    ).toBeUndefined();
    expect(
      attempt(agent, { kind: "ACCEPT_CASE", caseId: state.cases[1]!.id }),
    ).toBe("Case cannot be accepted");
    expect(state.cases.filter((item) => item.status === "active")).toHaveLength(
      1,
    );
    expect(state.cases.filter((item) => item.status === "queued")).toHaveLength(
      2,
    );
  });
  it("requires incident recovery, machine preparation and all three approvals before routing", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    let state = createSimulation(config, "dispatcher safety", hash);
    let serial = 0;
    const attempt = (playerId: PlayerId, command: SimCommand) => {
      const result = reduceInput(
        state,
        {
          type: "command",
          playerId,
          actionId: `dispatcher-${++serial}` as ActionId,
          command,
        },
        packages,
      );
      if (!result.rejected) state = result.state;
      return result.rejected;
    };
    for (const playerId of [agent, archivist, dispatcher])
      expect(attempt(playerId, { kind: "READY", ready: true })).toBeUndefined();
    expect(attempt(agent, { kind: "START" })).toBeUndefined();
    const caseId = state.cases[0]!.id;
    expect(attempt(agent, { kind: "ACCEPT_CASE", caseId })).toBeUndefined();
    expect(
      attempt(dispatcher, {
        kind: "SELECT_DESTINATION",
        caseId,
        destinationId: "core.destination.archive",
      }),
    ).toBeUndefined();
    expect(attempt(agent, { kind: "PREPARE", caseId })).toBe(
      "No destination selected",
    );
    expect(attempt(dispatcher, { kind: "PREPARE", caseId })).toBe(
      "Incident unresolved",
    );
    expect(attempt(dispatcher, { kind: "RECOVER_INCIDENT", caseId })).toBe(
      "Incident recovery condition not met",
    );
    expect(
      attempt(dispatcher, {
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: "core.control.heat",
        value: 0,
      }),
    ).toBeUndefined();
    expect(
      attempt(dispatcher, { kind: "RECOVER_INCIDENT", caseId }),
    ).toBeUndefined();
    expect(attempt(dispatcher, { kind: "PREPARE", caseId })).toBe(
      "Machine requirements not met",
    );
    expect(
      attempt(dispatcher, {
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: "core.control.valve",
        value: true,
      }),
    ).toBeUndefined();
    expect(attempt(dispatcher, { kind: "PREPARE", caseId })).toBeUndefined();
    expect(attempt(dispatcher, { kind: "ROUTE_COMMIT", caseId })).toBe(
      "Routing not approved",
    );
    for (const playerId of [agent, archivist, dispatcher])
      expect(
        attempt(playerId, { kind: "APPROVE", caseId, approved: true }),
      ).toBeUndefined();
    expect(state.cases[0]!.status).toBe("approved");
    expect(state.cases[0]!.approvalLog.map((entry) => entry.role)).toEqual([
      "agent",
      "archivist",
      "dispatcher",
    ]);
    expect(
      attempt(dispatcher, {
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: "core.control.valve",
        value: false,
      }),
    ).toBeUndefined();
    expect(state.cases[0]!.prepared).toBe(false);
    expect(state.cases[0]!.approvals.dispatcher).toBe(false);
    expect(state.cases[0]!.approvalLog.at(-1)).toMatchObject({
      role: "dispatcher",
      approved: false,
    });
    expect(attempt(dispatcher, { kind: "ROUTE_COMMIT", caseId })).toBe(
      "Routing not approved",
    );
  });
  it("validates archivist pin slots, replacement, removal and stamps on the host", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    let state = createSimulation(config, "archive", hash);
    let serial = 0;
    const attempt = (playerId: PlayerId, command: SimCommand) => {
      const result = reduceInput(
        state,
        {
          type: "command",
          playerId,
          actionId: `archive-${++serial}` as ActionId,
          command,
        },
        packages,
      );
      if (!result.rejected) state = result.state;
      return result.rejected;
    };
    for (const playerId of [agent, archivist, dispatcher])
      expect(attempt(playerId, { kind: "READY", ready: true })).toBeUndefined();
    expect(attempt(agent, { kind: "START" })).toBeUndefined();
    const caseId = state.cases[0]!.id;
    expect(attempt(agent, { kind: "ACCEPT_CASE", caseId })).toBeUndefined();
    expect(
      attempt(agent, {
        kind: "ARCHIVE_PIN",
        caseId,
        recordId: "core.archetype.clerk-copy",
      }),
    ).toBe("Invalid archive record");
    expect(
      attempt(archivist, {
        kind: "ARCHIVE_PIN",
        caseId,
        recordId: "core.archetype.clerk-copy",
      }),
    ).toBeUndefined();
    expect(
      attempt(archivist, {
        kind: "ARCHIVE_PIN",
        caseId,
        recordId: "core.archetype.clerk-retired",
      }),
    ).toBeUndefined();
    expect(
      attempt(archivist, {
        kind: "ARCHIVE_PIN",
        caseId,
        recordId: "core.archetype.clerk",
      }),
    ).toBe("Pin slots full");
    expect(
      attempt(archivist, {
        kind: "ARCHIVE_PIN",
        caseId,
        recordId: "core.archetype.clerk",
        replaceIndex: 0,
      }),
    ).toBeUndefined();
    expect(state.cases[0]!.archivePins).toEqual([
      "core.archetype.clerk",
      "core.archetype.clerk-retired",
    ]);
    expect(
      attempt(archivist, { kind: "ARCHIVE_UNPIN", caseId, index: 1 }),
    ).toBeUndefined();
    expect(state.cases[0]!.archivePins).toEqual(["core.archetype.clerk"]);
    expect(
      attempt(archivist, { kind: "STAMP", caseId, stamp: "questionable" }),
    ).toBeUndefined();
    expect(projectView(state, "archivist", packages).role).toMatchObject({
      stamp: "questionable",
    });
    const agentView = JSON.stringify(projectView(state, "agent", packages));
    expect(agentView).not.toContain("archiveRecords");
    expect(agentView).not.toContain("ruleEntries");
  });
  it("lets interruption finish a conversation quickly while losing unrevealed hints", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    let state = createSimulation(config, "interrupt", hash);
    let serial = 0;
    const send = (playerId: PlayerId, command: SimCommand) => {
      const result = reduceInput(
        state,
        {
          type: "command",
          playerId,
          actionId: `interrupt-${++serial}` as ActionId,
          command,
        },
        packages,
      );
      expect(result.rejected).toBeUndefined();
      state = result.state;
    };
    for (const playerId of [agent, archivist, dispatcher])
      send(playerId, { kind: "READY", ready: true });
    send(agent, { kind: "START" });
    const caseId = state.cases[0]!.id;
    send(agent, { kind: "ACCEPT_CASE", caseId });
    send(agent, { kind: "INTERRUPT", caseId });
    expect(state.cases[0]!.dialogueOptions).toEqual([]);
    expect(state.cases[0]!.discoveredTags).toEqual(["core.tag.ink"]);
    expect(state.cases[0]!.callerMood).toBe(38);
  });
  it("keeps discovered hints private and makes publication, replacement, interruption and suggestion authoritative", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    let state = createSimulation(config, "agent controls", hash);
    let serial = 0;
    const send = (playerId: PlayerId, command: SimCommand) => {
      const result = reduceInput(
        state,
        {
          type: "command",
          playerId,
          actionId: `agent-action-${++serial}` as ActionId,
          command,
        },
        packages,
      );
      expect(result.rejected).toBeUndefined();
      state = result.state;
    };
    for (const playerId of [agent, archivist, dispatcher])
      send(playerId, { kind: "READY", ready: true });
    send(agent, { kind: "START" });
    const caseId = state.cases[0]!.id;
    send(agent, { kind: "ACCEPT_CASE", caseId });
    expect(projectView(state, "agent", packages).role).toMatchObject({
      discoveredTags: ["core.tag.ink"],
      dialogueOptions: ["ask", "form", "calm"],
    });
    expect(
      projectView(state, "archivist", packages).public.publishedTags,
    ).toEqual([]);
    send(agent, { kind: "PUBLISH_TAG", caseId, tagId: "core.tag.ink" });
    send(agent, { kind: "DIALOGUE", caseId, choiceId: "ask" });
    expect(state.cases[0]!.discoveredTags).toContain("core.tag.queue");
    expect(
      projectView(state, "archivist", packages).public.publishedTags,
    ).toEqual(["core.tag.ink"]);
    send(agent, {
      kind: "PUBLISH_TAG",
      caseId,
      tagId: "core.tag.queue",
      replaceIndex: 0,
    });
    expect(state.cases[0]!.publishedTags).toEqual(["core.tag.queue"]);
    send(agent, {
      kind: "SUGGEST_DESTINATION",
      caseId,
      destinationId: "core.destination.archive",
    });
    expect(
      projectView(state, "dispatcher", packages).public.suggestedDestination,
    ).toBe("core.destination.archive");
    expect(
      reduceInput(
        state,
        {
          type: "command",
          playerId: agent,
          actionId: "again" as ActionId,
          command: {
            kind: "SUGGEST_DESTINATION",
            caseId,
            destinationId: "core.destination.wrath",
          },
        },
        packages,
      ).rejected,
    ).toBe("Destination suggestion unavailable");
    send(dispatcher, {
      kind: "SELECT_DESTINATION",
      caseId,
      destinationId: "core.destination.archive",
    });
    send(agent, { kind: "APPROVE", caseId, approved: true });
    expect(projectView(state, "agent", packages).public.approvals.agent).toBe(
      true,
    );
    send(agent, { kind: "APPROVE", caseId, approved: false });
    expect(
      projectView(state, "dispatcher", packages).public.approvals.agent,
    ).toBe(false);
    state = advanceToTick(state, 31);
    const beforeMood = state.cases[0]!.callerMood;
    send(agent, { kind: "INTERRUPT", caseId });
    expect(state.cases[0]!.callerMood).toBe(beforeMood - 12);
    expect(state.cases[0]!.dialogueOptions).toEqual([]);
    expect(
      reduceInput(
        state,
        {
          type: "command",
          playerId: agent,
          actionId: "again-2" as ActionId,
          command: { kind: "INTERRUPT", caseId },
        },
        packages,
      ).rejected,
    ).toBe("Cooldown active");
  });
  it("normalizes displayed and Unicode seeds and serializes PRNG state", () => {
    expect(normalizeSeed("ä")).toBe(normalizeSeed("a\u0308"));
    const seed = normalizeSeed("a test seed");
    expect(normalizeSeed(seed.toUpperCase())).toBe(seed);
    const rng = new Random(seed);
    rng.int(17);
    const restored = new Random(rng.state);
    expect(restored.int(1_000_000)).toBe(rng.int(1_000_000));
    const vectorSeed = normalizeSeed("Batch 3");
    expect(vectorSeed).toBe("6f1d04c338533f36270b9f31c1aa8835");
    const vector = new Random(vectorSeed);
    expect([vector.int(1_000_000), vector.int(1_000_000)]).toEqual([
      480271, 455377,
    ]);
    expect(vector.state).toBe("298ab52436b02ada9661a0ae2a0d0677");
  });

  it("produces the same state regardless of tick batching", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    const initial = createSimulation(config, "tick batching", hash);
    expect(canonicalState(advanceToTick(initial, 100))).toBe(
      canonicalState(advanceToTick(advanceToTick(initial, 20), 100)),
    );
  });

  it("generates 10,000 solvable cases on the fixture layout", () => {
    const content = caseContent(packages, config.scenarioId);
    const rng = new Random(normalizeSeed("generator test"));
    for (let i = 0; i < 10_000; i++) {
      const item = generateCase(
        content,
        rng,
        i,
        20,
        content.scenario.startingRules,
      );
      expect(item.validDestinations.length).toBeGreaterThan(0);
      expect(item.validDestinations).toContain(item.preferredDestination);
      const layout = content.layouts.find(
        (entry) => entry.id === item.layoutId,
      )!;
      const destination = content.destinations.find(
        (entry) => entry.id === item.preferredDestination,
      )!;
      const exceptions = content.exceptions.filter((entry) =>
        item.exceptionIds.includes(entry.id),
      );
      expect(machineCanBeConfigured(destination, layout)).toBe(true);
      expect(
        evaluateDestination(destination, content.rules, exceptions, {
          tags: item.tags,
          stamps: [],
          pressure: 20,
          caseCount: i,
        }).valid,
      ).toBe(true);
    }
  });

  it("applies priority and exceptions with an explicit reason", () => {
    const content = caseContent(packages, config.scenarioId);
    const wrath = content.destinations.find(
      (item) => item.id === "core.destination.wrath",
    )!;
    const context = {
      tags: ["core.tag.ink"],
      stamps: ["verified"] as const,
      pressure: 20,
      caseCount: 0,
    };
    const denied = evaluateDestination(wrath, content.rules, [], context);
    expect(denied).toMatchObject({
      valid: false,
      reason: "forbidden",
      decisiveIds: ["core.rule.ink-red"],
    });
    const allowed = evaluateDestination(
      wrath,
      content.rules,
      content.exceptions,
      context,
    );
    expect(allowed).toMatchObject({
      valid: true,
      reason: "allowed",
      decisiveIds: ["core.exception.stamped"],
    });
  });

  it("replays a complete shift, pause, cooldown and ordered system events", async () => {
    const oneCase = structuredClone(core) as CampaignPackage;
    oneCase.scenarios[0]!.casePlan.count = 1;
    oneCase.scenarios[0]!.victory.count = 1;
    oneCase.scenarios[0]!.mutators = [];
    const packages = [oneCase];
    const registry = await loadContent(packages);
    let state = createSimulation(
      config,
      "fixture shift",
      registry.gameplayHash,
    );
    let entries: ReturnType<typeof recordInput>["entries"] = [];
    let serial = 0;
    const send = (playerId: PlayerId, command: SimCommand) => {
      const result = recordInput(
        state,
        entries,
        {
          type: "command",
          playerId,
          actionId: `action-${++serial}` as ActionId,
          command,
        },
        packages,
      );
      expect(result.transition.rejected).toBeUndefined();
      state = result.transition.state;
      entries = result.entries;
    };
    const system = (kind: "DISCONNECTED" | "RECONNECTED") => {
      const result = recordInput(
        state,
        entries,
        { type: "system", event: { kind, playerId: archivist } },
        packages,
      );
      expect(result.transition.rejected).toBeUndefined();
      state = result.transition.state;
      entries = result.entries;
    };
    send(agent, { kind: "READY", ready: true });
    send(archivist, { kind: "READY", ready: true });
    send(dispatcher, { kind: "READY", ready: true });
    send(agent, { kind: "START" });
    for (const role of ["agent", "archivist", "dispatcher"] as const) {
      const view = JSON.stringify(projectView(state, role));
      expect(view).not.toContain(state.seed);
      expect(view).not.toContain(state.rngState);
      expect(view).not.toContain('"trueDestination"');
    }
    const caseId = state.cases[0]!.id;
    send(agent, { kind: "ACCEPT_CASE", caseId });
    send(agent, { kind: "DIALOGUE", caseId, choiceId: "ask" });
    const rejected = recordInput(
      state,
      entries,
      {
        type: "command",
        playerId: agent,
        actionId: "too-fast" as ActionId,
        command: { kind: "DIALOGUE", caseId, choiceId: "ask" },
      },
      packages,
    );
    expect(rejected.transition.rejected).toBe("Cooldown active");
    expect(rejected.entries).toHaveLength(entries.length);
    send(agent, { kind: "PAUSE" });
    const frozen = state.shift.elapsedMs;
    state = advanceToTick(state, 50);
    expect(state.shift.elapsedMs).toBe(frozen);
    send(agent, { kind: "RESUME" });
    system("DISCONNECTED");
    state = advanceToTick(state, 100);
    expect(state.shift.elapsedMs).toBe(frozen);
    system("RECONNECTED");
    state = advanceToTick(state, 131);
    const destinationId = state.cases[0]!.trueDestination;
    send(dispatcher, {
      kind: "SELECT_DESTINATION",
      caseId,
      destinationId,
    });
    const incident = packages[0]!.packs[0]!.incidents.find(
      (item) => item.id === state.cases[0]!.incidentId,
    );
    if (incident) {
      send(dispatcher, {
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: incident.recovery.control,
        value: incident.recovery.equals,
      });
      send(dispatcher, { kind: "RECOVER_INCIDENT", caseId });
    }
    const destination = packages[0]!.packs[0]!.destinations.find(
      (item) => item.id === destinationId,
    )!;
    for (const requirement of destination.machineRequirements)
      send(dispatcher, {
        kind: "MACHINE_CONTROL",
        caseId,
        controlId: requirement.control,
        value: requirement.equals,
      });
    send(dispatcher, { kind: "PREPARE", caseId });
    send(agent, { kind: "APPROVE", caseId, approved: true });
    send(archivist, { kind: "APPROVE", caseId, approved: true });
    send(dispatcher, { kind: "APPROVE", caseId, approved: true });
    send(dispatcher, { kind: "ROUTE_COMMIT", caseId });
    expect(state.phase).toBe("results");
    expect(state.score.resolvedCorrectly).toBe(1);
    expect(
      recordInput(
        state,
        entries,
        {
          type: "command",
          playerId: dispatcher,
          actionId: "duplicate-commit" as ActionId,
          command: { kind: "ROUTE_COMMIT", caseId },
        },
        packages,
      ).transition.rejected,
    ).toBe("Shift is not active");
    expect(
      canonicalState(
        replaySimulation(
          createReplay(config, state, entries),
          packages,
          registry.gameplayHash,
        ),
      ),
    ).toBe(canonicalState(state));
  });

  it("rejects wrong role, stale case, duplicate commit and reused action ID", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    let state: SimulationState = createSimulation(config, "reject", hash);
    let serial = 0;
    const apply = (playerId: PlayerId, command: SimCommand) => {
      const result = recordInput(
        state,
        [],
        {
          type: "command",
          playerId,
          actionId: `id-${++serial}` as ActionId,
          command,
        },
        packages,
      ).transition;
      if (!result.rejected) state = result.state;
      return result.rejected;
    };
    for (const player of config.players)
      apply(player.id, { kind: "READY", ready: true });
    apply(agent, { kind: "START" });
    const caseId = state.cases[0]!.id;
    expect(apply(archivist, { kind: "ACCEPT_CASE", caseId })).toBe(
      "Case cannot be accepted",
    );
    expect(
      apply(agent, { kind: "ACCEPT_CASE", caseId: "old-case" as CaseId }),
    ).toBe("Case cannot be accepted");
    apply(agent, { kind: "ACCEPT_CASE", caseId });
    expect(
      apply(dispatcher, { kind: "DIALOGUE", caseId, choiceId: "ask" }),
    ).toBe("Wrong role");
    const id = "same-id" as ActionId;
    const first = recordInput(
      state,
      [],
      {
        type: "command",
        playerId: agent,
        actionId: id,
        command: { kind: "PUBLISH_TAG", caseId, tagId: "core.tag.ink" },
      },
      packages,
    ).transition;
    state = first.state;
    expect(
      recordInput(
        state,
        [],
        {
          type: "command",
          playerId: agent,
          actionId: id,
          command: { kind: "PUBLISH_TAG", caseId, tagId: "core.tag.ink" },
        },
        packages,
      ).transition.rejected,
    ).toBe("Duplicate action ID");
    expect(apply(dispatcher, { kind: "ROUTE_COMMIT", caseId })).toBe(
      "Routing not approved",
    );
  });

  it("simulates an eight-case shift headlessly", async () => {
    const campaign = structuredClone(core) as CampaignPackage;
    campaign.scenarios[0]!.casePlan.count = 8;
    campaign.scenarios[0]!.victory.count = 8;
    const shiftPackages = [campaign];
    const hash = (await loadContent(shiftPackages)).gameplayHash;
    let state = createSimulation(
      { ...config, shiftTicks: 9_000 },
      "eight cases",
      hash,
    );
    let serial = 0;
    const send = (playerId: PlayerId, command: SimCommand) => {
      const transition = recordInput(
        state,
        [],
        {
          type: "command",
          playerId,
          actionId: `shift-${++serial}` as ActionId,
          command,
        },
        shiftPackages,
      ).transition;
      expect(transition.rejected).toBeUndefined();
      state = transition.state;
    };
    for (const player of config.players)
      send(player.id, { kind: "READY", ready: true });
    send(agent, { kind: "START" });
    for (let i = 0; i < 8; i++) {
      const caseId = state.cases[i]!.id;
      state = advanceToTick(state, state.hostTick + 10);
      send(agent, { kind: "ACCEPT_CASE", caseId });
      expect(state.cases[i]!.generated.validDestinations).toContain(
        state.cases[i]!.trueDestination,
      );
      send(dispatcher, {
        kind: "SELECT_DESTINATION",
        caseId,
        destinationId: state.cases[i]!.trueDestination,
      });
      const incident = shiftPackages[0]!.packs[0]!.incidents.find(
        (item) => item.id === state.cases[i]!.incidentId,
      );
      if (incident) {
        send(dispatcher, {
          kind: "MACHINE_CONTROL",
          caseId,
          controlId: incident.recovery.control,
          value: incident.recovery.equals,
        });
        send(dispatcher, { kind: "RECOVER_INCIDENT", caseId });
      }
      const destination = shiftPackages[0]!.packs[0]!.destinations.find(
        (item) => item.id === state.cases[i]!.trueDestination,
      )!;
      for (const requirement of destination.machineRequirements)
        send(dispatcher, {
          kind: "MACHINE_CONTROL",
          caseId,
          controlId: requirement.control,
          value: requirement.equals,
        });
      send(dispatcher, { kind: "PREPARE", caseId });
      for (const player of config.players)
        send(player.id, { kind: "APPROVE", caseId, approved: true });
      send(dispatcher, { kind: "ROUTE_COMMIT", caseId });
      expect(state.cases[i]!.status).toBe("resolved");
      expect(state.activeRules).toHaveLength(
        1 + Math.min(3, Math.floor((i + 1) / 2)),
      );
    }
    expect(state.phase).toBe("results");
    expect(state.endReason).toBe("completed");
    expect(state.score.resolvedCorrectly).toBe(8);
    expect(state.escalationLevel).toBe(3);
  });

  it("ends by the fixed shift timer and records a disconnect expiry", async () => {
    const hash = (await loadContent(packages)).gameplayHash;
    const shortConfig = { ...config, shiftTicks: 2 };
    let state = createSimulation(shortConfig, "timeout", hash);
    let entries: ReturnType<typeof recordInput>["entries"] = [];
    let serial = 0;
    for (const player of shortConfig.players) {
      const result = recordInput(
        state,
        entries,
        {
          type: "command",
          playerId: player.id,
          actionId: `ready-${++serial}` as ActionId,
          command: { kind: "READY", ready: true },
        },
        packages,
      );
      state = result.transition.state;
      entries = result.entries;
    }
    const start = recordInput(
      state,
      entries,
      {
        type: "command",
        playerId: agent,
        actionId: "start" as ActionId,
        command: { kind: "START" },
      },
      packages,
    );
    state = start.transition.state;
    entries = start.entries;
    state = advanceToTick(state, 2);
    expect(state.endReason).toBe("time");
    expect(state.cases[0]!.status).toBe("aborted");
    expect(
      canonicalState(
        replaySimulation(
          createReplay(shortConfig, state, entries),
          packages,
          hash,
        ),
      ),
    ).toBe(canonicalState(state));

    const connectedConfig = { ...config, shiftTicks: 100 };
    let connected = createSimulation(connectedConfig, "disconnect", hash);
    for (const player of connectedConfig.players)
      connected = recordInput(
        connected,
        [],
        {
          type: "command",
          playerId: player.id,
          actionId: `ready-${player.id}` as ActionId,
          command: { kind: "READY", ready: true },
        },
        packages,
      ).transition.state;
    connected = recordInput(
      connected,
      [],
      {
        type: "command",
        playerId: agent,
        actionId: "start" as ActionId,
        command: { kind: "START" },
      },
      packages,
    ).transition.state;
    connected = recordInput(
      connected,
      [],
      { type: "system", event: { kind: "DISCONNECTED", playerId: archivist } },
      packages,
    ).transition.state;
    connected = advanceToTick(connected, 200);
    expect(connected.phase).toBe("shift");
    connected = recordInput(
      connected,
      [],
      { type: "system", event: { kind: "DISCONNECT_EXPIRED" } },
      packages,
    ).transition.state;
    expect(connected.endReason).toBe("disconnect");
  });
});
