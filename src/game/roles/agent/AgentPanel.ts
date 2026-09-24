import Phaser from "phaser";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type { RoleView } from "../../state/contracts";
import { label, plate } from "../../presentation/art";
import { TOKENS } from "../../../ui/tokens";

type AgentView = Extract<RoleView, { role: "agent" }>;
const C = TOKENS.color;

function pressureLabel(value: number): string {
  if (value < 25) return "◇ Ruhig";
  if (value < 50) return "△ Dringend";
  if (value < 75) return "! Überlastet";
  return "!! Kritisch";
}

export class AgentPanel {
  private readonly caller: Phaser.GameObjects.Text;
  private readonly speech: Phaser.GameObjects.Text;
  private readonly mood: Phaser.GameObjects.Text;
  private readonly queue: Phaser.GameObjects.Text;
  private readonly accept: Phaser.GameObjects.Text;
  private readonly interrupt: Phaser.GameObjects.Text;
  private readonly choices: Phaser.GameObjects.Text[] = [];
  private readonly hints: Phaser.GameObjects.Text[] = [];
  private readonly discovered: Phaser.GameObjects.Text;
  private readonly suggestion: Phaser.GameObjects.Text;
  private readonly suggestionAction: Phaser.GameObjects.Text;
  private readonly approval: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private readonly handset: Phaser.GameObjects.Graphics;
  private readonly face: Phaser.GameObjects.Graphics;
  private readonly mirror = document.createElement("section");
  private readonly mirrorChoices: HTMLButtonElement[] = [];
  private readonly mirrorHints: HTMLButtonElement[] = [];
  private readonly tagSelect = document.createElement("select");
  private readonly destinationSelect = document.createElement("select");
  private readonly acceptButton = document.createElement("button");
  private readonly interruptButton = document.createElement("button");
  private readonly suggestButton = document.createElement("button");
  private readonly approvalButton = document.createElement("button");
  private readonly mirrorStatus = document.createElement("p");
  private readonly unsubscribe: () => void;
  private selectedTag: string | null = null;
  private selectedDestination: string | null = null;
  private pendingUntil = 0;
  private lastCommand = "";
  private localFeedback = "";
  private readonly keydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (
      event.target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)
    )
      return;
    const index = Number(event.key) - 1;
    if (index >= 0 && index < 5) this.choose(index);
    else if (event.key.toLowerCase() === "a") this.acceptCase();
    else if (event.key.toLowerCase() === "i") this.interruptCall();
    else return;
    event.preventDefault();
  };
  private readonly outsidePointer = (event: PointerEvent): void => {
    if (event.target instanceof Node && !this.mirror.contains(event.target))
      delete this.mirror.dataset.open;
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly network: GameNetwork,
  ) {
    this.caller = label(scene, 817, 416, "Noch kein Anruf", 35, C.text, 515);
    this.speech = label(scene, 817, 466, "Leitung frei.", 27, "#91eafa", 510);
    this.mood = label(scene, 122, 843, "Stimmung: –", 22);
    this.queue = label(scene, 1450, 405, "◇ Ruhig", 22, C.ink);
    this.accept = label(scene, 151, 779, "☎   ANNEHMEN (A)", 27);
    this.accept
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.acceptCase());
    this.interrupt = label(scene, 122, 888, "↯ UNTERBRECHEN (I)", 23);
    this.interrupt
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.interruptCall());
    for (let i = 0; i < 5; i++) {
      const y = 563 + i * 55;
      plate(scene, 541, y, 790, 49, C.paper, 0x9d7155, 8);
      const choice = label(scene, 568, y + 8, "", 24, C.ink, 735);
      scene.add
        .zone(541, y, 790, 49)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.choose(i));
      this.choices.push(choice);
    }
    for (let i = 0; i < 3; i++) {
      const hint = label(
        scene,
        1450,
        446 + i * 83,
        `◇  HINWEIS ${i + 1}`,
        24,
        C.ink,
        300,
      );
      hint
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.publish(i));
      this.hints.push(hint);
    }
    this.discovered = label(
      scene,
      1450,
      694,
      "Entdeckte Hinweise: –",
      21,
      C.ink,
      300,
    );
    this.discovered
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleTag());
    this.suggestion = label(scene, 546, 884, "→ Zielbitte: –", 25, C.text, 755);
    this.suggestion
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleDestination());
    this.suggestionAction = label(scene, 1152, 884, "BITTE SENDEN", 24, C.text);
    this.suggestionAction
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.sendSuggestion());
    this.approval = label(scene, 1450, 749, "◇ Freigabe offen", 22, C.ink, 310);
    this.approval
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleApproval());
    this.feedback = label(scene, 1020, 944, "", 22, C.text, 320);
    this.handset = scene.add.graphics();
    this.face = scene.add.graphics();
    this.setupMirror();
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("pointerdown", this.outsidePointer);
    this.unsubscribe = network.subscribe(() => this.render());
  }

  private setupMirror(): void {
    this.mirror.className = "agent-accessible-controls";
    this.mirror.setAttribute("aria-label", "Agentenpult und Tastatursteuerung");
    this.mirror.addEventListener("focusin", () => {
      this.mirror.dataset.open = "true";
    });
    this.mirrorStatus.setAttribute("role", "status");
    this.acceptButton.textContent = "Anruf annehmen";
    this.acceptButton.onclick = () => this.acceptCase();
    this.mirror.append(this.acceptButton);
    for (let i = 0; i < 5; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.choose(i);
      this.mirrorChoices.push(button);
      this.mirror.append(button);
    }
    this.interruptButton.textContent = "Anrufer unterbrechen";
    this.interruptButton.onclick = () => this.interruptCall();
    this.mirror.append(this.interruptButton);
    const tagLabel = document.createElement("label");
    tagLabel.textContent = "Entdeckten Hinweis wählen ";
    tagLabel.append(this.tagSelect);
    this.tagSelect.onchange = () => {
      this.selectedTag = this.tagSelect.value;
      this.render();
    };
    this.mirror.append(tagLabel);
    for (let i = 0; i < 3; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.publish(i);
      this.mirrorHints.push(button);
      this.mirror.append(button);
    }
    const destinationLabel = document.createElement("label");
    destinationLabel.textContent = "Zielbereich für Bitte wählen ";
    destinationLabel.append(this.destinationSelect);
    this.destinationSelect.onchange = () => {
      this.selectedDestination = this.destinationSelect.value;
      this.render();
    };
    this.mirror.append(destinationLabel);
    this.suggestButton.textContent = "Zielbitte an Disponent senden";
    this.suggestButton.onclick = () => this.sendSuggestion();
    this.approvalButton.onclick = () => this.toggleApproval();
    this.mirror.append(
      this.suggestButton,
      this.approvalButton,
      this.mirrorStatus,
    );
    document.body.append(this.mirror);
  }

  private current(): AgentView | null {
    const role = this.network.view?.role;
    return role?.role === "agent" ? role : null;
  }
  private caseId(): CaseId | null {
    return this.network.view?.public.activeCaseId ?? null;
  }
  private submit(command: Parameters<GameNetwork["submit"]>[0]): void {
    const key = JSON.stringify(command);
    if (key === this.lastCommand && performance.now() < this.pendingUntil)
      return;
    const error = this.network.submit(command);
    this.localFeedback = error ?? "Aktion gesendet.";
    if (!error) {
      this.lastCommand = key;
      this.pendingUntil = performance.now() + 450;
    }
    this.render();
  }
  private acceptCase(): void {
    const id = this.current()?.incomingCaseId;
    if (id) this.submit({ kind: "ACCEPT_CASE", caseId: id });
  }
  private choose(index: number): void {
    const id = this.caseId();
    const choiceId = this.current()?.dialogueOptions[index];
    if (id && choiceId && !this.current()?.cooldownMs)
      this.submit({ kind: "DIALOGUE", caseId: id, choiceId });
  }
  private interruptCall(): void {
    const id = this.caseId();
    if (
      id &&
      this.current()?.dialogueOptions.length &&
      !this.current()?.cooldownMs
    )
      this.submit({ kind: "INTERRUPT", caseId: id });
  }
  private cycleTag(): void {
    const tags = this.current()?.discoveredTags ?? [];
    if (tags.length === 0) return;
    this.selectedTag =
      tags[(tags.indexOf(this.selectedTag ?? "") + 1) % tags.length]!;
    this.tagSelect.value = this.selectedTag;
    this.render();
  }
  private publish(slot: number): void {
    const id = this.caseId();
    const tagId = this.selectedTag;
    if (!id || !tagId) return;
    const published = this.network.view?.public.publishedTags ?? [];
    if (published.includes(tagId)) return;
    if (slot > published.length) return;
    this.submit({
      kind: "PUBLISH_TAG",
      caseId: id,
      tagId,
      ...(slot < published.length ? { replaceIndex: slot } : {}),
    });
  }
  private sendSuggestion(): void {
    const id = this.caseId();
    const destinationId = this.selectedDestination;
    if (id && destinationId && !this.network.view?.public.suggestedDestination)
      this.submit({ kind: "SUGGEST_DESTINATION", caseId: id, destinationId });
  }
  private cycleDestination(): void {
    const options = this.current()?.suggestableDestinations ?? [];
    if (!options.length || this.network.view?.public.suggestedDestination)
      return;
    this.selectedDestination =
      options[
        (options.findIndex((item) => item.id === this.selectedDestination) +
          1) %
          options.length
      ]!.id;
    this.destinationSelect.value = this.selectedDestination;
    this.render();
  }
  private toggleApproval(): void {
    const id = this.caseId();
    const view = this.network.view?.public;
    if (id && view?.selectedDestination)
      this.submit({
        kind: "APPROVE",
        caseId: id,
        approved: !view.approvals.agent,
      });
  }
  private syncOptions(
    select: HTMLSelectElement,
    options: { id: string; name: string }[],
    selected: string | null,
  ): string | null {
    const signature = JSON.stringify(options);
    if (select.dataset.signature !== signature) {
      select.replaceChildren(
        ...options.map(({ id, name }) => {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = name;
          return option;
        }),
      );
      select.dataset.signature = signature;
    }
    const next = options.some((option) => option.id === selected)
      ? selected
      : (options[0]?.id ?? null);
    if (next) select.value = next;
    return next;
  }
  private render(): void {
    const view = this.network.view;
    const role = this.current();
    if (!role || !view) return;
    const active = Boolean(view.public.activeCaseId);
    this.caller.setText(
      role.callerName ?? role.incomingCallerName ?? "Noch kein Anruf",
    );
    this.speech.setText(
      role.dialogueText ??
        (role.incomingCaseId
          ? "Ein Anruf wartet in der Leitung."
          : "Leitung frei."),
    );
    this.mood.setText(
      `Stimmung: ${role.callerMood === null ? "–" : role.callerMood >= 70 ? "☺ ruhig" : role.callerMood >= 40 ? "◇ angespannt" : "! gereizt"}`,
    );
    this.queue.setText(`Queue: ${pressureLabel(view.public.queuePressure)}`);
    this.accept.setText(active ? "● LEITUNG AKTIV" : "☎ ANNEHMEN (A)");
    this.accept.setAlpha(role.incomingCaseId || active ? 1 : 0.45);
    this.acceptButton.disabled = !role.incomingCaseId;
    for (let i = 0; i < 5; i++) {
      const choiceId = role.dialogueOptions[i];
      const text = choiceId
        ? `${i + 1}  ${role.dialogueLabels[choiceId] ?? choiceId}`
        : "";
      this.choices[i]!.setText(text);
      this.mirrorChoices[i]!.textContent =
        text || `Antwort ${i + 1} nicht verfügbar`;
      this.mirrorChoices[i]!.disabled = !choiceId || role.cooldownMs > 0;
    }
    this.interrupt.setText(
      `↯ UNTERBRECHEN (I)${role.cooldownMs ? ` · ${Math.ceil(role.cooldownMs / 1000)} s` : ""}`,
    );
    this.interrupt.setAlpha(
      active && role.dialogueOptions.length && !role.cooldownMs ? 1 : 0.45,
    );
    this.interruptButton.disabled =
      !active || !role.dialogueOptions.length || role.cooldownMs > 0;
    this.selectedTag = this.syncOptions(
      this.tagSelect,
      role.discoveredTags.map((id) => ({ id, name: role.tagLabels[id] ?? id })),
      this.selectedTag,
    );
    this.tagSelect.disabled = role.discoveredTags.length === 0;
    this.discovered.setText(
      `Entdeckt: ${this.selectedTag ? (role.tagLabels[this.selectedTag] ?? this.selectedTag) : "–"}  ↻`,
    );
    for (let i = 0; i < 3; i++) {
      const tag = view.public.publishedTags[i];
      this.hints[i]!.setText(
        `◇  ${tag ? (role.tagLabels[tag] ?? tag) : `Hinweis ${i + 1} frei`}`,
      );
      this.mirrorHints[i]!.textContent =
        `${tag ? "Hinweis ersetzen" : "Hinweis veröffentlichen"}, Slot ${i + 1}: ${tag ? (role.tagLabels[tag] ?? tag) : "frei"}`;
      this.mirrorHints[i]!.disabled =
        !active || !this.selectedTag || i > view.public.publishedTags.length;
    }
    this.selectedDestination = this.syncOptions(
      this.destinationSelect,
      role.suggestableDestinations,
      this.selectedDestination,
    );
    const suggested = view.public.suggestedDestination;
    const selectedName = role.suggestableDestinations.find(
      (item) => item.id === this.selectedDestination,
    )?.name;
    this.suggestion.setText(
      suggested
        ? `→ Zielbitte gesendet: ${role.suggestableDestinations.find((item) => item.id === suggested)?.name ?? suggested}`
        : `→ Zielbitte: ${selectedName ?? "–"}  ↻`,
    );
    this.suggestButton.disabled =
      !active || !this.selectedDestination || Boolean(suggested);
    this.suggestionAction.setAlpha(this.suggestButton.disabled ? 0.45 : 1);
    this.destinationSelect.disabled = this.suggestButton.disabled;
    const approvalName =
      role.suggestableDestinations.find(
        (item) => item.id === view.public.selectedDestination,
      )?.name ?? view.public.selectedDestination;
    this.approval.setText(
      view.public.selectedDestination
        ? `${view.public.approvals.agent ? "✓ Freigegeben" : "◇ Freigeben"}: ${approvalName}`
        : "◇ Freigabe: Ziel fehlt",
    );
    this.approval.setAlpha(view.public.selectedDestination ? 1 : 0.5);
    this.approvalButton.textContent = view.public.approvals.agent
      ? "Freigabe widerrufen"
      : "Ausgewähltes Ziel freigeben";
    this.approvalButton.disabled = !active || !view.public.selectedDestination;
    this.feedback.setText(this.network.error || this.localFeedback);
    this.mirrorStatus.textContent = `${role.callerName ?? role.incomingCallerName ?? "Kein Anruf"}. ${role.dialogueText ?? ""} Queue ${pressureLabel(view.public.queuePressure)}. Freigabe ${view.public.approvals.agent ? "erteilt" : "offen"}. ${this.network.error || this.localFeedback}`;
    const worm = role.callerMood !== null && role.callerMood < 45;
    this.face.clear();
    if (role.callerMood !== null) {
      this.face
        .lineStyle(5, 0x122b37)
        .beginPath()
        .moveTo(681, 443)
        .lineTo(697, role.callerMood < 45 ? 438 : 452)
        .lineTo(713, 443)
        .strokePath();
    }
    this.handset.clear();
    if (worm) {
      const offset = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 0
        : Math.sin(sceneTime(this.scene) / 170) * 10;
      this.handset
        .lineStyle(12, C.agent)
        .beginPath()
        .moveTo(355, 674)
        .lineTo(384 + offset, 641)
        .lineTo(405 - offset, 664)
        .strokePath();
      this.handset.fillStyle(C.fire).fillCircle(405 - offset, 664, 8);
    }
  }
  destroy(): void {
    this.unsubscribe();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("pointerdown", this.outsidePointer);
    this.mirror.remove();
  }
}

function sceneTime(scene: Phaser.Scene): number {
  return scene.time.now;
}
