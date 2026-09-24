import { z } from "zod";
import type { PlayerViewState } from "../game/state/contracts";

export const MAX_ENVELOPE_BYTES = 65_536;
export const MAX_INFLATED_BYTES = 262_144;
export const MAX_BUFFERED_BYTES = 262_144;
export const PROTOCOL_VERSION = 1 as const;
const hex128 = z.string().regex(/^[0-9a-f]{32}$/);
const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const revisionSchema = z.number().int().nonnegative();
const controlValue = z.union([z.string(), z.number(), z.boolean()]);
const role = z.enum(["agent", "archivist", "dispatcher"]);
const event = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("STAMP_APPLIED"),
      caseId: z.string(),
      stamp: z.string(),
    })
    .strict(),
  z.object({ kind: z.literal("CALLER_ANGERED"), caseId: z.string() }).strict(),
  z
    .object({
      kind: z.literal("ROUTE_FAILED"),
      caseId: z.string(),
      destinationId: z.string(),
    })
    .strict(),
]);
const publicView = z
  .object({
    phase: z.enum(["lobby", "shift", "results"]),
    revision: revisionSchema,
    elapsedMs: z.number().int().nonnegative(),
    pauseReason: z.enum(["host-menu", "disconnect"]).nullable(),
    queueLength: z.number().int().nonnegative(),
    queuePressure: z.number().int(),
    boilerPressure: z.number().int(),
    auditRisk: z.number().int(),
    activeCaseId: z.string().nullable(),
    publishedTags: z.array(z.string()),
    suggestedDestination: z.string().nullable(),
    archivePins: z.array(z.string()),
    selectedDestination: z.string().nullable(),
    approvals: z
      .object({
        agent: z.boolean(),
        archivist: z.boolean(),
        dispatcher: z.boolean(),
      })
      .strict(),
    approvalLog: z.array(
      z
        .object({
          role,
          approved: z.boolean(),
          tick: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    modifiers: z.array(
      z
        .object({
          ruleId: z.string(),
          text: z.string(),
          state: z.enum(["announced", "active"]),
        })
        .strict(),
    ),
    report: z
      .object({
        seed: z.string(),
        contentHash: z.string(),
        endReason: z.string(),
        elapsedMs: z.number().int().nonnegative(),
        averageCaseMs: z.number().int().nonnegative(),
        score: z
          .object({
            resolvedCorrectly: z.number().int().nonnegative(),
            resolvedAcceptably: z.number().int().nonnegative(),
            resolvedIncorrectly: z.number().int().nonnegative(),
            catastrophicErrors: z.number().int().nonnegative(),
          })
          .strict(),
        cases: z.array(
          z
            .object({
              id: z.string(),
              outcome: z
                .enum(["correct", "acceptable", "wrong", "catastrophic"])
                .nullable(),
              selectedDestination: z.string().nullable(),
              trueDestination: z.string(),
            })
            .strict(),
        ),
      })
      .strict()
      .nullable(),
    colleagues: z
      .array(
        z
          .object({
            role,
            activity: z.enum([
              "sucht",
              "spricht",
              "bereitet vor",
              "bereit",
              "getrennt",
            ]),
          })
          .strict(),
      )
      .length(3),
  })
  .strict();
const archiveRecord = z
  .object({
    id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
    occupation: z.string(),
    events: z.array(z.string()),
    warnings: z.array(z.string()),
    dossier: z.string(),
    tags: z.array(z.string()),
    complaints: z.array(z.string()),
  })
  .strict();
const ruleEntry = z
  .object({
    id: z.string(),
    kind: z.enum(["rule", "exception"]),
    text: z.string(),
    destination: z.string(),
    priority: z.number().int(),
    active: z.boolean(),
    overrides: z.string().nullable(),
  })
  .strict();
const roleView = z.discriminatedUnion("role", [
  z
    .object({
      role: z.literal("agent"),
      callerName: z.string().nullable(),
      callerMood: z.number().nullable(),
      dialogueOptions: z.array(z.string()),
      dialogueText: z.string().nullable(),
      dialogueLabels: z.record(z.string(), z.string()),
      incomingCaseId: z.string().nullable(),
      incomingCallerName: z.string().nullable(),
      discoveredTags: z.array(z.string()),
      tagLabels: z.record(z.string(), z.string()),
      cooldownMs: z.number().int().nonnegative(),
      suggestableDestinations: z.array(
        z.object({ id: z.string(), name: z.string() }).strict(),
      ),
    })
    .strict(),
  z
    .object({
      role: z.literal("archivist"),
      dossier: z.string().nullable(),
      ruleText: z.string().nullable(),
      activeRules: z.array(z.string()),
      archiveRecords: z.array(archiveRecord),
      ruleEntries: z.array(ruleEntry),
      tagLabels: z.record(z.string(), z.string()),
      stamp: z.enum(["verified", "questionable", "reject"]).nullable(),
    })
    .strict(),
  z
    .object({
      role: z.literal("dispatcher"),
      machine: z
        .object({
          controls: z.record(z.string(), controlValue),
          availableDestinations: z.array(z.string()),
        })
        .strict(),
      controls: z.array(
        z
          .object({
            id: z.string(),
            label: z.string(),
            kind: z.enum(["toggle", "dial", "selector"]),
            values: z.array(controlValue),
            value: controlValue,
          })
          .strict(),
      ),
      destinations: z.array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            kind: z.enum(["standard", "special"]),
            glyph: z.string(),
            requirements: z.array(
              z
                .object({
                  controlId: z.string(),
                  label: z.string(),
                  value: controlValue,
                })
                .strict(),
            ),
          })
          .strict(),
      ),
      incident: z
        .object({
          id: z.string(),
          name: z.string(),
          diagnosis: z.string(),
          recoveryControlId: z.string(),
          recoveryValue: controlValue,
        })
        .strict()
        .nullable(),
      prepared: z.boolean(),
      lastOutcome: z
        .object({
          caseId: z.string(),
          outcome: z.enum(["correct", "acceptable", "wrong", "catastrophic"]),
        })
        .strict()
        .nullable(),
    })
    .strict(),
]);
export const playerViewSchema = z
  .object({ public: publicView, role: roleView, presentation: z.array(event) })
  .strict();
