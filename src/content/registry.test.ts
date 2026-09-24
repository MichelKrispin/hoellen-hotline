import { describe, expect, it } from "vitest";
import core from "./core/fixture.json";
import audit from "./campaigns/audit/fixture.json";
import { gameplayHash, isReplayCompatible, loadContent } from "./registry";
import { CONTENT_SCHEMA_VERSION, GAMEPLAY_HASH_VERSION } from "./schemas";

function copy<T>(value: T): T {
  return structuredClone(value);
}

describe("content registry", () => {
  it("loads a second campaign from JSON after its dependency", async () => {
    await expect(loadContent([audit, core])).rejects.toThrow(
      /must be loaded first/,
    );
    const registry = await loadContent([core, audit]);
    expect(registry.entities.has("campaign.audit.scenario.first")).toBe(true);
    expect(
      isReplayCompatible(
        {
          contentSchemaVersion: CONTENT_SCHEMA_VERSION,
          gameplayHashVersion: GAMEPLAY_HASH_VERSION,
          gameplayHash: registry.gameplayHash,
        },
        registry,
      ),
    ).toBe(true);
    expect(
      isReplayCompatible(
        {
          contentSchemaVersion: CONTENT_SCHEMA_VERSION,
          gameplayHashVersion: GAMEPLAY_HASH_VERSION,
          gameplayHash: "0".repeat(64),
        },
        registry,
      ),
    ).toBe(false);
  });

  it("rejects duplicate IDs, broken references, unreachable dialogue nodes and scripts", async () => {
    await expect(loadContent([core, core])).rejects.toThrow(
      /duplicate campaign/,
    );
    const broken = copy(core);
    broken.scenarios[0]!.machineLayouts[0] = "core.machine.missing";
    await expect(loadContent([broken])).rejects.toThrow(
      /missing machine reference/,
    );
    const unreachable = copy(core);
    unreachable.packs[0]!.dialogues[0]!.nodes.push({
      id: "lost",
      textKey: "text.core.hello",
      choices: [],
    });
    await expect(loadContent([unreachable])).rejects.toThrow(
      /unreachable dialogue nodes/,
    );
    const script = copy(core) as unknown as Record<string, unknown>;
    script["run"] = () => 1;
    await expect(loadContent([script])).rejects.toThrow(/Unrecognized key/);
  });

  it("rejects an unsolvable sample and invalid goal count", async () => {
    const impossible = copy(core);
    impossible.scenarios[0]!.allowedContent.destinations = [
      "core.destination.wrath",
    ];
    await expect(loadContent([impossible])).rejects.toThrow(
      /unsolvable sample/,
    );
    const invalidGoal = copy(core);
    invalidGoal.scenarios[0]!.victory.count = 2;
    await expect(loadContent([invalidGoal])).rejects.toThrow(
      /victory count exceeds case plan/,
    );
  });

  it("hashes gameplay canonically and ignores cosmetic changes", async () => {
    const registered = await loadContent([core, audit]);
    const baseline = registered.gameplayHash;
    expect(baseline).toBe(
      "b6c10e2c6d0b180587223697a7728f77059ef614c6cb4b78c06df8d03e7f6098",
    );
    const cosmetic = copy(core);
    cosmetic.translations["text.core.title"] = "Other title";
    cosmetic.assets.reverse();
    cosmetic.packs[0]!.reactions.reverse();
    cosmetic.packs[0]!.tags.reverse();
    expect((await loadContent([cosmetic, audit])).gameplayHash).toBe(baseline);
    const gameplay = copy(core);
    gameplay.packs[0]!.rules[0]!.priority = 11;
    expect((await loadContent([gameplay, audit])).gameplayHash).not.toBe(
      baseline,
    );
    const dialogue = copy(core);
    Object.assign(dialogue.packs[0]!.dialogues[0]!.nodes[0]!.choices[0]!, {
      moodDelta: 1,
    });
    expect((await loadContent([dialogue, audit])).gameplayHash).not.toBe(
      baseline,
    );
    expect(await gameplayHash([...registered.packages].reverse())).toBe(
      baseline,
    );
  });
});
