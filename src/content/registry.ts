import {
  CampaignPackageSchema,
  CONTENT_SCHEMA_VERSION,
  CORE_CONTENT_VERSION,
  GAMEPLAY_HASH_VERSION,
  type CampaignPackage,
  type Predicate,
  type SampleCase,
  type Scenario,
} from "./schemas";

type Entity = { id: string };
type Registry = {
  packages: CampaignPackage[];
  entities: ReadonlyMap<string, Entity>;
  gameplayHash: string;
};

const kinds = {
  chapters: "chapter",
  scenarios: "scenario",
  packs: "pack",
  archetypes: "archetype",
  complaints: "complaint",
  tags: "tag",
  rules: "rule",
  exceptions: "exception",
  destinations: "destination",
  machineLayouts: "machine",
  incidents: "incident",
  dialogues: "dialogue",
  reactions: "reaction",
} as const;

function fail(context: string, message: string): never {
  throw new Error(`${context}: ${message}`);
}

function unique(values: readonly string[], context: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(context, `duplicate reference ${value}`);
    seen.add(value);
  }
}

function predicatesMatch(
  predicate: Predicate,
  sample: SampleCase,
  destination: string,
): boolean {
  switch (predicate.op) {
    case "all":
      return predicate.predicates.every((part) =>
        predicatesMatch(part, sample, destination),
      );
    case "any":
      return predicate.predicates.some((part) =>
        predicatesMatch(part, sample, destination),
      );
    case "not":
      return !predicatesMatch(predicate.predicate, sample, destination);
    case "hasTag":
      return sample.tags.includes(predicate.id);
    case "hasStamp":
      return sample.stamps.includes(predicate.id);
    case "destinationIs":
      return destination === predicate.id;
    case "pressureBelow":
      return sample.pressure < predicate.value;
    case "caseCountAtLeast":
      return sample.caseCount >= predicate.value;
  }
}

const gameplayOmitted = new Set([
  "titleKey",
  "descriptionKey",
  "nameKey",
  "dossierKey",
  "aliasKeys",
  "occupationKey",
  "eventKeys",
  "warningKeys",
  "textKey",
  "labelKey",
  "diagnosisKey",
  "captionKey",
  "intro",
  "outro",
  "assetPack",
  "portrait",
  "symbol",
  "bodyAsset",
  "reactions",
  "reaction",
  "reducedMotionAsset",
  "translations",
  "assets",
]);
const unorderedIdLists = new Set([
  "contentPacks",
  "startingRules",
  "availableDestinations",
  "archetypes",
  "complaints",
  "tags",
  "destinations",
  "incidents",
  "machineLayouts",
  "exceptions",
]);

function canonical(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => canonical(item));
    if (
      items.every(
        (item) => item !== null && typeof item === "object" && "id" in item,
      ) ||
      (unorderedIdLists.has(key) &&
        items.every((item) => typeof item === "string"))
    )
      items.sort((a, b) => {
        const left = JSON.stringify(a);
        const right = JSON.stringify(b);
        return left < right ? -1 : left > right ? 1 : 0;
      });
    return items;
  }
  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const field of Object.keys(value).sort()) {
      if (gameplayOmitted.has(field)) continue;
      const content = (value as Record<string, unknown>)[field];
      if (content !== undefined) output[field] = canonical(content, field);
    }
    return output;
  }
  return value;
}

export function canonicalGameplayJson(
  packages: readonly CampaignPackage[],
): string {
  const sorted = [...packages].sort((a, b) =>
    a.manifest.id < b.manifest.id ? -1 : a.manifest.id > b.manifest.id ? 1 : 0,
  );
  return JSON.stringify({
    hashVersion: GAMEPLAY_HASH_VERSION,
    packages: canonical(sorted),
  });
}

export async function gameplayHash(
  packages: readonly CampaignPackage[],
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalGameplayJson(packages));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function isReplayCompatible(
  saved: {
    contentSchemaVersion: number;
    gameplayHashVersion: number;
    gameplayHash: string;
  },
  registry: Registry,
): boolean {
  return (
    saved.contentSchemaVersion === CONTENT_SCHEMA_VERSION &&
    saved.gameplayHashVersion === GAMEPLAY_HASH_VERSION &&
    saved.gameplayHash === registry.gameplayHash
  );
}

