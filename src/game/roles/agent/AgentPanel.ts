import Phaser from "phaser";
import { isolateCanvasInput } from "../../../ui/canvasInput";
import { textureFor } from "../../../assets/registry";
import { roleSprite } from "../../../assets/roleSprites";
import { workspaceSprite } from "../../../assets/workspaceSprites";
import { AGENT_LAYOUT } from "../../presentation/workspaceLayout";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type { RoleView } from "../../state/contracts";
import { fitText, label } from "../../presentation/art";
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
  private readonly occupation: Phaser.GameObjects.Text;
  private readonly event: Phaser.GameObjects.Text;
  private readonly speech: Phaser.GameObjects.Text;
  private readonly replyPreview: Phaser.GameObjects.Text;
  private readonly mood: Phaser.GameObjects.Text;
  private readonly queue: Phaser.GameObjects.Text;
  private readonly accept: Phaser.GameObjects.Text;
  private readonly interrupt: Phaser.GameObjects.Text;
  private readonly choices: Phaser.GameObjects.Text[] = [];
  private readonly choicePlates: (
    Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice
  )[] = [];
  private readonly choiceNumbers: Phaser.GameObjects.Rectangle[] = [];
  private readonly hints: Phaser.GameObjects.Text[] = [];
  private readonly privateHints: Phaser.GameObjects.Text[] = [];
  private readonly publishedTags: (string | undefined)[] = [];
  private readonly discovered: Phaser.GameObjects.Text;
  private readonly suggestion: Phaser.GameObjects.Text;
  private readonly suggestionAction: Phaser.GameObjects.Text;
  private readonly approval: Phaser.GameObjects.Text;
  private readonly archiveStatus: Phaser.GameObjects.Text;
  private readonly dispatchStatus: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private readonly face: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly operator: Phaser.GameObjects.Image | null;
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
  private readonly mirrorTranscript = document.createElement("ol");
  private readonly unsubscribe: () => void;
  private transcriptCase: CaseId | null = null;
  private lastDialogueText: string | null = null;
  private lastReply = "";
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
    this.operator = scene.children.getByName(
      "agent-operator",
    ) as Phaser.GameObjects.Image | null;
    this.callerSprite = roleSprite(scene, "caller_ghost", 573, 244, 138, 145);
    const initialPortrait = textureFor(scene, "asset.core.portrait.clerk");
    this.portrait = scene.add.image(
      642,
      317,
      initialPortrait.key,
      initialPortrait.frame,
    );
    this.portrait.setDisplaySize(138, 145).setVisible(false);
    this.caller = label(scene, 746, 249, "Noch kein Anruf", 32, "#91eafa", 380);
    this.callerCase = label(scene, 746, 295, "FALL-ID  —", 19, "#91eafa", 370);
    this.occupation = label(scene, 746, 322, "BERUF  —", 18, "#91eafa", 370);
    this.event = label(scene, 746, 348, "EREIGNIS  —", 17, "#91eafa", 370);
    this.speech = label(scene, 675, 452, "Leitung frei.", 24, C.ink, 660);
    this.replyPreview = label(scene, 621, 539, "…", 18, "#91eafa", 710);
    this.mood = label(scene, 1151, 299, "—", 24, "#91eafa", 184);
    this.queue = label(scene, 1428, 1018, "◇ Ruhig", 19);
    this.accept = label(scene, 228, 663, "ANNEHMEN", 27, "#21100e")
      .setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif')
      .setAngle(-5);
    scene.add
      .zone(184, 626, 247, 91)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.acceptCase());
    this.accept
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.acceptCase());
    this.interrupt = label(scene, 220, 746, "UNTERBRECHEN", 20, C.ink)
      .setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif')
      .setAngle(-5);
    scene.add
      .zone(192, 724, 242, 73)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.interruptCall());
    this.interrupt
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.interruptCall());
    for (let i = 0; i < 5; i++) {
      const { x, y, w, h } = AGENT_LAYOUT.choice(i);
      const card = workspaceSprite(scene, "paper-card", x, y, w, h);
      this.choicePlates.push(card);
      const numberBack = scene.add
        .rectangle(x + 10, y + 6, 54, 52, 0x211a17)
        .setOrigin(0)
        .setStrokeStyle(2, 0x987459);
      this.choiceNumbers.push(numberBack);
      const number = label(
        scene,
        x + 24,
        y + 12,
        String(i + 1),
        30,
        C.text,
        38,
      );
      const choice = label(
        scene,
        x + 82,
        y + 12,
        "",
        22,
        C.ink,
        w - 104,
      ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
      scene.add
        .zone(x, y, w, h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          if (!prefersReducedMotion()) {
            card.setY(y - 3);
            numberBack.setY(y + 3);
            number.setY(y + 9);
            choice.setY(y + 9);
          }
        })
        .on("pointerout", () => {
          card.setY(y);
          numberBack.setY(y + 6);
          number.setY(y + 12);
          choice.setY(y + 12);
        })
        .on("pointerdown", () => {
          card.setY(y + 2);
          numberBack.setY(y + 8);
          number.setY(y + 14);
          choice.setY(y + 14);
          this.choose(i);
          scene.time.delayedCall(120, () => {
            if (!card.active) return;
            card.setY(y);
            numberBack.setY(y + 6);
            number.setY(y + 12);
            choice.setY(y + 12);
          });
        });
      this.choices.push(choice);
    }
    for (let i = 0; i < 3; i++) {
      const hint = label(
        scene,
        1512,
        AGENT_LAYOUT.hint(i).y + 22,
        `HINWEIS ${i + 1}`,
        22,
        C.ink,
        254,
      ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
      hint
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.publish(i));
      const box = AGENT_LAYOUT.hint(i);
      scene.add
        .zone(box.x, box.y, box.w, box.h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.publish(i));
      this.hints.push(hint);
    }
    for (let i = 0; i < 3; i++) {
      const box = AGENT_LAYOUT.privateHint(i);
      const hint = label(
        scene,
        box.x + 12,
        box.y + 13,
        "Noch leer",
        18,
        C.ink,
        box.w - 24,
      );
      scene.add
        .zone(box.x, box.y, box.w, box.h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectPrivateHint(i));
      this.privateHints.push(hint);
    }
    this.discovered = label(
      scene,
      1450,
      666,
      "Hinweis auswählen: –",
      19,
      C.ink,
      314,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    this.discovered
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleTag());
    this.suggestion = label(
      scene,
      1428,
      933,
      "ZIELBITTE  –",
      18,
      C.text,
      340,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    this.suggestion
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleDestination());
    this.suggestionAction = label(
      scene,
      1610,
      960,
      "BITTE SENDEN",
      17,
      C.text,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    scene.add
      .zone(1595, 955, 184, 30)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.sendSuggestion());
    this.suggestionAction
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.sendSuggestion());
    this.approval = label(
      scene,
      1428,
      990,
      "◇ Freigabe offen",
      19,
      C.text,
      345,
    ).setFontFamily('"Trebuchet MS", "DejaVu Sans", sans-serif');
    this.approval
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleApproval());
    this.archiveStatus = label(scene, 1428, 871, "ARCHIV  —", 18, C.text, 340);
    this.dispatchStatus = label(
      scene,
      1428,
      901,
      "DISPOSITION  —",
      18,
      C.text,
      340,
    );
    this.feedback = label(scene, 557, 1033, "", 15, C.text, 790);
    this.face = roleSprite(
      scene,
      "spectral_mouth",
      619,
      317,
      46,
      35,
    ).setVisible(false);
    this.ring = roleSprite(scene, "ring_energy", 695, 328, 42, 30).setVisible(
      false,
    );
    this.setupMirror();
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("pointerdown", this.outsidePointer);
    this.unsubscribe = network.subscribe(() => this.render());
  }

  private setupMirror(): void {
    isolateCanvasInput(this.mirror);
    this.mirror.className = "agent-accessible-controls";
    this.mirror.setAttribute("aria-label", "Agentenpult und Tastatursteuerung");
    this.mirror.addEventListener("focusin", () => {
      this.mirror.dataset.open = "true";
    });
    this.mirrorStatus.setAttribute("role", "status");
    this.mirrorTranscript.setAttribute("aria-label", "Gesprächsverlauf");
    this.mirrorTranscript.hidden = true;
    this.acceptButton.textContent = "Anruf annehmen";
    this.acceptButton.onclick = () => this.acceptCase();
    this.mirror.append(this.acceptButton, this.mirrorTranscript);
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
    if (id && choiceId && !this.current()?.cooldownMs) {
      this.lastReply = this.current()?.dialogueLabels[choiceId] ?? choiceId;
      this.submit({ kind: "DIALOGUE", caseId: id, choiceId });
    }
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
  private selectPrivateHint(index: number): void {
    const tag = this.current()?.discoveredTags[index];
    if (!tag) return;
    this.selectedTag = tag;
    this.tagSelect.value = tag;
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
    if (this.transcriptCase !== view.public.activeCaseId) {
      this.transcriptCase = view.public.activeCaseId;
      this.lastDialogueText = null;
      this.lastReply = "";
      this.mirrorTranscript.replaceChildren();
      this.mirrorTranscript.hidden = true;
    }
    if (
      active &&
      role.dialogueText &&
      role.dialogueText !== this.lastDialogueText
    ) {
      this.lastDialogueText = role.dialogueText;
      const entry = document.createElement("li");
      entry.textContent = role.dialogueText;
      this.mirrorTranscript.append(entry);
      this.mirrorTranscript.hidden = false;
    }
    fitText(
      this.caller,
      role.callerName ?? role.incomingCallerName ?? "Noch kein Anruf",
      375,
      40,
      32,
      20,
    );
    fitText(
      this.callerCase,
      `FALL-ID  ${view.public.activeCaseId?.split(".").at(-1) ?? role.incomingCaseId?.split(".").at(-1) ?? "—"}`,
      370,
      26,
      19,
      16,
    );
    fitText(
      this.occupation,
      `BERUF  ${role.callerOccupation ?? "—"}`,
      370,
      24,
      18,
      15,
    );
    fitText(
      this.event,
      `EREIGNIS  ${role.callerEvent ?? "—"}`,
      370,
      42,
      17,
      14,
    );
    fitText(
      this.speech,
      role.dialogueText ??
        (role.incomingCaseId
          ? "Ein Anruf wartet in der Leitung."
          : "Leitung frei."),
      660,
      79,
      24,
      17,
    );
    fitText(this.replyPreview, this.lastReply || "…", 708, 27, 18, 15);
    fitText(
      this.mood,
      role.callerMood === null
        ? "—"
        : role.callerMood >= 70
          ? "☺ RUHIG"
          : role.callerMood >= 40
            ? "◇ ANGESPANNT"
            : "! GEREIZT",
      184,
      60,
      24,
      17,
    );
    fitText(
      this.queue,
      `LEITUNGSDRUCK  ${pressureLabel(view.public.queuePressure)}`,
      340,
      26,
      19,
      16,
    );
    fitText(
      this.accept,
      active ? "LEITUNG AKTIV" : "ANNEHMEN",
      180,
      36,
      27,
      19,
    );
    this.accept.setAlpha(role.incomingCaseId || active ? 1 : 0.45);
    this.acceptButton.disabled = !role.incomingCaseId;
    for (let i = 0; i < 5; i++) {
      const choiceId = role.dialogueOptions[i];
      const text = choiceId ? (role.dialogueLabels[choiceId] ?? choiceId) : "";
      fitText(this.choices[i]!, text, 715, 48, 22, 16);
      this.choicePlates[i]!.setAlpha(choiceId && !role.cooldownMs ? 1 : 0.56);
      this.choiceNumbers[i]!.setAlpha(choiceId && !role.cooldownMs ? 1 : 0.56);
      this.mirrorChoices[i]!.textContent = text
        ? `Antwort ${i + 1}: ${text}`
        : `Antwort ${i + 1} nicht verfügbar`;
      this.mirrorChoices[i]!.disabled = !choiceId || role.cooldownMs > 0;
    }
    fitText(
      this.interrupt,
      role.cooldownMs
        ? `WARTEN ${Math.ceil(role.cooldownMs / 1000)} s`
        : "UNTERBRECHEN",
      194,
      32,
      20,
      16,
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
      `AUSGEWÄHLT: ${this.selectedTag ? (role.tagLabels[this.selectedTag] ?? this.selectedTag) : "–"}  ↻`,
      314,
      52,
      19,
      15,
    );
    for (let i = 0; i < 3; i++) {
      const tag = role.discoveredTags[i];
      fitText(
        this.privateHints[i]!,
        tag
          ? `${tag === this.selectedTag ? "●" : "◇"} ${role.tagLabels[tag] ?? tag}`
          : "◇ Noch leer",
        AGENT_LAYOUT.privateHint(i).w - 24,
        49,
        18,
        14,
      );
      this.privateHints[i]!.setAlpha(tag ? 1 : 0.55);
    }
    for (let i = 0; i < 3; i++) {
      const tag = view.public.publishedTags[i];
      if (
        this.publishedTags[i] !== tag &&
        this.publishedTags[i] !== undefined &&
        !prefersReducedMotion()
      ) {
        const slip = this.hints[i]!;
        this.scene.tweens.killTweensOf(slip);
        slip.setAlpha(0.2).setY(AGENT_LAYOUT.hint(i).y + 10);
        this.scene.tweens.add({
          targets: slip,
          alpha: 1,
          y: AGENT_LAYOUT.hint(i).y + 22,
          duration: 180,
        });
      }
      this.publishedTags[i] = tag;
      fitText(
        this.hints[i]!,
        tag ? (role.tagLabels[tag] ?? tag) : `Hinweis ${i + 1} frei`,
        254,
        59,
        21,
        15,
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
        ? `ZIELBITTE: ${role.suggestableDestinations.find((item) => item.id === suggested)?.name ?? suggested}`
        : `ZIELBITTE: ${selectedName ?? "–"}  ↻`,
      340,
      25,
      18,
      15,
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
      345,
      27,
      19,
      15,
    );
    const archive = view.public.colleagues.find(
      (item) => item.role === "archivist",
    );
    const dispatch = view.public.colleagues.find(
      (item) => item.role === "dispatcher",
    );
    fitText(
      this.archiveStatus,
      `ARCHIV  ${archive?.activity ?? "getrennt"} · ${view.public.archivePins.length} Pins`,
      340,
      26,
      18,
      15,
    );
    fitText(
      this.dispatchStatus,
      `DISPOSITION  ${dispatch?.activity ?? "getrennt"}`,
      340,
      26,
      18,
      15,
    );
    this.approval.setAlpha(view.public.selectedDestination ? 1 : 0.5);
    this.approvalButton.textContent = view.public.approvals.agent
      ? "Freigabe widerrufen"
      : "Ausgewähltes Ziel freigeben";
    this.approvalButton.disabled = !active || !view.public.selectedDestination;
    fitText(
      this.feedback,
      this.network.error || this.localFeedback,
      790,
      19,
      15,
      13,
    );
    const accessibleStatus = `${role.callerName ?? role.incomingCallerName ?? "Kein Anruf"}. ${role.dialogueText ?? ""} Queue ${pressureLabel(view.public.queuePressure)}. Freigabe ${view.public.approvals.agent ? "erteilt" : "offen"}. ${this.network.error || this.localFeedback}`;
    if (this.mirrorStatus.textContent !== accessibleStatus)
      this.mirrorStatus.textContent = accessibleStatus;
    const worm = role.callerMood !== null && role.callerMood < 45;
    this.operator?.setAngle(worm && !prefersReducedMotion() ? -3 : 0);
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
    this.ring.setVisible(Boolean(role.incomingCallerName && !role.callerName));
    const offset =
      worm && !prefersReducedMotion()
        ? Math.sin(sceneTime(this.scene) / 170) * 10
        : 0;
    this.operator?.setX(257 + offset * 0.2);
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
