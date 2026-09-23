import type { GameState, PlayerViewState, Role } from "./contracts";

export function projectView(state: GameState, role: Role): PlayerViewState {
  const active = state.cases.find(
    (item) =>
      item.status !== "queued" &&
      item.status !== "resolved" &&
      item.status !== "aborted",
  );
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
    archivePins: [...(active?.archivePins ?? [])],
    selectedDestination: active?.selectedDestination ?? null,
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
          callerName: active?.callerName ?? null,
          callerMood: active?.callerMood ?? null,
          dialogueOptions: [...(active?.dialogueOptions ?? [])],
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
