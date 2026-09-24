import { z } from "zod";

export const CONTENT_SCHEMA_VERSION = 1 as const;
export const CORE_CONTENT_VERSION = "1.0.0";
export const GAMEPLAY_HASH_VERSION = 1 as const;

const id = z.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*){1,}$/);
const textKey = z.string().regex(/^text\.[a-z][a-z0-9.-]+$/);
const assetId = z.string().regex(/^asset\.[a-z][a-z0-9.-]+$/);
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const stamp = z.enum(["verified", "questionable", "reject"]);
const base = z.object({ schemaVersion: z.literal(CONTENT_SCHEMA_VERSION), id });

export type Predicate =
  | { op: "all" | "any"; predicates: Predicate[] }
  | { op: "not"; predicate: Predicate }
  | { op: "hasTag"; id: string }
  | { op: "hasStamp"; id: "verified" | "questionable" | "reject" }
  | { op: "destinationIs"; id: string }
  | { op: "pressureBelow" | "caseCountAtLeast"; value: number };

export const PredicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z
      .object({
        op: z.literal("all"),
        predicates: z.array(PredicateSchema).min(1),
      })
      .strict(),
    z
      .object({
        op: z.literal("any"),
        predicates: z.array(PredicateSchema).min(1),
      })
      .strict(),
    z.object({ op: z.literal("not"), predicate: PredicateSchema }).strict(),
    z.object({ op: z.literal("hasTag"), id }).strict(),
    z.object({ op: z.literal("hasStamp"), id: stamp }).strict(),
    z.object({ op: z.literal("destinationIs"), id }).strict(),
    z
      .object({
        op: z.literal("pressureBelow"),
        value: z.number().int().min(1).max(100),
      })
      .strict(),
    z
      .object({
        op: z.literal("caseCountAtLeast"),
        value: z.number().int().min(0),
      })
      .strict(),
  ]),
);

const referenceList = z.array(id).min(1);
const optionalPredicate = PredicateSchema.optional();

export const CampaignManifestSchema = base
  .extend({
    version,
    titleKey: textKey,
    descriptionKey: textKey,
    requiredCoreVersion: version,
    dependencies: z.array(z.object({ id, version }).strict()),
    chapters: referenceList,
    contentPacks: referenceList,
    assetPack: assetId,
  })
  .strict();

export const ChapterSchema = base
  .extend({
    titleKey: textKey,
    scenarios: referenceList,
    unlock: optionalPredicate,
  })
  .strict();

export const SampleCaseSchema = z
  .object({
    archetype: id,
    tags: z.array(id).min(2).max(4),
    complaint: id,
    exceptions: z.array(id).max(2),
    stamps: z.array(stamp),
    pressure: z.number().int().min(0).max(100),
    caseCount: z.number().int().min(0),
  })
  .strict();

export const ScenarioSchema = base
  .extend({
    mode: z.literal("campaign"),
    titleKey: textKey,
    allowedContent: z
      .object({
        archetypes: referenceList,
        complaints: referenceList,
        tags: referenceList,
        destinations: referenceList,
        incidents: z.array(id),
      })
      .strict(),
    casePlan: z
      .object({
        count: z.number().int().min(1).max(100),
        samples: z.array(SampleCaseSchema).min(1),
      })
      .strict(),
    machineLayouts: referenceList,
    startingRules: z.array(id),
    mutators: z.array(
      z.object({ afterCase: z.number().int().min(1), rule: id }).strict(),
    ),
    victory: z
      .object({
        kind: z.literal("resolveCases"),
        count: z.number().int().min(1),
      })
      .strict(),
    intro: textKey.optional(),
    outro: textKey.optional(),
  })
  .strict();

