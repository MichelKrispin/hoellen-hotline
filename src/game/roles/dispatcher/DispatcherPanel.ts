import Phaser from "phaser";
import { isolateCanvasInput } from "../../../ui/canvasInput";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type { RoleView } from "../../state/contracts";
import { fitText, label } from "../../presentation/art";
import { workspaceSprite } from "../../../assets/workspaceSprites";
import { DISPATCH_LAYOUT } from "../../presentation/workspaceLayout";
import { placeholder } from "../../../assets/placeholders";
import { roleSprite } from "../../../assets/roleSprites";
import { TOKENS } from "../../../ui/tokens";
import type { AudioSystem } from "../../../audio/AudioSystem";
import {
  prefersReducedFlash,
  prefersReducedMotion,
} from "../../../app/options";

type DispatcherView = Extract<RoleView, { role: "dispatcher" }>;
const C = TOKENS.color;
const colors = [
  C.error,
  C.dispatcher,
  0x9a8cc8,
  C.success,
  C.archivist,
  0xd773c7,
  0x7aa6e6,
  0xbca57a,
  0x7a9d9a,
  C.warning,
  C.agent,
  0x8f819b,
];

function showValue(value: string | number | boolean): string {
  if (value === true) return "EIN";
  if (value === false) return "AUS";
  return String(value).toUpperCase();
}

