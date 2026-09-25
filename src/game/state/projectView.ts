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
  const lastResolved = [...state.cases]
    .reverse()
    .find((entry) => entry.status === "resolved") as SimCase | undefined;
  const deliveredTo = destinations.find(
    (item) => item.id === lastResolved?.selectedDestination,
  );
  const reactionId =
    deliveredTo && lastResolved?.outcome
      ? deliveredTo.reactions[
          lastResolved.outcome === "correct"
            ? "correct"
            : lastResolved.outcome === "acceptable"
              ? "acceptable"
              : "wrong"
        ]
      : null;
  const reaction = packs
    .flatMap((pack) => pack.reactions)
    .find((item) => item.id === reactionId);
  const portraitFor = (archetypeId: string | undefined): string | null =>
    packs
      .flatMap((pack) => pack.archetypes)
      .find((item) => item.id === archetypeId)?.portrait ?? null;
  const agentId = Object.entries(state.players).find(
    ([, player]) => player.role === "agent",
  )?.[0];
  const scenario = packages
    .flatMap((pkg) => pkg.scenarios)
    .find((item) => item.id === simState.scenarioId);
  const modifiers = (scenario?.mutators ?? [])
    .filter(
      (mutator) =>
        mutator.afterCase < scenario!.casePlan.count &&
        (state.activeRules.includes(mutator.rule as never) ||
          mutator.afterCase === simState.resolvedCount + 1),
    )
    .map((mutator) => ({
      ruleId: mutator.rule as never,
      text: translate(
        packs
          .flatMap((pack) => pack.rules)
          .find((rule) => rule.id === mutator.rule)?.textKey ?? mutator.rule,
      ),
      state: state.activeRules.includes(mutator.rule as never)
        ? ("active" as const)
        : ("announced" as const),
    }));
  const publicView = {
    phase: state.phase,
    revision: state.stateRevision,
    elapsedMs: state.shift.elapsedMs,
    pauseReason: state.pause?.reason ?? null,
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
    approvalLog: [...(simCase?.approvalLog ?? [])],
    modifiers,
    tutorial: simState.tutorial
      ? {
          stage: simState.tutorialStage,
          stations: { ...simState.tutorialStations },
        }
      : null,
    lastReaction:
      lastResolved && reaction
        ? {
            caseId: lastResolved.id,
            assetId: reaction.asset,
            caption: translate(reaction.captionKey),
          }
        : null,
    report:
      state.phase === "results"
        ? {
            seed: state.seed,
            contentHash: simState.contentHash,
            endReason: simState.endReason ?? "unbekannt",
            elapsedMs: state.shift.elapsedMs,
            averageCaseMs: (() => {
              const durations = state.cases
                .map((item) => item as SimCase)
                .filter(
                  (item) =>
                    item.acceptedElapsedMs !== null &&
                    item.resolvedElapsedMs !== null,
                )
                .map(
                  (item) => item.resolvedElapsedMs! - item.acceptedElapsedMs!,
                );
              return durations.length
                ? Math.round(
                    durations.reduce((sum, duration) => sum + duration, 0) /
                      durations.length,
                  )
                : 0;
            })(),
            score: { ...state.score },
            cases: state.cases.map((item) => ({
              id: item.id,
              outcome: (item as SimCase).outcome ?? null,
              selectedDestination: item.selectedDestination,
              trueDestination: item.trueDestination,
            })),
          }
        : null,
    colleagues: Object.values(state.players).map((player) => ({
      role: player.role,
      activity: !player.connected
        ? ("getrennt" as const)
        : player.role === "agent"
          ? active
            ? ("spricht" as const)
            : ("bereit" as const)
          : player.role === "archivist"
            ? active
              ? ("sucht" as const)
              : ("bereit" as const)
            : simCase?.prepared
              ? ("bereit" as const)
              : active
                ? ("bereitet vor" as const)
                : ("bereit" as const),
    })),
  };

  switch (role) {
    case "agent":
      return {
        public: publicView,
        role: {
          role,
          callerName: active ? translate(active.callerName) : null,
          callerPortrait: portraitFor(simCase?.generated?.archetypeId),
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
          incomingCallerPortrait: portraitFor(
            (incoming as SimCase | undefined)?.generated?.archetypeId,
          ),
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
      const incidentReaction = packs
        .flatMap((pack) => pack.reactions)
        .find((entry) => entry.id === incident?.reaction);
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
                  reactionAssetId: incidentReaction?.asset ?? "",
                  reactionCaption: incidentReaction
                    ? translate(incidentReaction.captionKey)
                    : "",
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
