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
    case "archivist":
      return {
        public: publicView,
        role: {
          role,
          dossier: active?.dossier ?? null,
          ruleText: active?.ruleText ?? null,
          activeRules: [...state.activeRules],
        },
        presentation: [],
      };
    case "dispatcher":
      return {
        public: publicView,
        role: {
          role,
          machine: {
            controls: { ...state.machine.controls },
            availableDestinations: [...state.machine.availableDestinations],
          },
        },
        presentation: [],
      };
  }
}
