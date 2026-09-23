import { describe, expect, it } from "vitest";
import { projectView } from "./projectView";
import type { GameState } from "./contracts";
import type {
  CaseId,
  DestinationId,
  PlayerId,
  RuleId,
  SessionId,
} from "../core/ids";

const secret = "PRIVATE_ANSWER";
const state: GameState = {
  sessionId: "0123456789abcdef0123456789abcdef" as SessionId,
  phase: "shift",
  seed: "PRIVATE_SEED",
  rngState: "PRIVATE_RNG",
  hostTick: 42,
  stateRevision: 2,
  players: {
    ["player" as PlayerId]: { role: "agent", connected: true, ready: true },
  },
  shift: {
    elapsedMs: 1000,
    currentWave: 1,
    queuePressure: 1,
    boilerPressure: 2,
    auditRisk: 3,
  },
  cases: [
    {
      id: "case-1" as CaseId,
      status: "active",
      callerName: "Caller",
      dialogueOptions: ["Hello"],
      callerMood: 2,
      dossier: "PRIVATE_DOSSIER",
      ruleText: "PRIVATE_RULE",
      trueDestination: secret as DestinationId,
      publishedTags: ["public-tag"],
      archivePins: [],
      selectedDestination: null,
    },
  ],
  activeRules: ["PRIVATE_RULE_ID" as RuleId],
  machine: {
    controls: { lever: 1 },
    availableDestinations: ["possible" as DestinationId],
  },
  score: {
    resolvedCorrectly: 0,
    resolvedAcceptably: 0,
    resolvedIncorrectly: 0,
    catastrophicErrors: 0,
  },
  pause: null,
};

describe("role projection", () => {
  it.each(["agent", "archivist", "dispatcher"] as const)(
    "omits host secrets for %s",
    (role) => {
      const view = projectView(state, role);
      const serialized = JSON.stringify(view);
      expect(serialized).not.toContain(secret);
      expect(serialized).not.toContain("PRIVATE_SEED");
      expect(serialized).not.toContain("PRIVATE_RNG");
      expect(view.public.publishedTags).toEqual(["public-tag"]);
    },
  );

  it("keeps role-exclusive data out of other projections", () => {
    const agent = JSON.stringify(projectView(state, "agent"));
    const archivist = JSON.stringify(projectView(state, "archivist"));
    const dispatcher = JSON.stringify(projectView(state, "dispatcher"));
    expect(agent).not.toContain("PRIVATE_DOSSIER");
    expect(agent).not.toContain("PRIVATE_RULE");
    expect(agent).not.toContain('"lever"');
    expect(archivist).not.toContain('"dialogueOptions"');
    expect(archivist).not.toContain('"lever"');
    expect(dispatcher).not.toContain("PRIVATE_DOSSIER");
    expect(dispatcher).not.toContain("PRIVATE_RULE");
    expect(dispatcher).not.toContain('"dialogueOptions"');
  });
});
