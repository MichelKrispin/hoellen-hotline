import { describe, expect, it } from "vitest";
import core from "../../content/core/fixture.json";
import type { CampaignPackage } from "../../content/schemas";
import {
  addGuestCompletion,
  completeScenario,
  emptyProgress,
  exportProgress,
  importProgress,
  isScenarioUnlocked,
  nextScenario,
} from "./progress";

const campaign = core as CampaignPackage;

describe("campaign progress", () => {
  it("exports an idempotent host completion for another device", () => {
    const first = completeScenario(
      emptyProgress(),
      "campaign.core",
      "core.scenario.first",
    );
    const restored = importProgress(exportProgress(first));
    expect(
      completeScenario(restored, "campaign.core", "core.scenario.first"),
    ).toEqual(first);
  });

  it("rejects malformed and oversized imports", () => {
    expect(() => importProgress('{"version":2,"completed":{}}')).toThrow();
    expect(() => importProgress("x".repeat(64_001))).toThrow(/zu groß/);
  });

  it("unlocks the next scenario in chapter order without unlocking guests", () => {
    const first = campaign.scenarios[0]!.id;
    const second = campaign.scenarios[1]!.id;
    const empty = emptyProgress();
    expect(nextScenario(empty, campaign)).toBe(first);
    expect(isScenarioUnlocked(empty, campaign, second)).toBe(false);
    const guest = addGuestCompletion(empty, {
      sessionId: "a".repeat(32),
      campaignId: campaign.manifest.id,
      scenarioId: first,
      result: "completed",
    });
    expect(isScenarioUnlocked(guest, campaign, second)).toBe(false);
    const host = completeScenario(guest, campaign.manifest.id, first);
    expect(isScenarioUnlocked(host, campaign, second)).toBe(true);
    expect(nextScenario(host, campaign)).toBe(second);
    expect(addGuestCompletion(host, guest.guestHistory[0]!)).toEqual(host);
  });
});
