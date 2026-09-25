import type { CampaignPackage, Scenario } from "../../content/schemas";
import { Random } from "../core/random";
import {
  evaluateDestination,
  machineCanBeConfigured,
  type Destination,
  type Exception,
  type Layout,
  type Rule,
  type RuleContext,
} from "../rules/evaluate";

export interface GeneratedCase {
  archetypeId: string;
  complaintId: string;
  tags: string[];
  exceptionIds: string[];
  layoutId: string;
  validDestinations: string[];
  preferredDestination: string;
  dialogueId: string;
}

export interface CaseContent {
  scenario: Scenario;
  archetypes: CampaignPackage["packs"][number]["archetypes"];
  destinations: Destination[];
  rules: Rule[];
  exceptions: Exception[];
  layouts: Layout[];
}

export function caseContent(
  packages: readonly CampaignPackage[],
  scenarioId: string,
): CaseContent {
  const scenario = packages
    .flatMap((pkg) => pkg.scenarios)
    .find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Unknown scenario ${scenarioId}`);
  const packs = packages.flatMap((pkg) => pkg.packs);
  const allowed = scenario.allowedContent;
  return {
    scenario,
    archetypes: packs
      .flatMap((pack) => pack.archetypes)
      .filter((item) => allowed.archetypes.includes(item.id)),
    destinations: packs
      .flatMap((pack) => pack.destinations)
      .filter((item) => allowed.destinations.includes(item.id)),
    rules: packs.flatMap((pack) => pack.rules),
    exceptions: packs.flatMap((pack) => pack.exceptions),
    layouts: packs
      .flatMap((pack) => pack.machineLayouts)
      .filter((item) => scenario.machineLayouts.includes(item.id)),
  };
}

export function validDestinations(
  content: CaseContent,
  context: RuleContext,
  exceptions: readonly Exception[],
  layout: Layout,
  activeRuleIds: readonly string[],
): string[] {
  return content.destinations
    .filter(
      (destination) =>
        machineCanBeConfigured(destination, layout) &&
        evaluateDestination(
          destination,
          content.rules.filter((rule) => activeRuleIds.includes(rule.id)),
          exceptions,
          context,
        ).valid,
    )
    .map((destination) => destination.id);
}

export function generateCase(
  content: CaseContent,
  rng: Random,
  caseCount: number,
  pressure: number,
  activeRuleIds: readonly string[],
): GeneratedCase {
  const layouts = [...content.layouts].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const archetypes = [...content.archetypes].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  if (layouts.length === 0 || archetypes.length === 0)
    throw new Error("Scenario has no layouts or archetypes");
  const layout = layouts[rng.int(layouts.length)]!;
  for (let attempt = 0; attempt < 128; attempt++) {
    const archetype = archetypes[rng.int(archetypes.length)]!;
    const possibleTags = archetype.possibleTags.filter((tag) =>
      content.scenario.allowedContent.tags.includes(tag),
    );
    const possibleComplaints = archetype.possibleComplaints.filter((id) =>
      content.scenario.allowedContent.complaints.includes(id),
    );
    if (possibleTags.length < 2 || possibleComplaints.length === 0) continue;
    const tags = [...possibleTags].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (let i = tags.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [tags[i], tags[j]] = [tags[j]!, tags[i]!];
    }
    const chosenTags = tags.slice(
      0,
      Math.min(tags.length, 2 + rng.int(Math.min(3, tags.length - 1))),
    );
    const complaintId = [...possibleComplaints].sort()[
      rng.int(possibleComplaints.length)
    ]!;
    const possibleExceptions = [...content.exceptions].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );
    for (let i = possibleExceptions.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [possibleExceptions[i], possibleExceptions[j]] = [
        possibleExceptions[j]!,
        possibleExceptions[i]!,
      ];
    }
    const exceptionIds = possibleExceptions
      .slice(0, rng.int(Math.min(2, possibleExceptions.length) + 1))
      .map((item) => item.id);
    const context = {
      tags: chosenTags,
      stamps: [] as RuleContext["stamps"],
      pressure,
      caseCount,
    };
    const valid = validDestinations(
      content,
      context,
      possibleExceptions.filter((item) => exceptionIds.includes(item.id)),
      layout,
      activeRuleIds,
    );
    if (valid.length) {
      const preferredDestination = valid[rng.int(valid.length)]!;
      return {
        archetypeId: archetype.id,
        complaintId,
        tags: chosenTags,
        exceptionIds,
        layoutId: layout.id,
        validDestinations: valid,
        preferredDestination,
        dialogueId: archetype.dialogue,
      };
    }
  }
  // Validated scenario samples are the bounded generator's deterministic fallback.
  const samples = content.scenario.casePlan.samples.filter((sample) => {
    const archetype = archetypes.find((item) => item.id === sample.archetype);
    return (
      archetype &&
      sample.tags.every((tag) => archetype.possibleTags.includes(tag)) &&
      archetype.possibleComplaints.includes(sample.complaint)
    );
  });
  for (const fallbackLayout of [
    layout,
    ...layouts.filter((item) => item.id !== layout.id),
  ]) {
    for (const sample of samples) {
      const exceptions = content.exceptions.filter((item) =>
        sample.exceptions.includes(item.id),
      );
      const valid = validDestinations(
        content,
        { tags: sample.tags, stamps: [], pressure, caseCount },
        exceptions,
        fallbackLayout,
        activeRuleIds,
      );
      if (valid.length) {
        const archetype = archetypes.find(
          (item) => item.id === sample.archetype,
        )!;
        return {
          archetypeId: archetype.id,
          complaintId: sample.complaint,
          tags: [...sample.tags],
          exceptionIds: [...sample.exceptions],
          layoutId: fallbackLayout.id,
          validDestinations: valid,
          preferredDestination: valid[rng.int(valid.length)]!,
          dialogueId: archetype.dialogue,
        };
      }
    }
  }
  throw new Error(`No solvable case for ${content.scenario.id}`);
}
