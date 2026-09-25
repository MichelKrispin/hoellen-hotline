import { z } from "zod";
import type { CampaignPackage, Scenario } from "../../content/schemas";
import { loadContent } from "../../content/registry";
import { CAMPAIGN_CATALOG } from "../../content/catalog";

export const FREE_PLAY_PRESETS = {
  relaxed: {
    label: "Feierabendrunde",
    cases: 8,
    difficulty: "relaxed",
    incidentDensity: "low",
  },
  standard: {
    label: "Dienstplan",
    cases: 10,
    difficulty: "standard",
    incidentDensity: "normal",
  },
  infernal: {
    label: "Ewige Warteschleife",
    cases: 12,
    difficulty: "infernal",
    incidentDensity: "high",
  },
} as const;

export const GameModeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("campaign"),
    campaignId: z.string().min(1),
    scenarioId: z.string().min(1),
    seed: z.string().max(128).optional(),
  }),
  z.object({
    kind: z.literal("tutorial"),
    scenarioId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("freePlay"),
    scenarioId: z.string().min(1),
    preset: z.enum(["relaxed", "standard", "infernal"]),
    caseCount: z.number().int().min(8).max(12).optional(),
    difficulty: z.enum(["relaxed", "standard", "infernal"]).optional(),
    seed: z.string().max(128).optional(),
    campaignIds: z.array(z.string().min(1)).min(1),
    destinationIds: z.array(z.string().min(1)).min(1).optional(),
    ruleIds: z.array(z.string().min(1)).optional(),
    mutatorRuleIds: z.array(z.string().min(1)).optional(),
    layoutIds: z.array(z.string().min(1)).min(1).optional(),
    layoutPolicy: z.enum(["curated", "random"]).optional(),
    incidentDensity: z.enum(["none", "low", "normal", "high"]).optional(),
  }),
]);

export type GameMode = z.infer<typeof GameModeSchema>;
export const DEFAULT_GAME_MODE: GameMode = {
  kind: "campaign",
  campaignId: "campaign.core",
  scenarioId: "core.scenario.first",
};

export interface ModePlan {
  mode: GameMode;
  packages: CampaignPackage[];
  scenario: Scenario;
  caseCount: number;
  difficulty: "relaxed" | "standard" | "infernal";
  incidentDensity: "none" | "low" | "normal" | "high";
  recordsProgress: boolean;
}

export function materializeMode(plan: ModePlan): CampaignPackage[] {
  const packages = structuredClone(plan.packages);
  const scenario = packages
    .flatMap((pkg) => pkg.scenarios)
    .find((item) => item.id === plan.scenario.id)!;
  if (plan.mode.kind === "campaign") return packages;
  scenario.casePlan.count = plan.caseCount;
  scenario.victory.count = plan.caseCount;
  if (plan.mode.kind === "tutorial") {
    scenario.mutators = [];
    scenario.allowedContent.incidents = [];
    return packages;
  }
  const mode = plan.mode;
  const selectedScenarios = packages
    .filter((pkg) => mode.campaignIds.includes(pkg.manifest.id))
    .flatMap((pkg) => pkg.scenarios);
  for (const field of [
    "archetypes",
    "complaints",
    "tags",
    "destinations",
    "incidents",
  ] as const)
    scenario.allowedContent[field] = [
      ...new Set(
        selectedScenarios.flatMap((selected) => selected.allowedContent[field]),
      ),
    ];
  if (mode.layoutPolicy === "random")
    scenario.machineLayouts = [
      ...new Set(
        packages.flatMap((pkg) =>
          pkg.packs.flatMap((pack) =>
            pack.machineLayouts.map((layout) => layout.id),
          ),
        ),
      ),
    ];
  if (mode.layoutIds) {
    const available = scenario.machineLayouts;
    if (mode.layoutIds.some((id) => !available.includes(id)))
      throw new Error(
        "Ein gewähltes Maschinenlayout gehört nicht zum Szenario.",
      );
    scenario.machineLayouts = [...mode.layoutIds];
  }
  if (mode.destinationIds) {
    const allowed = scenario.allowedContent.destinations.filter((id) =>
      mode.destinationIds?.includes(id),
    );
    if (allowed.length !== mode.destinationIds.length)
      throw new Error("Ein gewähltes Ziel gehört nicht zum Szenario.");
    scenario.allowedContent.destinations = allowed;
  }
  if (mode.ruleIds) {
    const known = packages
      .flatMap((pkg) => pkg.packs)
      .flatMap((pack) => pack.rules)
      .map((rule) => rule.id);
    if (mode.ruleIds.some((id) => !known.includes(id)))
      throw new Error("Eine gewählte Regel gehört nicht zum Content.");
    scenario.startingRules = mode.ruleIds;
  }
  if (mode.mutatorRuleIds) {
    const available = scenario.mutators.map((item) => item.rule);
    if (mode.mutatorRuleIds.some((id) => !available.includes(id)))
      throw new Error("Ein gewählter Modifikator gehört nicht zum Szenario.");
    scenario.mutators = scenario.mutators.filter((item) =>
      mode.mutatorRuleIds?.includes(item.rule),
    );
  }
  if (plan.incidentDensity === "none") scenario.allowedContent.incidents = [];
  return packages;
}

export async function modeContentHash(mode: GameMode): Promise<string> {
  const plan = planMode(mode, CAMPAIGN_CATALOG);
  return (await loadContent(materializeMode(plan))).gameplayHash;
}

export function planMode(
  input: unknown,
  available: readonly CampaignPackage[],
): ModePlan {
  const mode = GameModeSchema.parse(input);
  const requestedCampaigns =
    mode.kind === "freePlay"
      ? mode.campaignIds
      : [mode.kind === "campaign" ? mode.campaignId : "campaign.core"];
  const selected = new Set(requestedCampaigns);
  for (const pkg of available)
    if (selected.has(pkg.manifest.id))
      for (const dependency of pkg.manifest.dependencies)
        selected.add(dependency.id);
  const packages = available.filter((pkg) => selected.has(pkg.manifest.id));
  if (packages.length !== selected.size)
    throw new Error("Ein ausgewähltes Kampagnenpaket fehlt.");
  const scenario = packages
    .flatMap((pkg) => pkg.scenarios)
    .find((item) => item.id === mode.scenarioId);
  if (!scenario) throw new Error("Das gewählte Szenario fehlt.");
  if (
    mode.kind === "campaign" &&
    !packages.some(
      (pkg) =>
        pkg.manifest.id === mode.campaignId &&
        pkg.scenarios.some((item) => item.id === mode.scenarioId),
    )
  )
    throw new Error("Szenario und Kampagne passen nicht zusammen.");
  const preset =
    mode.kind === "freePlay" ? FREE_PLAY_PRESETS[mode.preset] : null;
  return {
    mode,
    packages,
    scenario,
    caseCount:
      mode.kind === "tutorial"
        ? 1
        : mode.kind === "freePlay"
          ? (mode.caseCount ?? preset!.cases)
          : scenario.casePlan.count,
    difficulty:
      mode.kind === "freePlay"
        ? (mode.difficulty ?? preset!.difficulty)
        : "standard",
    incidentDensity:
      mode.kind === "freePlay"
        ? (mode.incidentDensity ?? preset!.incidentDensity)
        : "normal",
    recordsProgress: mode.kind === "campaign",
  };
}