export async function loadContent(
  rawPackages: readonly unknown[],
): Promise<Registry> {
  const packages: CampaignPackage[] = [];
  const entities = new Map<string, Entity>();
  const types = new Map<string, string>();
  const manifests = new Map<string, CampaignPackage["manifest"]>();
  const translations = new Set<string>();
  const assets = new Set<string>();

  for (const [index, raw] of rawPackages.entries()) {
    const parsed = CampaignPackageSchema.safeParse(raw);
    if (!parsed.success)
      fail(
        `package ${index}`,
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
    const pkg = parsed.data;
    const manifest = pkg.manifest;
    if (manifest.requiredCoreVersion !== CORE_CONTENT_VERSION)
      fail(
        manifest.id,
        `requires core ${manifest.requiredCoreVersion}; supported ${CORE_CONTENT_VERSION}`,
      );
    if (manifests.has(manifest.id)) fail(manifest.id, "duplicate campaign");
    for (const dependency of manifest.dependencies) {
      if (manifests.get(dependency.id)?.version !== dependency.version)
        fail(
          manifest.id,
          `dependency ${dependency.id}@${dependency.version} must be loaded first`,
        );
    }
    unique(
      manifest.dependencies.map((dependency) => dependency.id),
      manifest.id,
    );
    const namespace = manifest.id === "campaign.core" ? "core" : manifest.id;
    function register(items: readonly Entity[], kind: string): void {
      for (const item of items) {
        if (!item.id.startsWith(`${namespace}.${kind}.`))
          fail(item.id, `expected ${namespace}.${kind} namespace`);
        if (entities.has(item.id))
          fail(item.id, `duplicate ID (${types.get(item.id)} and ${kind})`);
        entities.set(item.id, item);
        types.set(item.id, kind);
      }
    }
    register(pkg.chapters, kinds.chapters);
    register(pkg.scenarios, kinds.scenarios);
    register(pkg.packs, kinds.packs);
    for (const pack of pkg.packs) {
      for (const [field, kind] of Object.entries(kinds)) {
        if (field === "chapters" || field === "scenarios" || field === "packs")
          continue;
        register(
          pack[
            field as keyof Omit<
              typeof kinds,
              "chapters" | "scenarios" | "packs"
            >
          ] as Entity[],
          kind,
        );
      }
    }
    for (const key of Object.keys(pkg.translations)) translations.add(key);
    for (const asset of pkg.assets) assets.add(asset);
    manifests.set(manifest.id, manifest);
    packages.push(pkg);
  }

  function ref(id: string, kind: string, from: string): void {
    if (types.get(id) !== kind) fail(from, `missing ${kind} reference ${id}`);
  }
  function get<T>(id: string): T {
    return entities.get(id) as unknown as T;
  }
  function refs(ids: readonly string[], kind: string, from: string): void {
    unique(ids, from);
    ids.forEach((id) => ref(id, kind, from));
  }
  function textRef(key: string, from: string): void {
    if (!translations.has(key)) fail(from, `missing translation ${key}`);
  }
  function assetRef(id: string, from: string): void {
    if (!assets.has(id)) fail(from, `missing asset ${id}`);
  }
  function predicateRefs(predicate: Predicate, from: string): void {
    switch (predicate.op) {
      case "all":
      case "any":
        predicate.predicates.forEach((part) => predicateRefs(part, from));
        break;
      case "not":
        predicateRefs(predicate.predicate, from);
        break;
      case "hasTag":
        ref(predicate.id, "tag", from);
        break;
      case "destinationIs":
        ref(predicate.id, "destination", from);
        break;
      case "hasStamp":
        break; // Stamps are core commands, not content entities.
    }
  }
  function machineRequirement(
    requirement: { control: string; equals: boolean | number | string },
    from: string,
    layoutIds: readonly string[],
  ): void {
    if (
      !layoutIds.some((layoutId) => {
        const layout = get<{
          controls: { id: string; values: (boolean | number | string)[] }[];
        }>(layoutId);
        return layout.controls.some(
          (control) =>
            control.id === requirement.control &&
            control.values.includes(requirement.equals),
        );
      })
    )
      fail(
        from,
        `machine requirement ${requirement.control}=${String(requirement.equals)} has no matching control`,
      );
  }
  function validateScenario(scenario: Scenario): void {
    const from = scenario.id;
    for (const [field, kind] of [
      ["archetypes", "archetype"],
      ["complaints", "complaint"],
      ["tags", "tag"],
      ["destinations", "destination"],
      ["incidents", "incident"],
    ] as const)
      refs(scenario.allowedContent[field], kind, from);
    refs(scenario.machineLayouts, "machine", from);
    refs(scenario.startingRules, "rule", from);
    scenario.mutators.forEach((mutator) => {
      ref(mutator.rule, "rule", from);
      if (mutator.afterCase >= scenario.casePlan.count)
        fail(
          from,
          `mutator afterCase ${mutator.afterCase} is outside case plan`,
        );
    });
    if (scenario.victory.count > scenario.casePlan.count)
      fail(from, "victory count exceeds case plan");
    for (const layoutId of scenario.machineLayouts) {
      const layout = get<{ availableDestinations: string[] }>(layoutId);
      if (
        !scenario.allowedContent.destinations.some((id) =>
          layout.availableDestinations.includes(id),
        )
      )
        fail(from, `layout ${layoutId} has no allowed destination`);
    }
    for (const sample of scenario.casePlan.samples) {
      ref(sample.archetype, "archetype", from);
      ref(sample.complaint, "complaint", from);
      refs(sample.tags, "tag", from);
      refs(sample.exceptions, "exception", from);
      if (
        !scenario.allowedContent.archetypes.includes(sample.archetype) ||
        !scenario.allowedContent.complaints.includes(sample.complaint) ||
        sample.tags.some((tag) => !scenario.allowedContent.tags.includes(tag))
      )
        fail(from, "sample case uses content outside allowed pool");
      const archetype = get<{
        possibleTags: string[];
        possibleComplaints: string[];
      }>(sample.archetype);
      if (
        sample.tags.some((tag) => !archetype.possibleTags.includes(tag)) ||
        !archetype.possibleComplaints.includes(sample.complaint)
      )
        fail(from, "sample case is incompatible with archetype");
      for (const layoutId of scenario.machineLayouts) {
        const layout = get<{ availableDestinations: string[] }>(layoutId);
        const valid = scenario.allowedContent.destinations.filter(
          (destinationId) => {
            if (!layout.availableDestinations.includes(destinationId))
              return false;
            const destination = get<{
              eligibility: Predicate;
              machineRequirements: {
                control: string;
                equals: boolean | number | string;
              }[];
            }>(destinationId);
            if (
              !predicatesMatch(destination.eligibility, sample, destinationId)
            )
              return false;
            const matching = scenario.startingRules
              .map((ruleId) =>
                get<{
                  destination: string;
                  effect: "allow" | "forbid";
                  priority: number;
                  when: Predicate;
                }>(ruleId),
              )
              .filter(
                (rule) =>
                  rule.destination === destinationId &&
                  predicatesMatch(rule.when, sample, destinationId),
              );
            matching.push(
              ...sample.exceptions
                .map((exceptionId) =>
                  get<{
                    destination: string;
                    effect: "allow" | "forbid";
                    priority: number;
                    when: Predicate;
                  }>(exceptionId),
                )
                .filter(
                  (rule) =>
                    rule.destination === destinationId &&
                    predicatesMatch(rule.when, sample, destinationId),
                ),
            );
            matching.sort((a, b) => b.priority - a.priority);
            if (
              matching.length > 1 &&
              matching[0]?.priority === matching[1]?.priority &&
              matching[0]?.effect !== matching[1]?.effect
            )
              fail(
                from,
                `conflicting rules at priority ${matching[0]?.priority}`,
              );
            return (
              matching[0]?.effect !== "forbid" &&
              destination.machineRequirements.every((requirement) => {
                const control = get<{
                  controls: {
                    id: string;
                    values: (boolean | number | string)[];
                  }[];
                }>(layoutId).controls.find(
                  (control) => control.id === requirement.control,
                );
                return control?.values.includes(requirement.equals);
              })
            );
          },
        );
        if (valid.length === 0)
          fail(from, `unsolvable sample ${sample.archetype} on ${layoutId}`);
      }
    }
  }

  for (const pkg of packages) {
    const manifest = pkg.manifest;
    textRef(manifest.titleKey, manifest.id);
    textRef(manifest.descriptionKey, manifest.id);
    assetRef(manifest.assetPack, manifest.id);
    refs(manifest.chapters, "chapter", manifest.id);
    refs(manifest.contentPacks, "pack", manifest.id);
    for (const chapter of pkg.chapters) {
      textRef(chapter.titleKey, chapter.id);
      refs(chapter.scenarios, "scenario", chapter.id);
      if (chapter.unlock) predicateRefs(chapter.unlock, chapter.id);
    }
    for (const scenario of pkg.scenarios) {
      textRef(scenario.titleKey, scenario.id);
      if (scenario.intro) textRef(scenario.intro, scenario.id);
      if (scenario.outro) textRef(scenario.outro, scenario.id);
      validateScenario(scenario);
    }
    for (const pack of pkg.packs) {
      for (const archetype of pack.archetypes) {
        textRef(archetype.nameKey, archetype.id);
        textRef(archetype.dossierKey, archetype.id);
        for (const key of archetype.aliasKeys ?? []) textRef(key, archetype.id);
        if (archetype.occupationKey)
          textRef(archetype.occupationKey, archetype.id);
        for (const key of archetype.eventKeys ?? []) textRef(key, archetype.id);
        for (const key of archetype.warningKeys ?? [])
          textRef(key, archetype.id);
        assetRef(archetype.portrait, archetype.id);
        refs(archetype.possibleTags, "tag", archetype.id);
        refs(archetype.possibleComplaints, "complaint", archetype.id);
        ref(archetype.dialogue, "dialogue", archetype.id);
      }
      for (const complaint of pack.complaints) {
        textRef(complaint.textKey, complaint.id);
        if (complaint.hintTag) ref(complaint.hintTag, "tag", complaint.id);
      }
      for (const tag of pack.tags) {
        textRef(tag.textKey, tag.id);
        assetRef(tag.symbol, tag.id);
      }
      for (const rule of pack.rules) {
        textRef(rule.textKey, rule.id);
        ref(rule.destination, "destination", rule.id);
        predicateRefs(rule.when, rule.id);
      }
      for (const exception of pack.exceptions) {
        textRef(exception.textKey, exception.id);
        ref(exception.overrides, "rule", exception.id);
        ref(exception.destination, "destination", exception.id);
        predicateRefs(exception.when, exception.id);
        const overridden = get<{ destination: string; priority: number }>(
          exception.overrides,
        );
        if (
          overridden.destination !== exception.destination ||
          exception.priority <= overridden.priority
        )
          fail(
            exception.id,
            "exception must outrank a rule for the same destination",
          );
      }
      for (const destination of pack.destinations) {
        textRef(destination.nameKey, destination.id);
        textRef(destination.descriptionKey, destination.id);
        assetRef(destination.symbol, destination.id);
        predicateRefs(destination.eligibility, destination.id);
        Object.values(destination.reactions).forEach((id) =>
          ref(id, "reaction", destination.id),
        );
        for (const requirement of destination.machineRequirements)
          machineRequirement(
            requirement,
            destination.id,
            [...entities]
              .filter(([, entity]) => "controls" in entity)
              .map(([id]) => id),
          );
      }
      for (const layout of pack.machineLayouts) {
        textRef(layout.nameKey, layout.id);
        assetRef(layout.bodyAsset, layout.id);
        refs(layout.availableDestinations, "destination", layout.id);
        unique(
          layout.controls.map((control) => control.id),
          layout.id,
        );
        for (const control of layout.controls)
          textRef(control.labelKey, layout.id);
      }
      for (const incident of pack.incidents) {
        textRef(incident.textKey, incident.id);
        textRef(incident.diagnosisKey, incident.id);
        ref(incident.layout, "machine", incident.id);
        ref(incident.reaction, "reaction", incident.id);
        machineRequirement(incident.recovery, incident.id, [incident.layout]);
      }
      for (const dialogue of pack.dialogues) {
        const nodes = new Map(dialogue.nodes.map((node) => [node.id, node]));
        if (nodes.size !== dialogue.nodes.length)
          fail(dialogue.id, "duplicate dialogue node");
        const seen = new Set<string>();
        function visit(nodeId: string): void {
          const node = nodes.get(nodeId);
          if (!node) fail(dialogue.id, `missing dialogue node ${nodeId}`);
          if (seen.has(nodeId)) return;
          seen.add(nodeId);
          textRef(node.textKey, dialogue.id);
          unique(
            node.choices.map((choice) => choice.id),
            dialogue.id,
          );
          for (const choice of node.choices) {
            textRef(choice.textKey, dialogue.id);
            if (choice.revealTag) ref(choice.revealTag, "tag", dialogue.id);
            visit(choice.next);
          }
        }
        visit(dialogue.start);
        if (seen.size !== nodes.size)
          fail(
            dialogue.id,
            `unreachable dialogue nodes: ${[...nodes.keys()].filter((id) => !seen.has(id)).join(", ")}`,
          );
      }
      for (const reaction of pack.reactions) {
        assetRef(reaction.asset, reaction.id);
        if (reaction.reducedMotionAsset)
          assetRef(reaction.reducedMotionAsset, reaction.id);
        textRef(reaction.captionKey, reaction.id);
      }
    }
  }
  return { packages, entities, gameplayHash: await gameplayHash(packages) };
}