export const commandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("READY"), ready: z.boolean() }),
  z.object({ kind: z.literal("START") }),
  z.object({ kind: z.literal("ACCEPT_CASE"), caseId: z.string() }),
  z.object({
    kind: z.literal("DIALOGUE"),
    caseId: z.string(),
    choiceId: z.string(),
  }),
  z.object({ kind: z.literal("INTERRUPT"), caseId: z.string() }),
  z.object({
    kind: z.literal("PUBLISH_TAG"),
    caseId: z.string(),
    tagId: z.string(),
    replaceIndex: z.number().int().min(0).max(2).optional(),
  }),
  z.object({
    kind: z.literal("SUGGEST_DESTINATION"),
    caseId: z.string(),
    destinationId: z.string(),
  }),
  z.object({
    kind: z.literal("ARCHIVE_PIN"),
    caseId: z.string(),
    recordId: z.string(),
    replaceIndex: z.number().int().min(0).max(1).optional(),
  }),
  z.object({
    kind: z.literal("ARCHIVE_UNPIN"),
    caseId: z.string(),
    index: z.number().int().min(0).max(1),
  }),
  z.object({
    kind: z.literal("STAMP"),
    caseId: z.string(),
    stamp: z.enum(["verified", "questionable", "reject"]),
  }),
  z.object({
    kind: z.literal("APPROVE"),
    caseId: z.string(),
    approved: z.boolean(),
  }),
  z.object({
    kind: z.literal("SELECT_DESTINATION"),
    caseId: z.string(),
    destinationId: z.string(),
  }),
  z.object({
    kind: z.literal("MACHINE_CONTROL"),
    caseId: z.string(),
    controlId: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({ kind: z.literal("RECOVER_INCIDENT"), caseId: z.string() }),
  z.object({ kind: z.literal("PREPARE"), caseId: z.string() }),
  z.object({ kind: z.literal("ROUTE_COMMIT"), caseId: z.string() }),
  z.object({ kind: z.literal("PAUSE") }),
  z.object({ kind: z.literal("RESUME") }),
  z.object({ kind: z.literal("ABANDON") }),
]);
export const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ACTION"),
    actionId: hex128,
    baseRevision: revisionSchema,
    command: commandSchema,
  }),
  z.object({
    type: z.literal("ACTION_REJECTED"),
    actionId: hex128,
    reason: z.string().max(200),
  }),
  z.object({
    type: z.literal("STATE_PATCH"),
    baseRevision: revisionSchema,
    revision: revisionSchema,
    changes: z
      .object({
        public: publicView.optional(),
        role: roleView.optional(),
        presentation: z.array(event).optional(),
      })
      .strict(),
    hash: hashSchema,
  }),
  z.object({
    type: z.literal("STATE_SNAPSHOT"),
    revision: revisionSchema,
    encoding: z.literal("deflate-base64url"),
    data: z.string().max(MAX_ENVELOPE_BYTES),
    hash: hashSchema,
  }),
  z.object({ type: z.literal("SNAPSHOT_REQUEST"), revision: revisionSchema }),
  z.object({ type: z.literal("PING"), at: z.number().finite() }),
  z.object({ type: z.literal("PONG"), at: z.number().finite() }),
  z.object({
    type: z.literal("PAUSE_STATE"),
    paused: z.boolean(),
    remainingMs: z.number().int().nonnegative().nullable(),
  }),
  z.object({
    type: z.literal("GAME_OVER"),
    reason: z.enum([
      "completed",
      "time",
      "pressure",
      "abandoned",
      "disconnect",
      "host-left",
    ]),
  }),
]);
export type Payload = z.infer<typeof payloadSchema>;
const envelopeSchema = z
  .object({
    v: z.literal(PROTOCOL_VERSION),
    sessionId: hex128,
    connectionId: hex128,
    seq: z.number().int().positive(),
    payload: payloadSchema,
  })
  .strict();