export const CaseArchetypeSchema = base
  .extend({
    nameKey: textKey,
    dossierKey: textKey,
    aliasKeys: z.array(textKey).optional(),
    occupationKey: textKey.optional(),
    eventKeys: z.array(textKey).optional(),
    warningKeys: z.array(textKey).optional(),
    possibleTags: referenceList,
    possibleComplaints: referenceList,
    dialogue: id,
    portrait: assetId,
  })
  .strict();

export const ComplaintSchema = base
  .extend({ textKey, hintTag: id.optional() })
  .strict();
export const LifeTagSchema = base.extend({ textKey, symbol: assetId }).strict();

export const RuleClauseSchema = base
  .extend({
    textKey,
    priority: z.number().int(),
    destination: id,
    effect: z.enum(["allow", "forbid"]),
    when: PredicateSchema,
  })
  .strict();

export const ExceptionSchema = base
  .extend({
    textKey,
    overrides: id,
    priority: z.number().int(),
    destination: id,
    effect: z.enum(["allow", "forbid"]),
    when: PredicateSchema,
  })
  .strict();

const machineRequirement = z
  .object({
    control: id,
    equals: z.union([z.boolean(), z.number().int(), z.string()]),
  })
  .strict();
export const DestinationSchema = base
  .extend({
    nameKey: textKey,
    descriptionKey: textKey,
    symbol: assetId,
    kind: z.enum(["standard", "special"]).optional(),
    glyph: z.string().min(1).max(3).optional(),
    eligibility: PredicateSchema,
    machineRequirements: z.array(machineRequirement),
    reactions: z.object({ correct: id, acceptable: id, wrong: id }).strict(),
  })
  .strict();

export const MachineLayoutSchema = base
  .extend({
    nameKey: textKey,
    controls: z
      .array(
        z
          .object({
            id,
            kind: z.enum(["toggle", "dial", "selector"]),
            values: z
              .array(z.union([z.boolean(), z.number().int(), z.string()]))
              .min(2),
            labelKey: textKey,
          })
          .strict(),
      )
      .min(3)
      .max(6),
    availableDestinations: referenceList,
    bodyAsset: assetId,
  })
  .strict();

export const IncidentSchema = base
  .extend({
    textKey,
    diagnosisKey: textKey,
    layout: id,
    recovery: machineRequirement,
    reaction: id,
  })
  .strict();

export const DialogueTreeSchema = base
  .extend({
    start: z.string().regex(/^[a-z][a-z0-9-]*$/),
    nodes: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/),
            textKey,
            choices: z.array(
              z
                .object({
                  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
                  textKey,
                  next: z.string().regex(/^[a-z][a-z0-9-]*$/),
                  revealTag: id.optional(),
                  moodDelta: z.number().int().min(-100).max(100).optional(),
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const ReactionSchema = base
  .extend({
    event: z.enum(["correct", "acceptable", "wrong", "incident", "dialogue"]),
    asset: assetId,
    captionKey: textKey,
    reducedMotionAsset: assetId.optional(),
  })
  .strict();

export const ContentPackSchema = z
  .object({
    schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    id,
    archetypes: z.array(CaseArchetypeSchema),
    complaints: z.array(ComplaintSchema),
    tags: z.array(LifeTagSchema),
    rules: z.array(RuleClauseSchema),
    exceptions: z.array(ExceptionSchema),
    destinations: z.array(DestinationSchema),
    machineLayouts: z.array(MachineLayoutSchema),
    incidents: z.array(IncidentSchema),
    dialogues: z.array(DialogueTreeSchema),
    reactions: z.array(ReactionSchema),
  })
  .strict();

export const CampaignPackageSchema = z
  .object({
    schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    manifest: CampaignManifestSchema,
    chapters: z.array(ChapterSchema),
    scenarios: z.array(ScenarioSchema),
    packs: z.array(ContentPackSchema),
    translations: z.record(textKey, z.string()),
    assets: z.array(assetId),
  })
  .strict();

export type CampaignPackage = z.infer<typeof CampaignPackageSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type SampleCase = z.infer<typeof SampleCaseSchema>;
