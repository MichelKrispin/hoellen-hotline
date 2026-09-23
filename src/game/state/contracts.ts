import type {
  ActionId,
  CaseId,
  DestinationId,
  PlayerId,
  RuleId,
  SessionId,
} from "../core/ids";

export type Role = "agent" | "archivist" | "dispatcher";
export type Phase = "lobby" | "shift" | "results";
export type CaseStatus =
  | "queued"
  | "active"
  | "investigating"
  | "approved"
  | "routing"
  | "resolved"
  | "aborted";

export interface CaseState {
  id: CaseId;
  status: CaseStatus;
  callerName: string;
  dialogueOptions: string[];
  callerMood: number;
  dossier: string;
  ruleText: string;
  trueDestination: DestinationId;
  publishedTags: string[];
  archivePins: string[];
  selectedDestination: DestinationId | null;
}

export interface MachineState {
  controls: Record<string, number | boolean | string>;
  availableDestinations: DestinationId[];
}

export interface ScoreState {
  resolvedCorrectly: number;
  resolvedAcceptably: number;
  resolvedIncorrectly: number;
  catastrophicErrors: number;
}

export interface GameState {
  sessionId: SessionId;
  phase: Phase;
  seed: string;
  rngState: string;
  hostTick: number;
  stateRevision: number;
  players: Record<PlayerId, { role: Role; connected: boolean; ready: boolean }>;
  shift: {
    elapsedMs: number;
    currentWave: number;
    queuePressure: number;
    boilerPressure: number;
    auditRisk: number;
  };
  cases: CaseState[];
  activeRules: RuleId[];
  machine: MachineState;
  score: ScoreState;
  pause: null | { reason: "host-menu" | "disconnect"; resumePhase: "shift" };
}

export type ClientAction =
  | {
      actionId: ActionId;
      kind: "AGENT_DIALOGUE";
      caseId: CaseId;
      optionId: string;
    }
  | { actionId: ActionId; kind: "AGENT_TAG"; caseId: CaseId; tagId: string }
  | { actionId: ActionId; kind: "ARCHIVE_SEARCH"; query: string }
  | {
      actionId: ActionId;
      kind: "ARCHIVE_PIN";
      caseId: CaseId;
      recordId: string;
    }
  | { actionId: ActionId; kind: "ARCHIVE_STAMP"; caseId: CaseId; stamp: string }
  | {
      actionId: ActionId;
      kind: "MACHINE_CONTROL";
      controlId: string;
      value: number | boolean;
    }
  | {
      actionId: ActionId;
      kind: "ROUTE_COMMIT";
      caseId: CaseId;
      destinationId: DestinationId;
    };

export type DomainEvent =
  | { kind: "STAMP_APPLIED"; caseId: CaseId; stamp: string }
  | { kind: "CALLER_ANGERED"; caseId: CaseId }
  | { kind: "ROUTE_FAILED"; caseId: CaseId; destinationId: DestinationId };

export interface PublicShiftView {
  phase: Phase;
  revision: number;
  elapsedMs: number;
  queueLength: number;
  queuePressure: number;
  boilerPressure: number;
  auditRisk: number;
  activeCaseId: CaseId | null;
  publishedTags: string[];
  archivePins: string[];
  selectedDestination: DestinationId | null;
  colleagues: { role: Role; connected: boolean; ready: boolean }[];
}

export type RoleView =
  | {
      role: "agent";
      callerName: string | null;
      callerMood: number | null;
      dialogueOptions: string[];
    }
  | {
      role: "archivist";
      dossier: string | null;
      ruleText: string | null;
      activeRules: RuleId[];
    }
  | { role: "dispatcher"; machine: MachineState };

export interface PlayerViewState {
  public: PublicShiftView;
  role: RoleView;
  presentation: DomainEvent[];
}
