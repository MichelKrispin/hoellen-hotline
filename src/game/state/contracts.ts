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
  suggestedDestination: DestinationId | null;
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
  pauseReason: "host-menu" | "disconnect" | null;
  queueLength: number;
  queuePressure: number;
  boilerPressure: number;
  auditRisk: number;
  activeCaseId: CaseId | null;
  publishedTags: string[];
  suggestedDestination: DestinationId | null;
  archivePins: string[];
  selectedDestination: DestinationId | null;
  colleagues: {
    role: Role;
    activity: "sucht" | "spricht" | "bereitet vor" | "bereit" | "getrennt";
  }[];
  approvals: { agent: boolean; archivist: boolean; dispatcher: boolean };
  approvalLog: { role: Role; approved: boolean; tick: number }[];
  modifiers: {
    ruleId: RuleId;
    text: string;
    state: "announced" | "active";
  }[];
  tutorial: null | {
    stage: "stations" | "practice";
    stations: Record<Role, boolean>;
  };
  lastReaction: null | {
    caseId: CaseId;
    assetId: string;
    caption: string;
  };
  report: null | {
    seed: string;
    contentHash: string;
    endReason: string;
    elapsedMs: number;
    averageCaseMs: number;
    score: ScoreState;
    cases: {
      id: CaseId;
      outcome: "correct" | "acceptable" | "wrong" | "catastrophic" | null;
      selectedDestination: DestinationId | null;
      trueDestination: DestinationId;
    }[];
  };
}

export interface ArchiveRecordView {
  id: string;
  name: string;
  aliases: string[];
  occupation: string;
  events: string[];
  warnings: string[];
  dossier: string;
  tags: string[];
  complaints: string[];
}

export interface RuleEntryView {
  id: string;
  kind: "rule" | "exception";
  text: string;
  destination: string;
  priority: number;
  active: boolean;
  overrides: string | null;
}

export interface MachineControlView {
  id: string;
  label: string;
  kind: "toggle" | "dial" | "selector";
  values: (string | number | boolean)[];
  value: string | number | boolean;
}

export interface DestinationView {
  id: DestinationId;
  name: string;
  description: string;
  kind: "standard" | "special";
  glyph: string;
  requirements: {
    controlId: string;
    label: string;
    value: string | number | boolean;
  }[];
}

export type RoleView =
  | {
      role: "agent";
      callerName: string | null;
      callerPortrait: string | null;
      callerMood: number | null;
      dialogueOptions: string[];
      dialogueText: string | null;
      dialogueLabels: Record<string, string>;
      incomingCaseId: CaseId | null;
      incomingCallerName: string | null;
      incomingCallerPortrait: string | null;
      discoveredTags: string[];
      tagLabels: Record<string, string>;
      cooldownMs: number;
      suggestableDestinations: { id: DestinationId; name: string }[];
    }
  | {
      role: "archivist";
      dossier: string | null;
      ruleText: string | null;
      activeRules: RuleId[];
      archiveRecords: ArchiveRecordView[];
      ruleEntries: RuleEntryView[];
      tagLabels: Record<string, string>;
      stamp: "verified" | "questionable" | "reject" | null;
    }
  | {
      role: "dispatcher";
      machine: MachineState;
      controls: MachineControlView[];
      destinations: DestinationView[];
      incident: {
        id: string;
        name: string;
        diagnosis: string;
        reactionAssetId: string;
        reactionCaption: string;
        recoveryControlId: string;
        recoveryValue: string | number | boolean;
      } | null;
      prepared: boolean;
      lastOutcome: {
        caseId: CaseId;
        outcome: "correct" | "acceptable" | "wrong" | "catastrophic";
      } | null;
    };

export interface PlayerViewState {
  public: PublicShiftView;
  role: RoleView;
  presentation: DomainEvent[];
}
