import { describe, expect, it } from "vitest";
import { ReactionScheduler } from "./reactionScheduler";

describe("reaction scheduling", () => {
  it("limits simultaneous groups and lets urgent incidents replace ambient gags", () => {
    const scheduler = new ReactionScheduler(2, 1000);
    expect(scheduler.allow("pressure", "gauge", 1, 0)).toBe(true);
    expect(scheduler.allow("eyes", "demons", 1, 0)).toBe(true);
    expect(scheduler.allow("plant", "plant", 1, 0)).toBe(false);
    expect(scheduler.allow("incident", "pipes", 3, 0)).toBe(true);
    expect(scheduler.allow("incident", "pipes", 3, 500)).toBe(false);
    expect(scheduler.allow("incident", "pipes", 3, 1200)).toBe(true);
  });
});
