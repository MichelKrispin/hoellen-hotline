import { describe, expect, it } from "vitest";
import {
  decodeSignal,
  encodeSignal,
  fragmentFrom,
  MAX_ENCODED,
} from "./signalingLink";

const offer = {
  v: 1,
  kind: "offer",
  sessionId: "a".repeat(32),
  slot: 1,
  nonce: "b".repeat(32),
  description: { type: "offer", sdp: "v=0\r\n".repeat(500) },
} as const;
describe("signaling links", () => {
  it("round trips a compressed offer", async () => {
    const encoded = await encodeSignal(offer);
    expect(encoded.length).toBeLessThan(JSON.stringify(offer).length);
    expect(await decodeSignal(encoded)).toEqual(offer);
    expect(fragmentFrom(`https://example.com/repo/#offer=${encoded}`)).toEqual({
      kind: "offer",
      payload: encoded,
    });
  });
  it("rejects oversized or malformed data", async () => {
    await expect(decodeSignal("a".repeat(MAX_ENCODED + 1))).rejects.toThrow(
      "zu groß",
    );
    await expect(decodeSignal("invalid")).rejects.toThrow("beschädigt");
    expect(() => fragmentFrom("https://example.com/#other=abc")).toThrow();
  });
  it("rejects payloads expanding beyond the limit", async () => {
    const raw = new TextEncoder().encode("x".repeat(200_000));
    const compressed = await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer();
    const encoded = Buffer.from(compressed).toString("base64url");
    await expect(decodeSignal(encoded)).rejects.toThrow("zu groß");
  });
});