export type Envelope = z.infer<typeof envelopeSchema>;
const encoder = new TextEncoder();

export function encodeEnvelope(value: Envelope): string {
  const raw = JSON.stringify(envelopeSchema.parse(value));
  if (encoder.encode(raw).length > MAX_ENVELOPE_BYTES)
    throw new Error("Netzwerknachricht zu groß.");
  return raw;
}
export function decodeEnvelope(raw: string): Envelope {
  if (encoder.encode(raw).length > MAX_ENVELOPE_BYTES)
    throw new Error("Netzwerknachricht zu groß.");
  try {
    return envelopeSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("Ungültige Nachricht oder Protokollversion.");
  }
}
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Ungültiger Snapshot.");
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
async function readLimited(
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
      size += value.length;
      if (size > limit) throw new Error("Dekomprimierter Snapshot zu groß.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
export async function viewHash(view: PlayerViewState): Promise<string> {
  const bytes = encoder.encode(JSON.stringify(view));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function packView(
  view: PlayerViewState,
): Promise<{ data: string; hash: string }> {
  const checked = playerViewSchema.parse(view) as PlayerViewState;
  const raw = encoder.encode(JSON.stringify(checked));
  if (raw.length > MAX_INFLATED_BYTES) throw new Error("Snapshot zu groß.");
  const compressed = await readLimited(
    new Blob([new Uint8Array(raw)])
      .stream()
      .pipeThrough(new CompressionStream("deflate")),
    MAX_ENVELOPE_BYTES,
  );
  return { data: base64url(compressed), hash: await viewHash(checked) };
}
export async function unpackView(
  data: string,
  expectedHash: string,
): Promise<PlayerViewState> {
  if (data.length > MAX_ENVELOPE_BYTES) throw new Error("Snapshot zu groß.");
  const bytes = fromBase64url(data);
  const raw = await readLimited(
    new Blob([new Uint8Array(bytes)])
      .stream()
      .pipeThrough(new DecompressionStream("deflate")),
    MAX_INFLATED_BYTES,
  );
  const view = playerViewSchema.parse(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)),
  ) as PlayerViewState;
  if ((await viewHash(view)) !== expectedHash)
    throw new Error("Snapshot-Prüfsumme stimmt nicht.");
  return view;
}
export function makePatch(
  before: PlayerViewState,
  after: PlayerViewState,
): Extract<Payload, { type: "STATE_PATCH" }>["changes"] {
  return {
    ...(JSON.stringify(before.public) !== JSON.stringify(after.public)
      ? { public: after.public }
      : {}),
    ...(JSON.stringify(before.role) !== JSON.stringify(after.role)
      ? { role: after.role }
      : {}),
    ...(JSON.stringify(before.presentation) !==
    JSON.stringify(after.presentation)
      ? { presentation: after.presentation }
      : {}),
  };
}
export async function applyPatch(
  view: PlayerViewState,
  patch: Extract<Payload, { type: "STATE_PATCH" }>,
): Promise<PlayerViewState> {
  if (patch.revision <= view.public.revision) return view;
  if (
    patch.baseRevision !== view.public.revision ||
    patch.changes.public?.revision !== patch.revision
  )
    throw new Error("Zustandslücke.");
  const next = playerViewSchema.parse({
    ...view,
    ...patch.changes,
  }) as PlayerViewState;
  if ((await viewHash(next)) !== patch.hash)
    throw new Error("Patch-Prüfsumme stimmt nicht.");
  return next;
}
