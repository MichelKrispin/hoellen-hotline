import Phaser from "phaser";
import { textureFor } from "../../../assets/registry";
import { placeholder } from "../../../assets/placeholders";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type { RoleView } from "../../state/contracts";
import { fitText, label, plate } from "../../presentation/art";
import { TOKENS } from "../../../ui/tokens";
import { prefersReducedMotion } from "../../../app/options";

type AgentView = Extract<RoleView, { role: "agent" }>;
const C = TOKENS.color;

function pressureLabel(value: number): string {
  if (value < 25) return "◇ Ruhig";
  if (value < 50) return "△ Dringend";
  if (value < 75) return "! Überlastet";
  return "!! Kritisch";
}

export class AgentPanel {
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly callerSprite: Phaser.GameObjects.Image;
  private readonly caller: Phaser.GameObjects.Text;
  private readonly callerCase: Phaser.GameObjects.Text;
  private readonly speech: Phaser.GameObjects.Text;
  private readonly mood: Phaser.GameObjects.Text;
  private readonly queue: Phaser.GameObjects.Text;
  private readonly accept: Phaser.GameObjects.Text;
  private readonly interrupt: Phaser.GameObjects.Text;
  private readonly choices: Phaser.GameObjects.Text[] = [];
  private readonly choicePlates: Phaser.GameObjects.NineSlice[] = [];
  private readonly hints: Phaser.GameObjects.Text[] = [];
  private readonly discovered: Phaser.GameObjects.Text;
  private readonly suggestion: Phaser.GameObjects.Text;
  private readonly suggestionAction: Phaser.GameObjects.Text;
  private readonly approval: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private readonly handset: Phaser.GameObjects.Image;
  private readonly face: Phaser.GameObjects.Image;
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
    if (event.target instanceof Node && !this.mirror.contains(event.target)) {
      delete this.mirror.dataset.open;
      if (
        document.activeElement instanceof HTMLElement &&
        this.mirror.contains(document.activeElement)
      )
        document.activeElement.blur();
    }
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly network: GameNetwork,
  ) {
    this.callerSprite = scene.add
      .image(703, 446, "agent-caller")
      .setDisplaySize(152, 163);
    const initialPortrait = textureFor(scene, "asset.core.portrait.clerk");
    this.portrait = scene.add.image(
      703,
      446,
      initialPortrait.key,
      initialPortrait.frame,
    );
    this.portrait.setDisplaySize(152, 163).setVisible(false);
    this.caller = label(scene, 817, 416, "Noch kein Anruf", 35, C.text, 515);
    this.callerCase = label(scene, 837, 500, "FALL  —", 19, C.ink, 305);
    this.speech = label(scene, 817, 466, "Leitung frei.", 27, "#91eafa", 510);
    this.mood = label(scene, 130, 923, "STIMMUNG  —", 21, "#ffc69c");
    this.queue = label(scene, 1428, 938, "◇ Ruhig", 24);
    this.accept = label(scene, 151, 779, "☎   ANNEHMEN (A)", 27).setFontFamily(
      '"Trebuchet MS", "DejaVu Sans", sans-serif',
    );
    scene.add
      .zone(119, 759, 346, 72)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.acceptCase());
    this.accept
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.acceptCase());
    this.interrupt = label(
      scene,
      135,
      852,
      "↯ UNTERBRECHEN (I)",
      22,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    scene.add
      .zone(119, 840, 346, 62)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.interruptCall());
    this.interrupt
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.interruptCall());
    for (let i = 0; i < 5; i++) {
      const y = 582 + i * 48;
      const card = plate(scene, 541, y, 790, 42, C.paper, 0x9d7155, 8);
      this.choicePlates.push(card);
      const choice = label(scene, 568, y + 6, "", 23, C.ink, 735).setFontFamily(
        '"Trebuchet MS", "DejaVu Sans", sans-serif',
      );
      scene.add
        .zone(541, y, 790, 42)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.choose(i));
      this.choices.push(choice);
    }
    plate(scene, 527, 844, 835, 150, C.wood);
    label(scene, 548, 856, "ZIELBITTE  /  DISPOSITION", 20, "#ffc69c");
    plate(scene, 543, 901, 581, 55, C.paper);
    plate(scene, 1135, 901, 207, 55, C.bakelite);
    for (let i = 0; i < 3; i++) {
      const hint = label(
        scene,
        1450,
        446 + i * 82,
        `◇  HINWEIS ${i + 1}`,
        24,
        C.ink,
        300,
      ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
      hint
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.publish(i));
      this.hints.push(hint);
    }
    this.discovered = label(
      scene,
      1450,
      697,
      "Entdeckte Hinweise: –",
      21,
      C.ink,
      300,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    this.discovered
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleTag());
    this.suggestion = label(
      scene,
      558,
      912,
      "→ Zielbitte: –",
      23,
      C.ink,
      550,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    this.suggestion
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleDestination());
    this.suggestionAction = label(
      scene,
      1151,
      913,
      "BITTE SENDEN",
      22,
      C.text,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    scene.add
      .zone(1135, 901, 207, 55)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.sendSuggestion());
    this.suggestionAction
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.sendSuggestion());
    this.approval = label(
      scene,
      1450,
      777,
      "◇ Freigabe offen",
      22,
      C.ink,
      310,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    this.approval
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleApproval());
    this.feedback = label(scene, 559, 965, "", 18, C.text, 740);
    this.handset = placeholder(scene, "handset", 350, 636, 80, 45).setVisible(
      false,
    );
    this.face = placeholder(scene, "soul-mouth", 674, 436, 46, 23).setVisible(
      false,
    );
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
    fitText(
      this.caller,
      role.callerName ?? role.incomingCallerName ?? "Noch kein Anruf",
      515,
      42,
      35,
      22,
    );
    fitText(
      this.callerCase,
      `FALL  ${view.public.activeCaseId?.split(".").at(-1) ?? role.incomingCaseId?.split(".").at(-1) ?? "—"}`,
      305,
      26,
      19,
      16,
    );
    fitText(
      this.speech,
      role.dialogueText ??
        (role.incomingCaseId
          ? "Ein Anruf wartet in der Leitung."
          : "Leitung frei."),
      510,
      72,
      27,
      19,
    );
    this.mood.setText(
      `STIMMUNG  ${role.callerMood === null ? "—" : role.callerMood >= 70 ? "☺ ruhig" : role.callerMood >= 40 ? "◇ angespannt" : "! gereizt"}`,
    );
    fitText(
      this.queue,
      pressureLabel(view.public.queuePressure),
      300,
      30,
      24,
      18,
    );
    this.accept.setText(active ? "● LEITUNG AKTIV" : "☎ ANNEHMEN (A)");
    this.accept.setAlpha(role.incomingCaseId || active ? 1 : 0.45);
    this.acceptButton.disabled = !role.incomingCaseId;
    for (let i = 0; i < 5; i++) {
      const choiceId = role.dialogueOptions[i];
      const text = choiceId
        ? `${i + 1}  ${role.dialogueLabels[choiceId] ?? choiceId}`
        : "";
      fitText(this.choices[i]!, text, 735, 31, 23, 17);
      this.choicePlates[i]!.setAlpha(choiceId && !role.cooldownMs ? 1 : 0.56);
      this.mirrorChoices[i]!.textContent =
        text || `Antwort ${i + 1} nicht verfügbar`;
      this.mirrorChoices[i]!.disabled = !choiceId || role.cooldownMs > 0;
    }
    fitText(
      this.interrupt,
      `↯ UNTERBRECHEN (I)${role.cooldownMs ? ` · ${Math.ceil(role.cooldownMs / 1000)} s` : ""}`,
      310,
      32,
      22,
      18,
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
    fitText(
      this.discovered,
      `Entdeckt: ${this.selectedTag ? (role.tagLabels[this.selectedTag] ?? this.selectedTag) : "–"}  ↻`,
      300,
      46,
      21,
    );
    for (let i = 0; i < 3; i++) {
      const tag = view.public.publishedTags[i];
      fitText(
        this.hints[i]!,
        `◇  ${tag ? (role.tagLabels[tag] ?? tag) : `Hinweis ${i + 1} frei`}`,
        300,
        54,
        24,
        17,
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
    fitText(
      this.suggestion,
      suggested
        ? `→ Zielbitte gesendet: ${role.suggestableDestinations.find((item) => item.id === suggested)?.name ?? suggested}`
        : `→ Zielbitte: ${selectedName ?? "–"}  ↻`,
      550,
      38,
      23,
      18,
    );
    this.suggestButton.disabled =
      !active || !this.selectedDestination || Boolean(suggested);
    this.suggestionAction.setAlpha(this.suggestButton.disabled ? 0.45 : 1);
    this.destinationSelect.disabled = this.suggestButton.disabled;
    const approvalName =
      role.suggestableDestinations.find(
        (item) => item.id === view.public.selectedDestination,
      )?.name ?? view.public.selectedDestination;
    fitText(
      this.approval,
      view.public.selectedDestination
        ? `${view.public.approvals.agent ? "✓ Freigegeben" : "◇ Freigeben"}: ${approvalName}`
        : "◇ Freigabe: Ziel fehlt",
      310,
      48,
      22,
      17,
    );
    this.approval.setAlpha(view.public.selectedDestination ? 1 : 0.5);
    this.approvalButton.textContent = view.public.approvals.agent
      ? "Freigabe widerrufen"
      : "Ausgewähltes Ziel freigeben";
    this.approvalButton.disabled = !active || !view.public.selectedDestination;
    fitText(
      this.feedback,
      this.network.error || this.localFeedback,
      740,
      28,
      18,
      16,
    );
    const accessibleStatus = `${role.callerName ?? role.incomingCallerName ?? "Kein Anruf"}. ${role.dialogueText ?? ""} Queue ${pressureLabel(view.public.queuePressure)}. Freigabe ${view.public.approvals.agent ? "erteilt" : "offen"}. ${this.network.error || this.localFeedback}`;
    if (this.mirrorStatus.textContent !== accessibleStatus)
      this.mirrorStatus.textContent = accessibleStatus;
    const worm = role.callerMood !== null && role.callerMood < 45;
    const portraitId = role.callerPortrait ?? role.incomingCallerPortrait;
    const portrait = textureFor(this.scene, portraitId ?? "");
    const hasPortrait = Boolean(portraitId && !portrait.missing);
    if (portraitId) this.portrait.setTexture(portrait.key, portrait.frame);
    this.portrait.setVisible(Boolean(portraitId));
    this.callerSprite.setVisible(!portraitId);
    this.mirror.dataset.portraitLoaded = String(hasPortrait);
    this.mirror.dataset.missingAsset =
      portraitId && portrait.missing ? portraitId : "";
    this.face.setVisible(role.callerMood !== null && !hasPortrait);
    this.face.setFlipY((role.callerMood ?? 50) < 45);
    this.handset.setVisible(Boolean(worm));
    if (worm) {
      const offset = prefersReducedMotion()
        ? 0
        : Math.sin(sceneTime(this.scene) / 170) * 10;
      this.handset.setX(350 + offset);
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
