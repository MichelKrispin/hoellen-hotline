import type { CampaignPackage } from "../../content/schemas";
import {
  CONTENT_SCHEMA_VERSION,
  GAMEPLAY_HASH_VERSION,
} from "../../content/schemas";
import {
  caseContent,
  generateCase,
  validDestinations,
  type GeneratedCase,
} from "../cases/generate";
import {
  normalizeSeed,
  PRNG_VERSION,
  Random,
  SEED_NORMALIZATION_VERSION,
} from "../core/random";
import {
  evaluateDestination,
  machineCanRoute,
  type ControlValue,
} from "../rules/evaluate";
import type { ActionId, CaseId, PlayerId, SessionId } from "../core/ids";
import type { DomainEvent, GameState, Role } from "./contracts";

export const SIMULATION_VERSION = 1 as const;
export const TICK_MS = 100 as const;
const SHIFT_TICKS = 9_000; // 15 minutes at 100 ms per tick.
const COOLDOWN_TICKS = 30;

export interface StartConfig {
  sessionId: SessionId;
  hostPlayerId: PlayerId;
  scenarioId: string;
  players: { id: PlayerId; role: Role }[];
  shiftTicks?: number;
}

export interface SimCase extends Omit<
  GameState["cases"][number],
  "trueDestination"
> {
  generated: GeneratedCase;
  trueDestination: GameState["cases"][number]["trueDestination"];
  stamps: ("verified" | "questionable" | "reject")[];
  approvals: { agent: boolean; archivist: boolean; dispatcher: boolean };
  approvalLog: { role: Role; approved: boolean; tick: number }[];
  acceptedElapsedMs: number | null;
  resolvedElapsedMs: number | null;
  dialogueNode: string;
  discoveredTags: string[];
  suggestionUsed: boolean;
  prepared: boolean;
  incidentId: string | null;
  incidentRecovered: boolean;
  outcome: "correct" | "acceptable" | "wrong" | "catastrophic" | null;
}

export interface SimulationState extends GameState {
  cases: SimCase[];
  machine: {
    controls: Record<string, ControlValue>;
    availableDestinations: GameState["machine"]["availableDestinations"];
  };
  scenarioId: string;
  hostPlayerId: PlayerId;
  contentHash: string;
  shiftTicks: number;
  resolvedCount: number;
  escalationLevel: number;
  cooldownUntil: Record<string, number>;
  usedActionIds: string[];
  endReason:
    "completed" | "time" | "pressure" | "abandoned" | "disconnect" | null;
}

export type SimCommand =
  | { kind: "READY"; ready: boolean }
  | { kind: "START" }
  | { kind: "ACCEPT_CASE"; caseId: CaseId }
  | { kind: "DIALOGUE"; caseId: CaseId; choiceId: string }
  | { kind: "INTERRUPT"; caseId: CaseId }
  | {
      kind: "PUBLISH_TAG";
      caseId: CaseId;
      tagId: string;
      replaceIndex?: number;
    }
  | { kind: "SUGGEST_DESTINATION"; caseId: CaseId; destinationId: string }
  | {
      kind: "ARCHIVE_PIN";
      caseId: CaseId;
      recordId: string;
      replaceIndex?: number;
    }
  | { kind: "ARCHIVE_UNPIN"; caseId: CaseId; index: number }
  | {
      kind: "STAMP";
      caseId: CaseId;
      stamp: "verified" | "questionable" | "reject";
    }
  | { kind: "APPROVE"; caseId: CaseId; approved: boolean }
  | { kind: "SELECT_DESTINATION"; caseId: CaseId; destinationId: string }
  | {
      kind: "MACHINE_CONTROL";
      caseId: CaseId;
      controlId: string;
      value: ControlValue;
    }
  | { kind: "RECOVER_INCIDENT"; caseId: CaseId }
  | { kind: "PREPARE"; caseId: CaseId }
  | { kind: "ROUTE_COMMIT"; caseId: CaseId }
  | { kind: "PAUSE" }
  | { kind: "RESUME" }
  | { kind: "ABANDON" };

