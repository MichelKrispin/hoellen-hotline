import { describe, expect, it } from "vitest";
import core from "../../content/core/fixture.json";
import audit from "../../content/campaigns/audit/fixture.json";
import { loadContent } from "../../content/registry";
import type { CampaignPackage } from "../../content/schemas";
import type { ActionId, PlayerId, SessionId } from "../core/ids";
import {
  canonicalState,
  createSimulation,
  reduceInput,
} from "../state/simulation";
import { materializeMode, modeContentHash, planMode } from "./config";

const packages = [core, audit] as CampaignPackage[];

describe("game mode plans", () => {
  it("keeps campaign content and records progress only for campaign shifts", async () => {
    const plan = planMode(
      {
        kind: "campaign",
        campaignId: "campaign.core",
        scenarioId: "core.scenario.first",
      },
      packages,
    );
    expect(plan.recordsProgress).toBe(true);
    expect(plan.caseCount).toBe(8);
    expect(materializeMode(plan)).toEqual([core]);
    await expect(loadContent(materializeMode(plan))).resolves.toBeDefined();
  });

  it("creates a one-case tutorial without regular incidents or mutators", async () => {
    const plan = planMode(
      { kind: "tutorial", scenarioId: "core.scenario.first" },
      packages,
    );
    const content = materializeMode(plan);
    const scenario = content[0]!.scenarios[0]!;
    expect(scenario.casePlan.count).toBe(1);
    expect(scenario.victory.count).toBe(1);
    expect(scenario.mutators).toEqual([]);
    expect(scenario.allowedContent.incidents).toEqual([]);
    expect(plan.recordsProgress).toBe(false);
    await expect(loadContent(content)).resolves.toBeDefined();
  });

  it("materializes each free play length and rejects unknown selections", async () => {
    for (const [preset, count] of [
      ["relaxed", 8],
      ["standard", 10],
      ["infernal", 12],
    ] as const) {
      const plan = planMode(
        {
          kind: "freePlay",
          scenarioId: "core.scenario.first",
          preset,
          campaignIds: ["campaign.core"],
        },
        packages,
      );
      const content = materializeMode(plan);
      expect(content[0]!.scenarios[0]!.casePlan.count).toBe(count);
      expect(content[0]!.scenarios[0]!.victory.count).toBe(count);
      await expect(loadContent(content)).resolves.toBeDefined();
    }
    expect(() =>
      planMode(
        {
          kind: "freePlay",
          scenarioId: "core.scenario.first",
          preset: "standard",
          campaignIds: ["missing"],
        },
        packages,
      ),
    ).toThrow(/Kampagnenpaket fehlt/);
  });

  it("uses the chosen pools, layout policy and difficulty in a validated free shift", async () => {
    const mode = {
      kind: "freePlay" as const,
      scenarioId: "core.scenario.first",
      preset: "infernal" as const,
      caseCount: 12,
      difficulty: "infernal" as const,
      incidentDensity: "high" as const,
      campaignIds: ["campaign.core", "campaign.audit"],
      destinationIds: ["core.destination.archive", "core.destination.wrath"],
      ruleIds: ["core.rule.ink-red"],
      mutatorRuleIds: ["core.rule.audit-dust"],
      layoutPolicy: "random" as const,
      layoutIds: ["core.machine.switchboard", "core.machine.backup"],
      seed: "same-seed",
    };
    const plan = planMode(mode, packages);
    const content = materializeMode(plan);
    const scenario = content[0]!.scenarios[0]!;
    expect(plan.difficulty).toBe("infernal");
    expect(plan.incidentDensity).toBe("high");
    expect(scenario.allowedContent.destinations).toEqual(mode.destinationIds);
    expect(scenario.machineLayouts).toEqual(mode.layoutIds);
    expect(scenario.mutators.map((item) => item.rule)).toEqual(
      mode.mutatorRuleIds,
    );
    await expect(loadContent(content)).resolves.toBeDefined();
    expect(await modeContentHash(mode)).toBe(
      (await loadContent(content)).gameplayHash,
    );
    const registry = await loadContent(content);
    const start = () => {
      const players = (["agent", "archivist", "dispatcher"] as const).map(
        (role) => ({ id: role as PlayerId, role }),
      );
      let state = createSimulation(
        {
          sessionId: "0123456789abcdef0123456789abcdef" as SessionId,
          hostPlayerId: players[0]!.id,
          scenarioId: mode.scenarioId,
          players,
          difficulty: plan.difficulty,
          incidentDensity: plan.incidentDensity,
          shiftTicks: 7_200,
        },
        mode.seed!,
        registry.gameplayHash,
      );
      for (const player of players)
        state = reduceInput(
          state,
          {
            type: "command",
            playerId: player.id,
            actionId: `ready-${player.id}` as ActionId,
            command: { kind: "READY", ready: true },
          },
          registry.packages,
        ).state;
      return reduceInput(
        state,
        {
          type: "command",
          playerId: players[0]!.id,
          actionId: "start" as ActionId,
          command: { kind: "START" },
        },
        registry.packages,
      ).state;
    };
    expect(canonicalState(start())).toBe(canonicalState(start()));
    expect(start().cases).toHaveLength(4);
  });
});
