import type { CampaignPackage } from "../../content/schemas";
import type { GameState, PlayerViewState, Role } from "./contracts";
import { TICK_MS, type SimCase, type SimulationState } from "./simulation";

export function projectView(
  state: GameState,
  role: Role,
  packages: readonly CampaignPackage[] = [],
): PlayerViewState {
  const active = state.cases.find(
    (item) =>
      item.status !== "queued" &&
      item.status !== "resolved" &&
      item.status !== "aborted",
  );
  const incoming = state.cases.find((item) => item.status === "queued");
  const simCase = active as SimCase | undefined;
  const simState = state as SimulationState;
  const translations = Object.assign(
    {},
    ...packages.map((pkg) => pkg.translations),
  ) as Record<string, string>;
  const translate = (key: string): string => translations[key] ?? key;
  const packs = packages.flatMap((pkg) => pkg.packs);
  const dialogue = packs
    .flatMap((pack) => pack.dialogues)
    .find((entry) => entry.id === simCase?.generated?.dialogueId);
  const node = dialogue?.nodes.find(
    (entry) => entry.id === simCase?.dialogueNode,
  );
  const layout = packs
    .flatMap((pack) => pack.machineLayouts)
    .find((entry) => entry.id === simCase?.generated?.layoutId);
  const destinations = packs.flatMap((pack) => pack.destinations);
  const agentId = Object.entries(state.players).find(
    ([, player]) => player.role === "agent",
  )?.[0];
  const publicView = {
    phase: state.phase,
    revision: state.stateRevision,
    elapsedMs: state.shift.elapsedMs,
    queueLength: state.cases.filter((item) => item.status === "queued").length,
    queuePressure: state.shift.queuePressure,
    boilerPressure: state.shift.boilerPressure,
    auditRisk: state.shift.auditRisk,
    activeCaseId: active?.id ?? null,
    publishedTags: [...(active?.publishedTags ?? [])],
    suggestedDestination: active?.suggestedDestination ?? null,
    archivePins: [...(active?.archivePins ?? [])],
    selectedDestination: active?.selectedDestination ?? null,
    approvals: simCase?.approvals ?? {
      agent: false,
      archivist: false,
      dispatcher: false,
    },
    colleagues: Object.values(state.players).map((player) => ({
      role: player.role,
      connected: player.connected,
      ready: player.ready,
    })),
  };

  switch (role) {
    case "agent":
      return {
        public: publicView,
        role: {
          role,
          callerName: active ? translate(active.callerName) : null,
          callerMood: active?.callerMood ?? null,
          dialogueOptions: [...(active?.dialogueOptions ?? [])],
          dialogueText: node ? translate(node.textKey) : null,
          dialogueLabels: Object.fromEntries(
            (node?.choices ?? []).map((choice) => [
              choice.id,
              translate(choice.textKey),
            ]),
          ),
          incomingCaseId: incoming?.id ?? null,
          incomingCallerName: incoming ? translate(incoming.callerName) : null,
          discoveredTags: [...(simCase?.discoveredTags ?? [])],
          tagLabels: Object.fromEntries(
            (simCase?.discoveredTags ?? []).map((id) => [
              id,
              translate(
                packs.flatMap((pack) => pack.tags).find((tag) => tag.id === id)
                  ?.textKey ?? id,
              ),
            ]),
          ),
          cooldownMs: agentId
            ? Math.max(
                0,
                ((simState.cooldownUntil?.[agentId] ?? 0) - state.hostTick) *
                  TICK_MS,
              )
            : 0,
          suggestableDestinations: (layout?.availableDestinations ?? []).map(
            (id) => ({
              id: id as never,
              name: translate(
                destinations.find((entry) => entry.id === id)?.nameKey ?? id,
              ),
            }),
          ),
        },
        presentation: [],
      };
    case "archivist": {
      const scenario = packages
        .flatMap((pkg) => pkg.scenarios)
        .find((item) => item.id === simState.scenarioId);
      const tags = packs.flatMap((pack) => pack.tags);
      const complaints = packs.flatMap((pack) => pack.complaints);
      const archiveRecords = packs
        .flatMap((pack) => pack.archetypes)
        .filter((item) => scenario?.allowedContent.archetypes.includes(item.id))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((item) => ({
          id: item.id,
          name: translate(item.nameKey),
          aliases: (item.aliasKeys ?? []).map(translate),
          occupation: item.occupationKey ? translate(item.occupationKey) : "",
          events: (item.eventKeys ?? []).map(translate),
          warnings: (item.warningKeys ?? []).map(translate),
          dossier: translate(item.dossierKey),
          tags: [...item.possibleTags],
          complaints: item.possibleComplaints.map((id) =>
            translate(
              complaints.find((entry) => entry.id === id)?.textKey ?? id,
            ),
          ),
        }));
      const ruleEntries = [
        ...packs
          .flatMap((pack) => pack.rules)
          .map((item) => ({
            id: item.id,
            kind: "rule" as const,
            text: translate(item.textKey),
            destination: translate(
              destinations.find((entry) => entry.id === item.destination)
                ?.nameKey ?? item.destination,
            ),
            priority: item.priority,
            active: state.activeRules.includes(item.id as never),
            overrides: null,
          })),
        ...packs
          .flatMap((pack) => pack.exceptions)
          .map((item) => ({
            id: item.id,
            kind: "exception" as const,
            text: translate(item.textKey),
            destination: translate(
              destinations.find((entry) => entry.id === item.destination)
                ?.nameKey ?? item.destination,
            ),
            priority: item.priority,
            active: state.activeRules.includes(item.overrides as never),
            overrides: item.overrides,
          })),
      ].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
      return {
        public: publicView,
        role: {
          role,
          dossier: null,
          ruleText: null,
          activeRules: [...state.activeRules],
          archiveRecords,
          ruleEntries,
          tagLabels: Object.fromEntries(
            tags.map((tag) => [tag.id, translate(tag.textKey)]),
          ),
          stamp: simCase?.stamps?.at(-1) ?? null,
        },
        presentation: [],
      };
    }
    case "dispatcher": {
      const controlViews = (layout?.controls ?? []).map((control) => ({
        id: control.id,
        label: translate(control.labelKey),
        kind: control.kind,
        values: [...control.values],
        value: state.machine.controls[control.id] ?? control.values[0]!,
      }));
      const scenarioDestinations =
        packages
          .flatMap((pkg) => pkg.scenarios)
          .find((item) => item.id === simState.scenarioId)?.allowedContent
          .destinations ?? [];
      const destinationViews = destinations
        .filter(
          (destination) =>
            layout?.availableDestinations.includes(destination.id) &&
            scenarioDestinations.includes(destination.id),
        )
        .map((destination) => ({
          id: destination.id as never,
          name: translate(destination.nameKey),
          description: translate(destination.descriptionKey),
          kind: destination.kind ?? ("standard" as const),
          glyph: destination.glyph ?? "◇",
          requirements: destination.machineRequirements.map((requirement) => ({
            controlId: requirement.control,
            label:
              controlViews.find((control) => control.id === requirement.control)
                ?.label ?? requirement.control,
            value: requirement.equals,
          })),
        }));
      const incident = packages
        .flatMap((pkg) => pkg.packs)
        .flatMap((pack) => pack.incidents)
        .find((entry) => entry.id === simCase?.incidentId);
      const lastResolved = [...state.cases]
        .reverse()
        .find((entry) => entry.status === "resolved") as SimCase | undefined;
      return {
        public: publicView,
        role: {
          role,
          machine: {
            controls: { ...state.machine.controls },
            availableDestinations: [...state.machine.availableDestinations],
          },
          controls: controlViews,
          destinations: destinationViews,
          incident:
            incident && !simCase?.incidentRecovered
              ? {
                  id: incident.id,
                  name: translate(incident.textKey),
                  diagnosis: translate(incident.diagnosisKey),
                  recoveryControlId: incident.recovery.control,
                  recoveryValue: incident.recovery.equals,
                }
              : null,
          prepared: simCase?.prepared ?? false,
          lastOutcome: lastResolved?.outcome
            ? {
                caseId: lastResolved.id,
                outcome: lastResolved.outcome,
              }
            : null,
        },
        presentation: [],
      };
    }
  }
}
