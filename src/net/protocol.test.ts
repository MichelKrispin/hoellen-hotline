import { describe, expect, it } from "vitest";
import type { PlayerViewState } from "../game/state/contracts";
import type { CaseId } from "../game/core/ids";
import {
  applyPatch,
  decodeEnvelope,
  encodeEnvelope,
  MAX_ENVELOPE_BYTES,
  makePatch,
  packView,
  unpackView,
  viewHash,
} from "./protocol";

const view = (revision: number): PlayerViewState => ({
  public: {
    phase: "shift",
    revision,
    elapsedMs: revision * 100,
    queueLength: 1,
    queuePressure: 0,
    boilerPressure: 0,
    auditRisk: 0,
    activeCaseId: "case.1" as CaseId,
    publishedTags: [],
    archivePins: [],
    selectedDestination: null,
    colleagues: ["agent", "archivist", "dispatcher"].map((role) => ({
      role: role as "agent" | "archivist" | "dispatcher",
      connected: true,
      ready: true,
    })),
  },
  role: {
    role: "agent",
    callerName: "caller",
    callerMood: 50,
    dialogueOptions: ["a"],
  },
  presentation: [],
});

describe("network protocol", () => {
  it("checks envelope version, sequence shape and wire size", () => {
    const valid = {
      v: 1,
      sessionId: "a".repeat(32),
      connectionId: "b".repeat(32),
      seq: 1,
      payload: { type: "PING", at: 1 },
    } as const;
    expect(decodeEnvelope(encodeEnvelope(valid))).toEqual(valid);
    expect(() => decodeEnvelope(JSON.stringify({ ...valid, v: 2 }))).toThrow();
    expect(() => decodeEnvelope("x".repeat(MAX_ENVELOPE_BYTES + 1))).toThrow(
      "zu groß",
    );
  });
  it("hashes, compresses and validates role snapshots", async () => {
    const packed = await packView(view(1));
    expect(await unpackView(packed.data, packed.hash)).toEqual(view(1));
    await expect(unpackView(packed.data, "0".repeat(64))).rejects.toThrow(
      "Prüfsumme",
    );
  });
  it("applies ordered patches and ignores stale ones", async () => {
    const before = view(1);
    const after = view(3);
    const patch = {
      type: "STATE_PATCH",
      baseRevision: 1,
      revision: 3,
      changes: makePatch(before, after),
      hash: await viewHash(after),
    } as const;
    expect(await applyPatch(before, patch)).toEqual(after);
    expect(await applyPatch(after, patch)).toEqual(after);
    await expect(applyPatch(view(0), patch)).rejects.toThrow("Zustandslücke");
  });
  it("rejects a highly expanding snapshot", async () => {
    const raw = new TextEncoder().encode("x".repeat(300_000));
    const compressed = await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer();
    await expect(
      unpackView(Buffer.from(compressed).toString("base64url"), "0".repeat(64)),
    ).rejects.toThrow("zu groß");
  });
});