export type SystemInput =
  | { kind: "DISCONNECTED"; playerId: PlayerId }
  | { kind: "RECONNECTED"; playerId: PlayerId }
  | { kind: "DISCONNECT_EXPIRED" }
  | { kind: "HOST_LEFT" };

export type SimInput =
  | {
      type: "command";
      playerId: PlayerId;
      actionId: ActionId;
      command: SimCommand;
    }
  | { type: "system"; event: SystemInput };

export interface LogEntry {
  tick: number;
  order: number;
  input: SimInput;
}
export interface Replay {
  config: StartConfig;
  seed: string;
  seedNormalizationVersion: number;
  prngVersion: number;
  simulationVersion: number;
  contentSchemaVersion: number;
  gameplayHashVersion: number;
  contentHash: string;
  terminalTick: number;
  entries: LogEntry[];
}

export interface Transition {
  state: SimulationState;
  events: DomainEvent[];
  rejected?: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function updateEscalation(state: SimulationState): void {
  const highestPressure = Math.max(
    state.shift.queuePressure,
    state.shift.boilerPressure,
    state.shift.auditRisk,
  );
  state.escalationLevel = Math.min(
    3,
    Math.max(
      Math.floor(state.resolvedCount / 2),
      Math.floor(highestPressure / 25),
    ),
  );
}

function finishShift(
  state: SimulationState,
  reason: NonNullable<SimulationState["endReason"]>,
): void {
  state.phase = "results";
  state.endReason = reason;
  state.pause = null;
  for (const item of state.cases)
    if (item.status !== "resolved") item.status = "aborted";
}

function rolesValid(players: StartConfig["players"]): boolean {
  return (
    players.length === 3 &&
    new Set(players.map((p) => p.id)).size === 3 &&
    new Set(players.map((p) => p.role)).size === 3
  );
}

export function createSimulation(
  config: StartConfig,
  manualSeed: string,
  contentHash: string,
): SimulationState {
  if (
    !rolesValid(config.players) ||
    !config.players.some((player) => player.id === config.hostPlayerId)
  )
    throw new Error(
      "Exactly three distinct roles and players, including the host, required",
    );
  if (!/^[0-9a-f]{64}$/.test(contentHash))
    throw new Error("Invalid content hash");
  const shiftTicks = config.shiftTicks ?? SHIFT_TICKS;
  if (!Number.isSafeInteger(shiftTicks) || shiftTicks < 1)
    throw new Error("Invalid shift length");
  const seed = normalizeSeed(manualSeed);
  const players: SimulationState["players"] = {};
  for (const player of config.players)
    players[player.id] = { role: player.role, connected: true, ready: false };
  return {
    sessionId: config.sessionId,
    phase: "lobby",
    seed,
    rngState: new Random(seed).state,
    hostTick: 0,
    stateRevision: 0,
    players,
    shift: {
      elapsedMs: 0,
      currentWave: 0,
      queuePressure: 0,
      boilerPressure: 0,
      auditRisk: 0,
    },
    cases: [],
    activeRules: [],
    machine: { controls: {}, availableDestinations: [] },
    score: {
      resolvedCorrectly: 0,
      resolvedAcceptably: 0,
      resolvedIncorrectly: 0,
      catastrophicErrors: 0,
    },
    pause: null,
    scenarioId: config.scenarioId,
    hostPlayerId: config.hostPlayerId,
    contentHash,
    shiftTicks,
    resolvedCount: 0,
    escalationLevel: 0,
    cooldownUntil: {},
    usedActionIds: [],
    endReason: null,
  };
}

function endIfNeeded(state: SimulationState): void {
  if (state.phase !== "shift") return;
  const pressures = [
    state.shift.queuePressure,
    state.shift.boilerPressure,
    state.shift.auditRisk,
  ];
  if (pressures.filter((value) => value === 100).length >= 2)
    state.endReason = "pressure";
  else if (state.shift.elapsedMs >= state.shiftTicks * TICK_MS)
    state.endReason = "time";
  if (state.endReason) finishShift(state, state.endReason);
}

function spawnCase(
  state: SimulationState,
  packages: readonly CampaignPackage[],
): void {
  const content = caseContent(packages, state.scenarioId);
  const rng = new Random(state.rngState);
  const generated = generateCase(
    content,
    rng,
    state.resolvedCount,
    state.shift.queuePressure,
    state.activeRules,
  );
  state.rngState = rng.state;
  const archetype = content.archetypes.find(
    (item) => item.id === generated.archetypeId,
  )!;
  const dialogue = packages
    .flatMap((pkg) => pkg.packs)
    .flatMap((pack) => pack.dialogues)
    .find((item) => item.id === generated.dialogueId)!;
  const node = dialogue.nodes.find((item) => item.id === dialogue.start)!;
  const layout = content.layouts.find(
    (item) => item.id === generated.layoutId,
  )!;
  const incident = packages
    .flatMap((pkg) => pkg.packs)
    .flatMap((pack) => pack.incidents)
    .find(
      (entry) =>
        entry.id === content.scenario.allowedContent.incidents[0] &&
        entry.layout === layout.id,
    );
  const incidentActive = Boolean(incident) && state.cases.length % 2 === 0;
  state.cases.push({
    id: `${state.scenarioId}.case.${state.cases.length + 1}` as CaseId,
    status: "queued",
    callerName: archetype.nameKey,
    dialogueOptions: node.choices.map((choice) => choice.id),
    callerMood: 50,
    dossier: archetype.dossierKey,
    ruleText: state.activeRules.join(", "),
    trueDestination:
      generated.preferredDestination as SimCase["trueDestination"],
    publishedTags: [],
    suggestedDestination: null,
    archivePins: [],
    selectedDestination: null,
    generated,
    stamps: [],
    approvals: { agent: false, archivist: false, dispatcher: false },
    approvalLog: [],
    acceptedElapsedMs: null,
    resolvedElapsedMs: null,
    dialogueNode: dialogue.start,
    discoveredTags: [],
    suggestionUsed: false,
    prepared: false,
    incidentId: incidentActive ? incident!.id : null,
    incidentRecovered: !incidentActive,
    outcome: null,
  });
}

function fillQueue(
  state: SimulationState,
  packages: readonly CampaignPackage[],
): void {
  const limit = caseContent(packages, state.scenarioId).scenario.casePlan.count;
  while (
    state.cases.length < limit &&
    state.cases.filter((item) => item.status === "queued").length < 3
  )
    spawnCase(state, packages);
}

function prepareMachineForCase(
  state: SimulationState,
  item: SimCase,
  packages: readonly CampaignPackage[],
): void {
  const layout = caseContent(packages, state.scenarioId).layouts.find(
    (entry) => entry.id === item.generated.layoutId,
  )!;
  state.machine.controls = Object.fromEntries(
    layout.controls.map((control) => [control.id, control.values[0]!]),
  );
  state.machine.availableDestinations =
    layout.availableDestinations as GameState["machine"]["availableDestinations"];
  if (item.incidentId) {
    const incident = packages
      .flatMap((pkg) => pkg.packs)
      .flatMap((pack) => pack.incidents)
      .find((entry) => entry.id === item.incidentId)!;
    const control = layout.controls.find(
      (entry) => entry.id === incident.recovery.control,
    );
    const wrongValue = control?.values.find(
      (value) => value !== incident.recovery.equals,
    );
    if (wrongValue !== undefined)
      state.machine.controls[incident.recovery.control] = wrongValue;
  }
}

export function advanceToTick(
  source: SimulationState,
  target: number,
): SimulationState {
  if (!Number.isSafeInteger(target) || target < source.hostTick)
    throw new Error("Tick must be monotone");
  const state = structuredClone(source);
  while (state.hostTick < target) {
    state.hostTick++;
    state.stateRevision++;
    if (state.phase === "shift" && state.pause)
      for (const playerId of Object.keys(state.cooldownUntil))
        state.cooldownUntil[playerId]!++;
    if (state.phase === "shift" && !state.pause) {
      state.shift.elapsedMs += TICK_MS;
      if (
        state.hostTick % 50 === 0 &&
        state.cases.some((item) => item.status === "queued")
      )
        state.shift.queuePressure = clamp(state.shift.queuePressure + 1);
      updateEscalation(state);
      endIfNeeded(state);
    }
  }
  return state;
}

function activeCase(
  state: SimulationState,
  caseId: CaseId,
): SimCase | undefined {
  return state.cases.find(
    (item) =>
      item.id === caseId &&
      !["queued", "routing", "resolved", "aborted"].includes(item.status),
  );
}

function roleOf(state: SimulationState, playerId: PlayerId): Role | undefined {
  return state.players[playerId]?.role;
}

function setApproval(
  item: SimCase,
  role: Role,
  approved: boolean,
  tick: number,
): void {
  if (item.approvals[role] === approved) return;
  item.approvals[role] = approved;
  item.approvalLog.push({ role, approved, tick });
}

function resolve(
  state: SimulationState,
  item: SimCase,
  packages: readonly CampaignPackage[],
  events: DomainEvent[],
): void {
  const content = caseContent(packages, state.scenarioId);
  const destination = content.destinations.find(
    (entry) => entry.id === item.selectedDestination,
  )!;
  const layout = content.layouts.find(
    (entry) => entry.id === item.generated.layoutId,
  )!;
  const verdict = evaluateDestination(
    destination,
    content.rules.filter((rule) =>
      state.activeRules.includes(rule.id as never),
    ),
    content.exceptions.filter((exception) =>
      item.generated.exceptionIds.includes(exception.id),
    ),
    {
      tags: item.generated.tags,
      stamps: item.stamps,
      pressure: state.shift.queuePressure,
      caseCount: state.resolvedCount,
    },
  );
  const correct =
    verdict.valid &&
    machineCanRoute(destination, layout, state.machine.controls);
  item.status = "routing";
  if (correct) {
    item.outcome =
      item.selectedDestination === item.trueDestination
        ? "correct"
        : "acceptable";
    if (item.outcome === "correct") state.score.resolvedCorrectly++;
    else state.score.resolvedAcceptably++;
    state.shift.queuePressure = clamp(state.shift.queuePressure - 3);
  } else {
    item.outcome =
      verdict.reason === "conflict" ||
      !machineCanRoute(destination, layout, state.machine.controls)
        ? "catastrophic"
        : "wrong";
    state.score.resolvedIncorrectly++;
    if (item.outcome === "catastrophic") state.score.catastrophicErrors++;
    state.shift.boilerPressure = clamp(
      state.shift.boilerPressure + (item.outcome === "catastrophic" ? 25 : 10),
    );
    state.shift.auditRisk = clamp(
      state.shift.auditRisk + (item.outcome === "catastrophic" ? 25 : 10),
    );
    events.push({
      kind: "ROUTE_FAILED",
      caseId: item.id,
      destinationId: destination.id as never,
    });
  }
  item.status = "resolved";
  item.resolvedElapsedMs = state.shift.elapsedMs;
  state.resolvedCount++;
  state.shift.currentWave = Math.floor(state.resolvedCount / 2);
  updateEscalation(state);
  const scenario = content.scenario;
  for (const mutator of scenario.mutators)
    if (
      mutator.afterCase === state.resolvedCount &&
      !state.activeRules.includes(mutator.rule as never)
    )
      state.activeRules.push(mutator.rule as never);
  endIfNeeded(state);
  if (
    state.phase === "shift" &&
    state.resolvedCount >= scenario.victory.count
  ) {
    finishShift(state, "completed");
  } else if (state.phase === "shift") fillQueue(state, packages);
}

export function reduceInput(
  source: SimulationState,
  input: SimInput,
  packages: readonly CampaignPackage[],
): Transition {
  const state = structuredClone(source);
  const events: DomainEvent[] = [];
  const reject = (reason: string): Transition => ({
    state: source,
    events: [],
    rejected: reason,
  });
  if (input.type === "system") {
    const system = input.event;
    if (system.kind === "HOST_LEFT") {
      finishShift(state, "abandoned");
    } else if (system.kind === "DISCONNECT_EXPIRED") {
      if (state.pause?.reason !== "disconnect")
        return reject("No disconnect pause");
      finishShift(state, "disconnect");
    } else {
      const player = state.players[system.playerId];
      if (!player) return reject("Unknown player");
      player.connected = system.kind === "RECONNECTED";
      if (state.phase === "shift") {
        if (!player.connected)
          state.pause = { reason: "disconnect", resumePhase: "shift" };
        else if (
          state.pause?.reason === "disconnect" &&
          Object.values(state.players).every((entry) => entry.connected)
        )
          state.pause = null;
      }
    }
  } else {
    const { playerId, actionId, command } = input;
    const player = state.players[playerId];
    if (!player || !player.connected) return reject("Player is not connected");
    if (state.usedActionIds.includes(actionId))
      return reject("Duplicate action ID");
    const role = roleOf(state, playerId)!;
    if (command.kind === "READY") {
      if (state.phase !== "lobby") return reject("Not in lobby");
      player.ready = command.ready;
    } else if (command.kind === "START") {
      if (state.phase !== "lobby" || playerId !== state.hostPlayerId)
        return reject("Only lobby host may start");
      if (
        !Object.values(state.players).every(
          (entry) => entry.ready && entry.connected,
        )
      )
        return reject("Players not ready");
      const content = caseContent(packages, state.scenarioId);
      state.activeRules = content.scenario
        .startingRules as SimulationState["activeRules"];
      state.phase = "shift";
      fillQueue(state, packages);
    } else if (command.kind === "ABANDON") {
      if (playerId !== state.hostPlayerId || state.phase === "results")
        return reject("Cannot abandon");
      finishShift(state, "abandoned");
    } else if (command.kind === "PAUSE" || command.kind === "RESUME") {
      if (playerId !== state.hostPlayerId || state.phase !== "shift")
        return reject("Only host may pause");
      if (command.kind === "PAUSE") {
        if (state.pause) return reject("Already paused");
        state.pause = { reason: "host-menu", resumePhase: "shift" };
      } else {
        if (state.pause?.reason !== "host-menu") return reject("No menu pause");
        state.pause = null;
      }
    } else {
      if (state.phase !== "shift" || state.pause)
        return reject("Shift is not active");
      const item = activeCase(state, command.caseId);
      if (command.kind === "ACCEPT_CASE") {
        const queued = state.cases.find(
          (entry) => entry.id === command.caseId && entry.status === "queued",
        );
        if (
          role !== "agent" ||
          !queued ||
          queued !== state.cases.find((entry) => entry.status === "queued") ||
          state.cases.some((entry) => activeCase(state, entry.id))
        )
          return reject("Case cannot be accepted");
        const currentContent = caseContent(packages, state.scenarioId);
        const currentLayout = currentContent.layouts.find(
          (entry) => entry.id === queued.generated.layoutId,
        )!;
        const currentValidDestinations = validDestinations(
          currentContent,
          {
            tags: queued.generated.tags,
            stamps: queued.stamps,
            pressure: state.shift.queuePressure,
            caseCount: state.resolvedCount,
          },
          currentContent.exceptions.filter((entry) =>
            queued.generated.exceptionIds.includes(entry.id),
          ),
          currentLayout,
          state.activeRules,
        );
        if (currentValidDestinations.length === 0)
          return reject("Queued case has no valid destination");
        queued.generated.validDestinations = currentValidDestinations;
        if (
          !currentValidDestinations.includes(
            queued.generated.preferredDestination,
          )
        ) {
          queued.generated.preferredDestination = currentValidDestinations[0]!;
          queued.trueDestination =
            currentValidDestinations[0] as SimCase["trueDestination"];
        }
        queued.ruleText = state.activeRules.join(", ");
        queued.status = "active";
        queued.acceptedElapsedMs = state.shift.elapsedMs;
        prepareMachineForCase(state, queued, packages);
        const complaint = packages
          .flatMap((pkg) => pkg.packs)
          .flatMap((pack) => pack.complaints)
          .find((entry) => entry.id === queued.generated.complaintId);
        if (
          complaint?.hintTag &&
          queued.generated.tags.includes(complaint.hintTag)
        )
          queued.discoveredTags.push(complaint.hintTag);
      } else {
        if (!item) return reject("Stale or inactive case ID");
        const content = caseContent(packages, state.scenarioId);
        const layout = content.layouts.find(
          (entry) => entry.id === item.generated.layoutId,
        )!;
        switch (command.kind) {
          case "DIALOGUE": {
            if (role !== "agent") return reject("Wrong role");
            if (state.hostTick < (state.cooldownUntil[playerId] ?? 0))
              return reject("Cooldown active");
            const dialogue = packages
              .flatMap((pkg) => pkg.packs)
              .flatMap((pack) => pack.dialogues)
              .find((entry) => entry.id === item.generated.dialogueId)!;
            const node = dialogue.nodes.find(
              (entry) => entry.id === item.dialogueNode,
            )!;
            const choice = node.choices.find(
              (entry) => entry.id === command.choiceId,
            );
            if (!choice) return reject("Unknown dialogue choice");
            item.dialogueNode = choice.next;
            item.dialogueOptions = dialogue.nodes
              .find((entry) => entry.id === choice.next)!
              .choices.map((entry) => entry.id);
            item.callerMood = clamp(item.callerMood + (choice.moodDelta ?? 0));
            if (choice.moodDelta && choice.moodDelta < 0)
              events.push({ kind: "CALLER_ANGERED", caseId: item.id });
            if (
              choice.revealTag &&
              item.generated.tags.includes(choice.revealTag) &&
              !item.discoveredTags.includes(choice.revealTag)
            )
              item.discoveredTags.push(choice.revealTag);
            item.status = "investigating";
            state.cooldownUntil[playerId] = state.hostTick + COOLDOWN_TICKS;
            break;
          }
          case "INTERRUPT": {
            if (role !== "agent") return reject("Wrong role");
            if (state.hostTick < (state.cooldownUntil[playerId] ?? 0))
              return reject("Cooldown active");
            const dialogue = packages
              .flatMap((pkg) => pkg.packs)
              .flatMap((pack) => pack.dialogues)
              .find((entry) => entry.id === item.generated.dialogueId)!;
            const node = dialogue.nodes.find(
              (entry) => entry.id === item.dialogueNode,
            )!;
            if (node.choices.length === 0)
              return reject("Dialogue already ended");
            const queue = [node];
            const visited = new Set<string>();
            let exitNode: typeof node | undefined;
            while (queue.length) {
              const current = queue.shift()!;
              if (visited.has(current.id)) continue;
              visited.add(current.id);
              if (current.choices.length === 0) {
                exitNode = current;
                break;
              }
              for (const choice of current.choices) {
                const following = dialogue.nodes.find(
                  (entry) => entry.id === choice.next,
                );
                if (following) queue.push(following);
              }
            }
            if (!exitNode) return reject("No dialogue exit");
            item.dialogueNode = exitNode.id;
            item.dialogueOptions = [];
            item.callerMood = clamp(item.callerMood - 12);
            item.status = "investigating";
            state.cooldownUntil[playerId] = state.hostTick + 100;
            events.push({ kind: "CALLER_ANGERED", caseId: item.id });
            break;
          }
          case "PUBLISH_TAG":
            if (
              role !== "agent" ||
              !item.discoveredTags.includes(command.tagId)
            )
              return reject("Invalid agent tag");
            if (!item.publishedTags.includes(command.tagId)) {
              if (command.replaceIndex === undefined) {
                if (item.publishedTags.length >= 3)
                  return reject("Tag slots full");
                item.publishedTags.push(command.tagId);
              } else if (
                command.replaceIndex >= 0 &&
                command.replaceIndex < item.publishedTags.length
              )
                item.publishedTags[command.replaceIndex] = command.tagId;
              else return reject("Invalid tag slot");
            }
            item.status = "investigating";
            break;
          case "SUGGEST_DESTINATION":
            if (role !== "agent" || item.suggestionUsed)
              return reject("Destination suggestion unavailable");
            if (!layout.availableDestinations.includes(command.destinationId))
              return reject("Unavailable destination");
            item.suggestedDestination = command.destinationId as never;
            item.suggestionUsed = true;
            item.status = "investigating";
            break;
          case "ARCHIVE_PIN":
            if (
              role !== "archivist" ||
              !content.scenario.allowedContent.archetypes.includes(
                command.recordId,
              )
            )
              return reject("Invalid archive record");
            if (!item.archivePins.includes(command.recordId)) {
              if (command.replaceIndex === undefined) {
                if (item.archivePins.length >= 2)
                  return reject("Pin slots full");
                item.archivePins.push(command.recordId);
              } else if (
                command.replaceIndex >= 0 &&
                command.replaceIndex < item.archivePins.length
              )
                item.archivePins[command.replaceIndex] = command.recordId;
              else return reject("Invalid pin slot");
            }
            setApproval(item, "archivist", false, state.hostTick);
            item.status = "investigating";
            break;
          case "ARCHIVE_UNPIN":
            if (
              role !== "archivist" ||
              command.index < 0 ||
              command.index >= item.archivePins.length
            )
              return reject("Invalid pin slot");
            item.archivePins.splice(command.index, 1);
            setApproval(item, "archivist", false, state.hostTick);
            item.status = "investigating";
            break;
          case "STAMP":
            if (role !== "archivist") return reject("Wrong role");
            item.stamps = [command.stamp];
            setApproval(item, "archivist", false, state.hostTick);
            item.status = "investigating";
            events.push({
              kind: "STAMP_APPLIED",
              caseId: item.id,
              stamp: command.stamp,
            });
            break;
          case "SELECT_DESTINATION":
            if (
              role !== "dispatcher" ||
              !layout.availableDestinations.includes(command.destinationId) ||
              !content.scenario.allowedContent.destinations.includes(
                command.destinationId,
              )
            )
              return reject("Unavailable destination");
            item.selectedDestination = command.destinationId as never;
            for (const affected of [
              "agent",
              "archivist",
              "dispatcher",
            ] as const)
              setApproval(item, affected, false, state.hostTick);
            item.prepared = false;
            item.status = "investigating";
            break;
          case "MACHINE_CONTROL": {
            if (role !== "dispatcher") return reject("Wrong role");
            const control = layout.controls.find(
              (entry) => entry.id === command.controlId,
            );
            if (!control || !control.values.includes(command.value))
              return reject("Invalid machine value");
            state.machine.controls[command.controlId] = command.value;
            setApproval(item, "dispatcher", false, state.hostTick);
            item.prepared = false;
            item.status = "investigating";
            break;
          }
          case "RECOVER_INCIDENT": {
            if (
              role !== "dispatcher" ||
              !item.incidentId ||
              item.incidentRecovered
            )
              return reject("No active incident");
            const incident = packages
              .flatMap((pkg) => pkg.packs)
              .flatMap((pack) => pack.incidents)
              .find((entry) => entry.id === item.incidentId)!;
            if (
              state.machine.controls[incident.recovery.control] !==
              incident.recovery.equals
            )
              return reject("Incident recovery condition not met");
            item.incidentRecovered = true;
            item.prepared = false;
            break;
          }
          case "PREPARE": {
            if (role !== "dispatcher" || !item.selectedDestination)
              return reject("No destination selected");
            if (!item.incidentRecovered) return reject("Incident unresolved");
            const destination = content.destinations.find(
              (entry) => entry.id === item.selectedDestination,
            )!;
            if (!machineCanRoute(destination, layout, state.machine.controls))
              return reject("Machine requirements not met");
            item.prepared = true;
            break;
          }
          case "APPROVE":
            if (!item.selectedDestination)
              return reject("No destination selected");
            if (role === "dispatcher" && command.approved && !item.prepared)
              return reject("Machine not prepared");
            setApproval(item, role, command.approved, state.hostTick);
            item.status = Object.values(item.approvals).every(Boolean)
              ? "approved"
              : "investigating";
            break;
          case "ROUTE_COMMIT":
            if (
              role !== "dispatcher" ||
              item.status !== "approved" ||
              !item.selectedDestination ||
              !item.prepared ||
              !item.incidentRecovered ||
              !Object.values(item.approvals).every(Boolean)
            )
              return reject("Routing not approved");
            if (
              !machineCanRoute(
                content.destinations.find(
                  (entry) => entry.id === item.selectedDestination,
                )!,
                layout,
                state.machine.controls,
              )
            )
              return reject("Machine requirements changed");
            resolve(state, item, packages, events);
            break;
        }
      }
    }
    state.usedActionIds.push(actionId);
  }
  state.stateRevision++;
  return { state, events };
}

export function replaySimulation(
  replay: Replay,
  packages: readonly CampaignPackage[],
  expectedHash: string,
): SimulationState {
  if (
    replay.simulationVersion !== SIMULATION_VERSION ||
    replay.prngVersion !== PRNG_VERSION ||
    replay.seedNormalizationVersion !== SEED_NORMALIZATION_VERSION ||
    replay.contentSchemaVersion !== CONTENT_SCHEMA_VERSION ||
    replay.gameplayHashVersion !== GAMEPLAY_HASH_VERSION ||
    replay.contentHash !== expectedHash
  )
    throw new Error("Incompatible replay versions or content hash");
  let state = createSimulation(replay.config, replay.seed, expectedHash);
  let previousTick = -1;
  let previousOrder = -1;
  for (const entry of replay.entries) {
    if (
      !Number.isSafeInteger(entry.tick) ||
      entry.tick < 0 ||
      entry.tick > replay.terminalTick ||
      !Number.isSafeInteger(entry.order) ||
      entry.order < 0 ||
      entry.tick < previousTick ||
      (entry.tick === previousTick && entry.order <= previousOrder)
    )
      throw new Error("Replay entries must be ordered by tick and order");
    state = advanceToTick(state, entry.tick);
    const transition = reduceInput(state, entry.input, packages);
    if (transition.rejected)
      throw new Error(`Rejected replay input: ${transition.rejected}`);
    state = transition.state;
    previousTick = entry.tick;
    previousOrder = entry.order;
  }
  return advanceToTick(state, replay.terminalTick);
}

export function recordInput(
  source: SimulationState,
  entries: readonly LogEntry[],
  input: SimInput,
  packages: readonly CampaignPackage[],
): { transition: Transition; entries: LogEntry[] } {
  const transition = reduceInput(source, input, packages);
  if (transition.rejected) return { transition, entries: [...entries] };
  const last = entries[entries.length - 1];
  const order = last?.tick === source.hostTick ? last.order + 1 : 0;
  return {
    transition,
    entries: [...entries, { tick: source.hostTick, order, input }],
  };
}

export function createReplay(
  config: StartConfig,
  state: SimulationState,
  entries: readonly LogEntry[],
): Replay {
  return {
    config,
    seed: state.seed,
    seedNormalizationVersion: SEED_NORMALIZATION_VERSION,
    prngVersion: PRNG_VERSION,
    simulationVersion: SIMULATION_VERSION,
    contentSchemaVersion: CONTENT_SCHEMA_VERSION,
    gameplayHashVersion: GAMEPLAY_HASH_VERSION,
    contentHash: state.contentHash,
    terminalTick: state.hostTick,
    entries: [...entries],
  };
}

export function canonicalState(state: SimulationState): string {
  return JSON.stringify(state, (_key, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value))
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
    return value;
  });
}
