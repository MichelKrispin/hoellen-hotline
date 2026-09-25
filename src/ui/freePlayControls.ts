import { CAMPAIGN_CATALOG } from "../content/catalog";
import { FREE_PLAY_PRESETS, type GameMode } from "../game/modes/config";

export type FreePlayMode = Extract<GameMode, { kind: "freePlay" }>;

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

const option = (value: string, label: string, selected: boolean): string =>
  `<option value="${escapeHtml(value)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
const checkbox = (
  group: string,
  id: string,
  label: string,
  checked: boolean,
): string =>
  `<label><input type="checkbox" name="${group}" value="${escapeHtml(id)}" ${checked ? "checked" : ""}>${escapeHtml(label)}</label>`;

export function renderFreePlayControls(mode: FreePlayMode): string {
  const source = CAMPAIGN_CATALOG.find((pkg) =>
    pkg.scenarios.some((scenario) => scenario.id === mode.scenarioId),
  );
  const scenario = source?.scenarios.find(
    (item) => item.id === mode.scenarioId,
  );
  if (!scenario) return "<p>Freies Spielszenario fehlt.</p>";
  const selected = CAMPAIGN_CATALOG.filter((pkg) =>
    mode.campaignIds.includes(pkg.manifest.id),
  );
  const allowedDestinationIds = new Set(
    selected.flatMap((pkg) =>
      pkg.scenarios.flatMap((item) => item.allowedContent.destinations),
    ),
  );
  const destinations = CAMPAIGN_CATALOG.flatMap((pkg) =>
    pkg.packs.flatMap((pack) =>
      pack.destinations
        .filter((destination) => allowedDestinationIds.has(destination.id))
        .map((destination) => ({
          id: destination.id,
          label: pkg.translations[destination.nameKey] ?? destination.id,
        })),
    ),
  );
  const rules = selected.flatMap((pkg) =>
    pkg.packs.flatMap((pack) =>
      pack.rules.map((rule) => ({
        id: rule.id,
        label: pkg.translations[rule.textKey] ?? rule.id,
      })),
    ),
  );
  const layouts = selected.flatMap((pkg) =>
    pkg.packs.flatMap((pack) =>
      pack.machineLayouts.map((layout) => ({
        id: layout.id,
        label: pkg.translations[layout.nameKey] ?? layout.id,
      })),
    ),
  );
  const preset = FREE_PLAY_PRESETS[mode.preset];
  const defaultRules = new Set(mode.ruleIds ?? scenario.startingRules);
  const defaultMutators = new Set(
    mode.mutatorRuleIds ?? scenario.mutators.map((item) => item.rule),
  );
  const defaultLayouts = new Set(
    mode.layoutIds ??
      (mode.layoutPolicy === "random"
        ? layouts.map((layout) => layout.id)
        : scenario.machineLayouts),
  );
  return `<fieldset class="freeplay-config"><legend>Freies Spiel konfigurieren</legend>
    <div class="freeplay-basics"><label>Fälle (8–12)<input id="free-case-count" type="number" min="8" max="12" value="${mode.caseCount ?? preset.cases}"></label>
    <label>Schwierigkeit<select id="free-difficulty">${(["relaxed", "standard", "infernal"] as const).map((value) => option(value, FREE_PLAY_PRESETS[value].label, (mode.difficulty ?? preset.difficulty) === value)).join("")}</select></label>
    <label>Störungsdichte<select id="free-incidents">${(["none", "low", "normal", "high"] as const).map((value) => option(value, { none: "Keine", low: "Wenig", normal: "Normal", high: "Hoch" }[value], (mode.incidentDensity ?? preset.incidentDensity) === value)).join("")}</select></label>
    <label>Maschinenlayouts<select id="free-layout-policy">${option("curated", "Kuratiert", (mode.layoutPolicy ?? "curated") === "curated")}${option("random", "Zufällig aus Pool", mode.layoutPolicy === "random")}</select></label></div>
    <details><summary>Content-Pakete</summary><div class="freeplay-options">${CAMPAIGN_CATALOG.map((pkg) => checkbox("free-campaign", pkg.manifest.id, pkg.translations[pkg.manifest.titleKey] ?? pkg.manifest.id, mode.campaignIds.includes(pkg.manifest.id))).join("")}</div></details>
    <details><summary>Zielpool</summary><div class="freeplay-options">${destinations.map((item) => checkbox("free-destination", item.id, item.label, mode.destinationIds?.includes(item.id) ?? true)).join("")}</div></details>
    <details><summary>Startregeln</summary><div class="freeplay-options">${rules.map((item) => checkbox("free-rule", item.id, item.label, defaultRules.has(item.id))).join("")}</div></details>
    <details><summary>Schichtmodifikatoren</summary><div class="freeplay-options">${scenario.mutators.map((item) => checkbox("free-mutator", item.rule, rules.find((rule) => rule.id === item.rule)?.label ?? item.rule, defaultMutators.has(item.rule))).join("")}</div></details>
    <details><summary>Maschinenpool</summary><div class="freeplay-options">${layouts.map((item) => checkbox("free-layout", item.id, item.label, defaultLayouts.has(item.id))).join("")}</div></details>
    <button data-action="apply-freeplay">Freies Spiel übernehmen</button></fieldset>`;
}

export function readFreePlayControls(
  root: ParentNode,
  current: FreePlayMode,
): FreePlayMode {
  const input = (id: string): HTMLInputElement | HTMLSelectElement => {
    const element = root.querySelector<HTMLInputElement | HTMLSelectElement>(
      `#${id}`,
    );
    if (!element) throw new Error(`Eingabe ${id} fehlt.`);
    return element;
  };
  const checked = (name: string): string[] =>
    Array.from(
      root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`),
    ).map((element) => element.value);
  return {
    ...current,
    caseCount: Number(input("free-case-count").value),
    difficulty: input("free-difficulty").value as FreePlayMode["difficulty"],
    incidentDensity: input("free-incidents")
      .value as FreePlayMode["incidentDensity"],
    layoutPolicy: input("free-layout-policy")
      .value as FreePlayMode["layoutPolicy"],
    campaignIds: checked("free-campaign"),
    destinationIds: checked("free-destination"),
    ruleIds: checked("free-rule"),
    mutatorRuleIds: checked("free-mutator"),
    layoutIds: checked("free-layout"),
  };
}