export class DispatcherPanel {
  private readonly mirror = document.createElement("section");
  private readonly mirrorStatus = document.createElement("p");
  private readonly mirrorSummary = document.createElement("p");
  private readonly previousSummaryButton = document.createElement("button");
  private readonly nextSummaryButton = document.createElement("button");
  private readonly targetButtons: HTMLButtonElement[] = [];
  private readonly controlButtons: HTMLButtonElement[] = [];
  private readonly recoveryButton = document.createElement("button");
  private readonly prepareButton = document.createElement("button");
  private readonly readyButton = document.createElement("button");
  private readonly commitButton = document.createElement("button");
  private readonly targetLabels: Phaser.GameObjects.Text[] = [];
  private readonly targetSurfaces: (
    Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice
  )[] = [];
  private readonly targetFrames: Phaser.GameObjects.Graphics[] = [];
  private readonly controlLabels: Phaser.GameObjects.Text[] = [];
  private readonly controlValues: Phaser.GameObjects.Text[] = [];
  private readonly controlRanges: Phaser.GameObjects.Text[] = [];
  private readonly controlFaces: {
    dial: Phaser.GameObjects.Container;
    toggle: Phaser.GameObjects.Container;
    slider: Phaser.GameObjects.Container;
    pointer: Phaser.GameObjects.Image;
    handle: Phaser.GameObjects.Image;
    thumb: Phaser.GameObjects.Image;
  }[] = [];
  private readonly summaryTitle: Phaser.GameObjects.Text;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly transferText: Phaser.GameObjects.Text;
  private readonly summaryPageLabel: Phaser.GameObjects.Text;
  private readonly previousSummaryPage: Phaser.GameObjects.Text;
  private readonly nextSummaryPage: Phaser.GameObjects.Text;
  private readonly incidentText: Phaser.GameObjects.Text;
  private readonly prepareText: Phaser.GameObjects.Text;
  private readonly readyText: Phaser.GameObjects.Text;
  private readonly commitText: Phaser.GameObjects.Text;
  private readonly leverCheckText: Phaser.GameObjects.Text;
  private readonly guardText: Phaser.GameObjects.Text;
  private readonly guardTrack: Phaser.GameObjects.Graphics;
  private readonly feedbackText: Phaser.GameObjects.Text;
  private readonly leverArm: Phaser.GameObjects.Container;
  private readonly figure: Phaser.GameObjects.Image | null;
  private readonly warningLight: Phaser.GameObjects.Image | null;
  private readonly unsubscribe: () => void;
  private vignette: Phaser.GameObjects.Container | null = null;
  private vignetteTimer: Phaser.Time.TimerEvent | null = null;
  private seenOutcome: string | null = null;
  private seenIncident: string | null = null;
  private armed = false;
  private armSignature = "";
  private feedback = "";
  private summarySource = "";
  private summaryPages: string[] = [""];
  private summaryPageIndex = 0;
  private lastCommand = "";
  private pendingUntil = 0;
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
    private readonly audio: AudioSystem,
  ) {
    this.figure = scene.children.getByName(
      "dispatcher-worker",
    ) as Phaser.GameObjects.Image | null;
    this.warningLight = scene.children.getByName(
      "dispatcher-warning-light",
    ) as Phaser.GameObjects.Image | null;
    isolateCanvasInput(this.mirror);
    this.mirror.className = "dispatcher-accessible-controls";
    this.mirror.setAttribute(
      "aria-label",
      "Disponentenpult und Tastatursteuerung",
    );
    this.mirror.addEventListener("focusin", () => {
      this.mirror.dataset.open = "true";
    });
    this.mirrorStatus.setAttribute("role", "status");
    const targetGroup = document.createElement("div");
    targetGroup.className = "dispatcher-targets";
    targetGroup.setAttribute("aria-label", "Zielbank");
    for (let i = 0; i < 12; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.selectDestination(i);
      this.targetButtons.push(button);
      targetGroup.append(button);
    }
    const controlGroup = document.createElement("div");
    controlGroup.className = "dispatcher-controls";
    controlGroup.setAttribute("aria-label", "Maschinenregler");
    for (let i = 0; i < 6; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.cycleControl(i);
      this.controlButtons.push(button);
      controlGroup.append(button);
    }
    this.recoveryButton.onclick = () => this.recover();
    this.previousSummaryButton.textContent = "Vorherige Auftragsseite";
    this.nextSummaryButton.textContent = "Nächste Auftragsseite";
    this.previousSummaryButton.onclick = () => this.changeSummaryPage(-1);
    this.nextSummaryButton.onclick = () => this.changeSummaryPage(1);
    this.prepareButton.onclick = () => this.prepare();
    this.readyButton.onclick = () => this.toggleReady();
    this.commitButton.onclick = () => this.commit();
    this.mirror.append(
      targetGroup,
      controlGroup,
      this.mirrorSummary,
      this.previousSummaryButton,
      this.nextSummaryButton,
      this.recoveryButton,
      this.prepareButton,
      this.readyButton,
      this.commitButton,
      this.mirrorStatus,
    );
    document.body.append(this.mirror);
    window.addEventListener("pointerdown", this.outsidePointer);

    for (let i = 0; i < 12; i++) {
      const { x, y, w, h } = DISPATCH_LAYOUT.target(i);
      const surface = workspaceSprite(scene, "paper-card", x, y, w, h);
      this.targetSurfaces.push(surface);
      scene.add
        .graphics()
        .fillStyle(colors[i]!)
        .fillCircle(x + 12, y + 16, 5);
      const frame = scene.add
        .graphics()
        .lineStyle(3, C.warning)
        .strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 7)
        .setVisible(false);
      const text = label(scene, x + 27, y + 3, "", 18, C.ink, 227);
      scene.add
        .zone(x, y, w, h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectDestination(i));
      this.targetFrames.push(frame);
      this.targetLabels.push(text);
    }
    for (let i = 0; i < 6; i++) {
      const { x, y, w, h } = DISPATCH_LAYOUT.control(i);
      const name = label(scene, x + 18, y + 17, "", 21, C.text, 253);
      workspaceSprite(scene, "paper-card", x + 29, y + 227, 237, 35);
      const value = label(scene, x + 43, y + 232, "", 21, C.ink, 205);
      const range = label(scene, x + 228, y + 192, "", 15, C.muted, 55);
      const dialFace = roleSprite(scene, "analog_gauge", -62, -62, 124, 124);
      const pointer = roleSprite(scene, "gauge_needle", 0, 0, 22, 78);
      // The needle hub sits three quarters down the supplied crop.
      pointer.setOrigin(0.5, 0.75).setPosition(0, 0);
      const dial = scene.add.container(x + w / 2, y + 140, [dialFace, pointer]);
      const track = workspaceSprite(scene, "switch-track", -60, -60, 120, 120);
      const handle = workspaceSprite(
        scene,
        "switch-handle",
        -21,
        -44,
        42,
        49,
      ) as Phaser.GameObjects.Image;
      const toggle = scene.add.container(x + w / 2, y + 140, [track, handle]);
      const rail = workspaceSprite(scene, "slider-track", -110, -26, 220, 55);
      const thumb = workspaceSprite(
        scene,
        "slider-thumb",
        -18,
        -26,
        36,
        55,
      ) as Phaser.GameObjects.Image;
      const slider = scene.add.container(x + w / 2, y + 140, [rail, thumb]);
      this.controlFaces.push({ dial, toggle, slider, pointer, handle, thumb });
      scene.add
        .zone(x, y, w, h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.cycleControl(i));
      this.controlLabels.push(name);
      this.controlValues.push(value);
      this.controlRanges.push(range);
    }
    this.summaryTitle = label(scene, 1138, 208, "ZIELANFORDERUNGEN", 26, C.ink);
    this.summaryText = label(
      scene,
      1138,
      267,
      "Ziel vorwählen.",
      19,
      C.ink,
      355,
    );
    this.summaryText.setLineSpacing(4);
    this.previousSummaryPage = label(scene, 1138, 539, "◀", 19, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeSummaryPage(-1));
    this.summaryPageLabel = label(scene, 1210, 539, "", 18, C.ink);
    this.nextSummaryPage = label(scene, 1480, 539, "▶", 19, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeSummaryPage(1));
    label(scene, 1140, 623, "AKTUELLE ÜBERGABE", 22, C.text);
    this.transferText = label(scene, 1140, 675, "", 18, C.ink, 367);
    this.incidentText = label(scene, 156, 981, "", 21, C.text, 860);
    this.incidentText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.recover());
    scene.add
      .zone(145, 967, 915, 68)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.recover());
    this.prepareText = label(scene, 1140, 864, "ANLAGE VORBEREITEN", 20, C.ink);
    this.prepareText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.prepare());
    scene.add
      .zone(1127, 851, 380, 52)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.prepare());
    this.readyText = label(scene, 1140, 926, "BEREIT MELDEN", 20, C.ink);
    this.readyText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleReady());
    scene.add
      .zone(1127, 914, 380, 52)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleReady());
    this.leverCheckText = label(
      scene,
      1581,
      723,
      "Ziel: — · Bedingungen offen",
      19,
      C.text,
      245,
    );
    this.commitText = label(scene, 1581, 783, "↗ HEBEL SPERRE", 22);
    this.guardTrack = scene.add.graphics();
    this.guardText = label(
      scene,
      1581,
      940,
      "SCHUTZBÜGEL: GESCHLOSSEN",
      17,
      C.muted,
      245,
    );
    this.commitText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.commit());
    scene.add
      .zone(1550, 696, 305, 309)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.commit());
    const arm = roleSprite(scene, "single_lever", -40, -125, 80, 125);
    this.leverArm = scene.add.container(1700, 939, [arm]);
    this.feedbackText = label(scene, 1135, 1006, "", 18, C.text, 700);
    this.unsubscribe = network.subscribe(() => this.render());
  }

  private current(): DispatcherView | null {
    const role = this.network.view?.role;
    return role?.role === "dispatcher" ? role : null;
  }
  private changeSummaryPage(delta: number): void {
    this.summaryPageIndex = Math.max(
      0,
      Math.min(this.summaryPages.length - 1, this.summaryPageIndex + delta),
    );
    this.render();
  }
  private paginateSummary(body: string): string[] {
    const pages: string[] = [];
    let page = "";
    for (const paragraph of body.split("\n")) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        if (page) page += "\n";
        continue;
      }
      let first = true;
      for (const word of words) {
        const separator = first ? (page ? "\n" : "") : " ";
        const candidate = page + separator + word;
        this.summaryText.setText(candidate);
        if (page && this.summaryText.height > 258) {
          pages.push(page);
          page = word;
        } else page = candidate;
        first = false;
      }
    }
    pages.push(page);
    return pages;
  }
  private caseId(): CaseId | null {
    return this.network.view?.public.activeCaseId ?? null;
  }
  private submit(command: Parameters<GameNetwork["submit"]>[0]): boolean {
    const key = JSON.stringify(command);
    if (this.lastCommand === key && performance.now() < this.pendingUntil)
      return false;
    const error = this.network.submit(command);
    this.feedback = error ?? "Anweisung übermittelt.";
    if (!error) {
      this.lastCommand = key;
      this.pendingUntil = performance.now() + 450;
    }
    this.render();
    return !error;
  }
  private selectDestination(index: number): void {
    const id = this.caseId();
    const destination = this.current()?.destinations[index];
    if (id && destination)
      this.submit({
        kind: "SELECT_DESTINATION",
        caseId: id,
        destinationId: destination.id,
      });
  }
  private cycleControl(index: number): void {
    const id = this.caseId();
    const control = this.current()?.controls[index];
    if (!id || !control) return;
    const next =
      control.values[
        (control.values.findIndex((value) => value === control.value) + 1) %
          control.values.length
      ]!;
    this.submit({
      kind: "MACHINE_CONTROL",
      caseId: id,
      controlId: control.id,
      value: next,
    });
  }
  private drawControlFace(
    index: number,
    control: DispatcherView["controls"][number] | undefined,
  ): void {
    const face = this.controlFaces[index]!;
    face.dial.setVisible(control?.kind === "dial");
    face.toggle.setVisible(control?.kind === "toggle");
    face.slider.setVisible(
      Boolean(control && control.kind !== "dial" && control.kind !== "toggle"),
    );
    if (!control) return;
    const position = Math.max(
      0,
      control.values.findIndex((value) => value === control.value),
    );
    const fraction =
      control.values.length > 1 ? position / (control.values.length - 1) : 0;
    face.pointer.setRotation((fraction - 0.5) * Math.PI * 1.5);
    face.handle.setY(fraction ? -50 : -5);
    face.thumb.setX(-102 + fraction * 168);
  }

  private recover(): void {
    const id = this.caseId();
    if (id && this.current()?.incident)
      this.submit({ kind: "RECOVER_INCIDENT", caseId: id });
  }
  private prepare(): void {
    const id = this.caseId();
    if (id) this.submit({ kind: "PREPARE", caseId: id });
  }
  private toggleReady(): void {
    const id = this.caseId();
    const view = this.network.view?.public;
    if (id && view?.selectedDestination)
      this.submit({
        kind: "APPROVE",
        caseId: id,
        approved: !view.approvals.dispatcher,
      });
  }
  private commit(): void {
    const id = this.caseId();
    const view = this.network.view?.public;
    if (
      !id ||
      !view ||
      !Object.values(view.approvals).every(Boolean) ||
      !this.current()?.prepared
    )
      return;
    if (!this.armed) {
      this.armed = true;
      this.feedback =
        "Schutzbügel offen. Ziel und Freigaben prüfen, dann erneut ziehen.";
      this.render();
      return;
    }
    this.armed = false;
    if (this.submit({ kind: "ROUTE_COMMIT", caseId: id })) this.playLever();
  }
  private playLever(): void {
    const calm = prefersReducedMotion();
    if (!calm)
      this.scene.tweens.add({
        targets: this.leverArm,
        angle: 64,
        duration: 130,
        yoyo: true,
        ease: "Back.easeIn",
      });
    if (!calm && this.figure)
      this.scene.tweens.add({
        targets: this.figure,
        angle: 4,
        duration: 130,
        yoyo: true,
      });
    const sparks = this.scene.add.container(0, 0);
    if (!prefersReducedFlash())
      for (let i = 0; i < 7; i++) {
        sparks.add(
          placeholder(
            this.scene,
            "spark",
            1630 + i * 12,
            860 - (i % 3) * 17,
            24,
            24,
          ),
        );
      }
    sparks.add(roleSprite(this.scene, "machine_fx", 1620, 826, 90, 112));
    if (calm) this.scene.time.delayedCall(350, () => sparks.destroy());
    else
      this.scene.tweens.add({
        targets: sparks,
        alpha: 0,
        y: -72,
        duration: 650,
        onComplete: () => sparks.destroy(),
      });
    this.audio.tone("sfx", 150);
  }
  private closeVignette(): void {
    this.vignetteTimer?.remove();
    this.vignetteTimer = null;
    this.vignette?.destroy();
    this.vignette = null;
  }
  private showVignette(
    outcome: NonNullable<DispatcherView["lastOutcome"]>,
  ): void {
    this.closeVignette();
    const success =
      outcome.outcome === "correct" || outcome.outcome === "acceptable";
    const panel = this.scene.add.container(555, 238);
    const backdrop = placeholder(this.scene, "panel-bakelite", 0, 0, 820, 402)
      .setTint(success ? C.success : C.error)
      .setAlpha(0.97);
    const title = label(
      this.scene,
      55,
      42,
      success ? "✓ ROUTE ZUGESTELLT" : "× FEHLLEITUNG!",
      43,
    );
    title.setPosition(55, 42);
    const caption = label(
      this.scene,
      62,
      132,
      success
        ? "Die Seele landet mit einem trockenen Stempel im richtigen Fach."
        : "Ein Rohr hustet die Seele samt Formular zurück in die Leitstelle.",
      28,
      C.text,
      690,
    );
    caption.setPosition(62, 132);
    const soul = placeholder(this.scene, "soul", 105, 245, 80, 96);
    const skip = label(this.scene, 600, 328, "ÜBERSPRINGEN →", 22);
    skip
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.closeVignette());
    panel.add([backdrop, title, caption, soul, skip]);
    panel.setDepth(100);
    this.vignette = panel;
    if (!prefersReducedMotion())
      this.scene.tweens.add({
        targets: soul,
        x: success ? 555 : 330,
        y: success ? -35 : 35,
        angle: success ? 0 : 120,
        duration: 930,
        ease: "Back.easeIn",
      });
    this.vignetteTimer = this.scene.time.delayedCall(3000, () =>
      this.closeVignette(),
    );
  }
  private render(): void {
    const role = this.current();
    const shared = this.network.view?.public;
    if (!role || !shared) return;
    this.mirror.dataset.caseId = shared.activeCaseId ?? "";
    const selected = role.destinations.find(
      (item) => item.id === shared.selectedDestination,
    );
    const signature = JSON.stringify([
      shared.selectedDestination,
      role.controls.map((item) => item.value),
      role.prepared,
      shared.approvals,
      role.incident?.id,
    ]);
    if (signature !== this.armSignature) {
      this.armSignature = signature;
      this.armed = false;
    }
    for (let i = 0; i < 12; i++) {
      const destination = role.destinations[i];
      const text = this.targetLabels[i]!;
      const button = this.targetButtons[i]!;
      if (destination) {
        fitText(
          text,
          `${destination.id === shared.selectedDestination ? "▶ " : ""}${destination.glyph} ${destination.name}`,
          225,
          26,
          19,
          15,
        );
        text.setAlpha(1);
        button.textContent = `${destination.kind === "special" ? "Sonderziel" : "Ziel"}: ${destination.name}. ${destination.description}`;
        button.disabled = !shared.activeCaseId;
        button.setAttribute(
          "aria-pressed",
          String(destination.id === shared.selectedDestination),
        );
        this.targetSurfaces[i]!.setAlpha(1);
      } else {
        fitText(text, "—", 225, 26, 18, 15).setAlpha(0.35);
        button.textContent = "Ziel nicht belegt";
        button.disabled = true;
        button.setAttribute("aria-pressed", "false");
        this.targetSurfaces[i]!.setAlpha(0.5);
      }
      const frame = this.targetFrames[i]!;
      frame.setVisible(destination?.id === shared.selectedDestination);
    }
    for (let i = 0; i < 6; i++) {
      const control = role.controls[i];
      fitText(this.controlLabels[i]!, control?.label ?? "–", 260, 30, 22, 17);
      fitText(
        this.controlValues[i]!,
        control ? `${showValue(control.value)}  ↻` : "",
        210,
        28,
        23,
        15,
      );
      this.drawControlFace(i, control);
      this.controlRanges[i]!.setText(
        control
          ? `${control.values.findIndex((value) => value === control.value) + 1}/${control.values.length}`
          : "",
      );
      this.controlButtons[i]!.textContent = control
        ? `${control.label}: ${showValue(control.value)}. Wert ${control.values.findIndex((value) => value === control.value) + 1} von ${control.values.length}. Nächsten Wert wählen.`
        : "Regler nicht belegt";
      this.controlButtons[i]!.disabled = !control || !shared.activeCaseId;
    }
    fitText(
      this.summaryTitle,
      selected ? `${selected.glyph} ${selected.name}` : "ZIELBANK",
      350,
      46,
      27,
      22,
    );
    const requirementLines =
      selected?.requirements.map((entry) => {
        const control = role.controls.find(
          (item) => item.id === entry.controlId,
        );
        const matches = control?.value === entry.value;
        return `${matches ? "✓" : "◇"} ${entry.label}: ${showValue(entry.value)}`;
      }) ?? [];
    const unmetRequirements =
      selected?.requirements
        .filter(
          (entry) =>
            role.controls.find((control) => control.id === entry.controlId)
              ?.value !== entry.value,
        )
        .map((entry) => entry.label) ?? [];
    const summary = selected
      ? `${selected.description}\n\nVORGABEN ${requirementLines.length - unmetRequirements.length}/${requirementLines.length}\n${requirementLines.join("\n") || "Keine Vorgaben"}\n\n${unmetRequirements.length ? `FEHLT: ${unmetRequirements.join(", ")}` : "✓ Alle technischen Vorgaben erfüllt"}`
      : "Neun Regelziele und drei Sonderrohre.\nZiel wählen, Anlage einstellen, Freigaben prüfen.";
    if (this.summarySource !== summary) {
      this.summarySource = summary;
      this.summaryPages = this.paginateSummary(summary);
      this.summaryPageIndex = 0;
    }
    this.summaryText.setText(this.summaryPages[this.summaryPageIndex] ?? "");
    const hasSummaryPages = this.summaryPages.length > 1;
    this.summaryPageLabel.setText(
      hasSummaryPages
        ? `Seite ${this.summaryPageIndex + 1} / ${this.summaryPages.length}`
        : "",
    );
    this.previousSummaryPage.setVisible(hasSummaryPages);
    this.nextSummaryPage.setVisible(hasSummaryPages);
    this.previousSummaryPage.setAlpha(this.summaryPageIndex === 0 ? 0.35 : 1);
    this.nextSummaryPage.setAlpha(
      this.summaryPageIndex === this.summaryPages.length - 1 ? 0.35 : 1,
    );
    this.mirrorSummary.textContent = `Auftrag Seite ${this.summaryPageIndex + 1} von ${this.summaryPages.length}. ${this.summaryPages[this.summaryPageIndex] ?? ""}`;
    fitText(
      this.transferText,
      selected
        ? `${selected.glyph} ${selected.name}\n${role.controls.map((control) => `${control.label}: ${showValue(control.value)}`).join(" · ")}\n\nFREIGABEN  ${shared.approvals.agent ? "AGENT ✓" : "AGENT ○"}  ${shared.approvals.archivist ? "ARCHIV ✓" : "ARCHIV ○"}\nDISPOSITION ${shared.approvals.dispatcher ? "✓" : "○"}`
        : "Ziel wählen. Die Übergabe erscheint hier mit den eingestellten Parametern und Team-Freigaben.",
      367,
      160,
      18,
      15,
    );
    this.previousSummaryButton.disabled =
      !hasSummaryPages || this.summaryPageIndex === 0;
    this.nextSummaryButton.disabled =
      !hasSummaryPages ||
      this.summaryPageIndex === this.summaryPages.length - 1;
    const incident = role.incident;
    this.warningLight?.setVisible(Boolean(incident));
    if (incident && incident.id !== this.seenIncident && this.warningLight) {
      this.seenIncident = incident.id;
      if (!prefersReducedFlash()) {
        this.scene.tweens.killTweensOf(this.warningLight);
        this.scene.tweens.add({
          targets: this.warningLight,
          alpha: 0.35,
          duration: 130,
          yoyo: true,
          repeat: 2,
        });
      }
    }
    if (!incident) this.seenIncident = null;
    const recovered =
      incident &&
      role.controls.find((item) => item.id === incident.recoveryControlId)
        ?.value === incident.recoveryValue;
    fitText(
      this.incidentText,
      incident
        ? recovered
          ? `⚠ ${incident.name}\n↗ STÖRUNG BEHEBEN`
          : `⚠ ${incident.name}: ${incident.diagnosis}`
        : "✓ Keine aktive Störung",
      890,
      46,
      19,
      17,
    );
    this.recoveryButton.textContent = incident
      ? `Störung beheben: ${incident.diagnosis}`
      : "Keine aktive Störung";
    this.recoveryButton.disabled = !incident || !recovered;
    const technicalReady =
      Boolean(selected) &&
      !incident &&
      requirementLines.every((line) => line.startsWith("✓"));
    fitText(
      this.prepareText,
      role.prepared ? "✓ ANLAGE VORBEREITET" : "ANLAGE VORBEREITEN",
      360,
      32,
      23,
      17,
    );
    this.prepareText.setAlpha(technicalReady && !role.prepared ? 1 : 0.55);
    this.prepareButton.textContent = role.prepared
      ? "Anlage bereits vorbereitet"
      : "Anlage vorbereiten";
    this.prepareButton.disabled = !technicalReady || role.prepared;
    fitText(
      this.readyText,
      shared.approvals.dispatcher ? "✓ BEREIT · WIDERRUFEN" : "BEREIT MELDEN",
      360,
      32,
      23,
      17,
    );
    this.readyText.setAlpha(role.prepared ? 1 : 0.55);
    this.readyButton.textContent = shared.approvals.dispatcher
      ? "Bereitschaft widerrufen"
      : "Bereitschaft melden";
    this.readyButton.disabled = !role.prepared;
    const canCommit =
      role.prepared && Object.values(shared.approvals).every(Boolean);
    const missing = [
      ...(!selected ? ["Ziel"] : []),
      ...unmetRequirements,
      ...(incident ? ["Störung"] : []),
      ...(!role.prepared ? ["Vorbereitung"] : []),
      ...(!shared.approvals.agent ? ["Agent"] : []),
      ...(!shared.approvals.archivist ? ["Archiv"] : []),
      ...(!shared.approvals.dispatcher ? ["Disposition"] : []),
    ];
    fitText(
      this.leverCheckText,
      `ZIEL: ${selected?.name ?? "—"} · ${missing.length ? `FEHLT: ${missing.join(", ")}` : "TECHNIK UND FREIGABEN ✓"}`,
      270,
      50,
      19,
      15,
    );
    this.guardTrack.clear();
    this.guardTrack.fillStyle(0x171216).fillRoundedRect(1581, 920, 239, 6, 3);
    this.guardTrack
      .fillStyle(this.armed ? C.success : C.warning)
      .fillRoundedRect(this.armed ? 1778 : 1581, 916, 42, 14, 4);
    this.guardText.setText(
      `BÜGEL: ${this.armed ? "OFFEN · ZIEHEN" : "GESCHLOSSEN"}`,
    );
    fitText(
      this.commitText,
      canCommit
        ? this.armed
          ? "2. SEELEN-HEBEL ZIEHEN"
          : "1. ARRETIERUNG ÖFFNEN"
        : "HEBEL GESPERRT",
      238,
      48,
      20,
      17,
    );
    this.commitText.setAlpha(canCommit ? 1 : 0.5);
    this.commitButton.textContent = canCommit
      ? this.armed
        ? "Zustellung endgültig auslösen"
        : "Hebel entsichern und Zusammenfassung prüfen"
      : "Hebel gesperrt: Freigaben oder Vorbereitung fehlen";
    this.commitButton.disabled = !canCommit;
    fitText(
      this.feedbackText,
      this.network.error || this.feedback,
      710,
      40,
      18,
      15,
    );
    const status = `${selected ? `Ziel ${selected.name}. ${requirementLines.join(". ")}.` : "Kein Ziel gewählt."} ${incident ? `Störung ${incident.diagnosis}.` : "Keine Störung."} ${role.prepared ? "Anlage vorbereitet." : "Anlage nicht vorbereitet."} Schutzbügel ${this.armed ? "offen" : "geschlossen"}. ${missing.length ? `Fehlt: ${missing.join(", ")}.` : "Alle Bedingungen erfüllt."} ${role.lastOutcome ? `Ergebnis: ${role.lastOutcome.outcome}.` : ""} ${this.network.error || this.feedback}`;
    if (this.mirrorStatus.textContent !== status)
      this.mirrorStatus.textContent = status;
    if (role.lastOutcome) {
      const outcomeKey = `${role.lastOutcome.caseId}:${role.lastOutcome.outcome}`;
      if (outcomeKey !== this.seenOutcome) {
        this.seenOutcome = outcomeKey;
        this.showVignette(role.lastOutcome);
      }
    }
  }
  destroy(): void {
    this.unsubscribe();
    window.removeEventListener("pointerdown", this.outsidePointer);
    this.closeVignette();
    this.mirror.remove();
  }
}
