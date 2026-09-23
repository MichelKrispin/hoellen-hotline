import { z } from "zod";

export const PROTOCOL_VERSION = 1;
export const MAX_ENCODED = 32_768;
export const MAX_DECODED = 131_072;
const hex128 = z.string().regex(/^[0-9a-f]{32}$/);
const description = z.object({
  type: z.enum(["offer", "answer"]),
  sdp: z.string().min(1).max(100_000),
});
export const signalSchema = z.discriminatedUnion("kind", [
  z.object({
    v: z.literal(1),
    kind: z.literal("offer"),
    sessionId: hex128,
    slot: z.union([z.literal(1), z.literal(2)]),
    nonce: hex128,
    description: description.refine((d) => d.type === "offer"),
  }),
  z.object({
    v: z.literal(1),
    kind: z.literal("answer"),
    sessionId: hex128,
    slot: z.union([z.literal(1), z.literal(2)]),
    nonce: hex128,
    connectionId: hex128,
    description: description.refine((d) => d.type === "answer"),
  }),
]);
export type Signal = z.infer<typeof signalSchema>;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function unbase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Ungültige Linkdaten.");
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function streamBytes(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Linkdaten sind zu groß.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
export async function encodeSignal(signal: Signal): Promise<string> {
  const valid = signalSchema.parse(signal);
  const raw = new TextEncoder().encode(JSON.stringify(valid));
  if (raw.length > MAX_DECODED) throw new Error("Linkdaten sind zu groß.");
  const compressed = await streamBytes(
    new Blob([new Uint8Array(raw)])
      .stream()
      .pipeThrough(new CompressionStream("deflate")),
    MAX_ENCODED,
  );
  const encoded = base64url(compressed);
  if (encoded.length > MAX_ENCODED) throw new Error("Linkdaten sind zu groß.");
  return encoded;
}
export async function decodeSignal(value: string): Promise<Signal> {
  if (value.length > MAX_ENCODED) throw new Error("Linkdaten sind zu groß.");
  try {
    const bytes = unbase64url(value);
    const raw = await streamBytes(
      new Blob([new Uint8Array(bytes)])
        .stream()
        .pipeThrough(new DecompressionStream("deflate")),
      MAX_DECODED,
    );
    return signalSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Linkdaten sind zu groß.")
      throw error;
    throw new Error(
      "Link ist beschädigt oder hat eine unbekannte Protokollversion.",
    );
  }
}
export function linkFor(
  kind: Signal["kind"],
  payload: string,
  location = window.location,
): string {
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  url.hash = `${kind}=${payload}`;
  return url.href;
}
export function fragmentFrom(input: string): {
  kind: "offer" | "answer";
  payload: string;
} {
  const hash = input.trim().startsWith("#")
    ? input.trim().slice(1)
    : new URL(input.trim()).hash.slice(1);
  const match = /^(offer|answer)=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!match)
    throw new Error(
      "Bitte einen vollständigen Offer- oder Answer-Link einfügen.",
    );
  return { kind: match[1] as "offer" | "answer", payload: match[2]! };
}
export function clearFragment(): void {
  history.replaceState(history.state, "", location.pathname + location.search);
}
