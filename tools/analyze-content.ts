import core from "../src/content/core/fixture.json";
import audit from "../src/content/campaigns/audit/fixture.json";
import { loadContent } from "../src/content/registry";
import {
  caseContent,
  generateCase,
  validDestinations,
} from "../src/game/cases/generate";
import { Random, normalizeSeed } from "../src/game/core/random";
import { materializeMode, planMode } from "../src/game/modes/config";
import { createSimulation, reduceInput } from "../src/game/state/simulation";
import type { ActionId, PlayerId, SessionId } from "../src/game/core/ids";

function pairs<T>(values: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let a = 0; a < values.length; a++)
    for (let b = a + 1; b < values.length; b++)
      result.push([values[a]!, values[b]!]);
  return result;
}

const packages = [core, audit];
const registry = await loadContent(packages);
const deadEnds: string[] = [];
let combinations = 0;
for (const scenario of registry.packages[0]!.scenarios) {
  const content = caseContent(registry.packages, scenario.id);
  for (const archetype of content.archetypes) {
    const tags = archetype.possibleTags.filter((tag) =>
      scenario.allowedContent.tags.includes(tag),
    );
    for (const chosenTags of pairs(tags))
      for (
        let caseCount = 0;
        caseCount < scenario.casePlan.count;
        caseCount++
      ) {
        const activeRules = [
          ...scenario.startingRules,
          ...scenario.mutators
            .filter((item) => item.afterCase <= caseCount)
            .map((item) => item.rule),
        ];
        for (const layout of content.layouts) {
          combinations++;
          const valid = validDestinations(
            content,
            { tags: chosenTags, stamps: [], pressure: 20, caseCount },
            [],
            layout,
            activeRules,
          );
          if (valid.length === 0)
            deadEnds.push(
              `${scenario.id}/${archetype.id}/${chosenTags.join(",")}/${layout.id}/case${caseCount + 1}`,
            );
        }
      }
  }
}

const plan = planMode(
  {
    kind: "freePlay",
    scenarioId: "core.scenario.first",
    preset: "standard",
    campaignIds: ["campaign.core"],
    layoutPolicy: "random",
  },
  registry.packages,
);
const freeRegistry = await loadContent(materializeMode(plan));
const freePackages = freeRegistry.packages;
const freeContent = caseContent(freePackages, plan.scenario.id);
const archetypes = new Set<string>();
const complaints = new Set<string>();
const exceptions = new Set<string>();
const destinations = new Map<string, number>();
let specialChoices = 0;
const signatures = new Set<string>();
const fiveShifts: string[] = [];
const incidentIds = new Set<string>();
for (let shift = 0; shift < 100; shift++) {
  const rng = new Random(normalizeSeed(`balance-${shift}`));
  const caseSignatures: string[] = [];
  for (let caseCount = 0; caseCount < plan.caseCount; caseCount++) {
    const activeRules = [
      ...freeContent.scenario.startingRules,
      ...freeContent.scenario.mutators
        .filter((item) => item.afterCase <= caseCount)
        .map((item) => item.rule),
    ];
    const generated = generateCase(
      freeContent,
      rng,
      caseCount,
      20 + caseCount * 5,
      activeRules,
    );
    if (
      generated.validDestinations.some((id) =>
        ["audit", "return", "quarantine"].some((part) =>
          id.endsWith(`.${part}`),
        ),
      )
    )
      specialChoices++;
    archetypes.add(generated.archetypeId);
    complaints.add(generated.complaintId);
    for (const id of generated.exceptionIds) exceptions.add(id);
    destinations.set(
      generated.preferredDestination,
      (destinations.get(generated.preferredDestination) ?? 0) + 1,
    );
    const signature = [
      generated.archetypeId,
      generated.complaintId,
      ...generated.tags.toSorted(),
      generated.preferredDestination,
    ].join("/");
    signatures.add(signature);
    caseSignatures.push(signature);
  }
  if (shift < 5) fiveShifts.push(caseSignatures.join("|"));
  const players = (["agent", "archivist", "dispatcher"] as const).map(
    (role) => ({ id: role as PlayerId, role }),
  );
  let state = createSimulation(
    {
      sessionId: "0123456789abcdef0123456789abcdef" as SessionId,
      hostPlayerId: players[0]!.id,
      scenarioId: plan.scenario.id,
      players,
      incidentDensity: "high",
    },
    `balance-${shift}`,
    freeRegistry.gameplayHash,
  );
  for (const player of players)
    state = reduceInput(
      state,
      {
        type: "command",
        playerId: player.id,
        actionId: `ready-${player.id}` as ActionId,
        command: { kind: "READY", ready: true },
      },
      freePackages,
    ).state;
  state = reduceInput(
    state,
    {
      type: "command",
      playerId: players[0]!.id,
      actionId: "start" as ActionId,
      command: { kind: "START" },
    },
    freePackages,
  ).state;
  for (const item of state.cases)
    if (item.incidentId) incidentIds.add(item.incidentId);
}
console.log(
  JSON.stringify(
    {
      combinations,
      deadEnds: deadEnds.length,
      firstDeadEnds: deadEnds.slice(0, 12),
      sampled: 1000,
      archetypes: archetypes.size,
      complaints: complaints.size,
      exceptions: exceptions.size,
      destinations: Object.fromEntries(destinations),
      specialChoices,
      incidentTypes: incidentIds.size,
      distinctCases: signatures.size,
      uniqueFirstFiveShifts: new Set(fiveShifts).size,
    },
    null,
    2,
  ),
);
if (deadEnds.length) process.exitCode = 1;
if (new Set(fiveShifts).size !== 5) process.exitCode = 1;
if (archetypes.size < 30 || complaints.size < 20 || exceptions.size < 18)
  process.exitCode = 1;
if (destinations.size !== 12 || signatures.size < 250 || specialChoices < 50)
  process.exitCode = 1;
if (incidentIds.size !== 12) process.exitCode = 1;
