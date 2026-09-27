import Phaser from "phaser";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type { RoleView } from "../../state/contracts";
import { controlSurface, fitText, label } from "../../presentation/art";
import { bakeliteControl } from "../../presentation/uiPrimitives";
import { placeholder } from "../../../assets/placeholders";
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
  private readonly targetButtons: HTMLButtonElement[] = [];
  private readonly controlButtons: HTMLButtonElement[] = [];
  private readonly recoveryButton = document.createElement("button");
  private readonly prepareButton = document.createElement("button");
  private readonly readyButton = document.createElement("button");
  private readonly commitButton = document.createElement("button");
  private readonly targetLabels: Phaser.GameObjects.Text[] = [];
  private readonly targetSurfaces: Phaser.GameObjects.NineSlice[] = [];
  private readonly targetFrames: Phaser.GameObjects.Graphics[] = [];
  private readonly controlLabels: Phaser.GameObjects.Text[] = [];
  private readonly controlValues: Phaser.GameObjects.Text[] = [];
  private readonly summaryTitle: Phaser.GameObjects.Text;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly summaryPageLabel: Phaser.GameObjects.Text;
  private readonly previousSummaryPage: Phaser.GameObjects.Text;
  private readonly nextSummaryPage: Phaser.GameObjects.Text;
  private readonly incidentText: Phaser.GameObjects.Text;
  private readonly prepareText: Phaser.GameObjects.Text;
  private readonly readyText: Phaser.GameObjects.Text;
  private readonly commitText: Phaser.GameObjects.Text;
  private readonly feedbackText: Phaser.GameObjects.Text;
  private readonly leverArm: Phaser.GameObjects.Container;
  private readonly unsubscribe: () => void;
  private vignette: Phaser.GameObjects.Container | null = null;
  private vignetteTimer: Phaser.Time.TimerEvent | null = null;
  private seenOutcome: string | null = null;
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
    targetGroup.setAttribute("aria-label", "Zielbank");
    for (let i = 0; i < 12; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.selectDestination(i);
      this.targetButtons.push(button);
      targetGroup.append(button);
    }
    const controlGroup = document.createElement("div");
    controlGroup.setAttribute("aria-label", "Maschinenregler");
    for (let i = 0; i < 6; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.cycleControl(i);
      this.controlButtons.push(button);
      controlGroup.append(button);
    }
    this.recoveryButton.onclick = () => this.recover();
    this.prepareButton.onclick = () => this.prepare();
    this.readyButton.onclick = () => this.toggleReady();
    this.commitButton.onclick = () => this.commit();
    this.mirror.append(
      targetGroup,
      controlGroup,
      this.recoveryButton,
      this.prepareButton,
      this.readyButton,
      this.commitButton,
      this.mirrorStatus,
    );
    document.body.append(this.mirror);
    window.addEventListener("pointerdown", this.outsidePointer);

    for (let i = 0; i < 12; i++) {
      const x = 1313 + (i % 2) * 237;
      const y = 380 + Math.floor(i / 2) * 53;
      const surface = bakeliteControl(scene, x, y, 225, 51);
      this.targetSurfaces.push(surface);
      scene.add
        .graphics()
        .fillStyle(colors[i]!)
        .fillCircle(x + 17, y + 26, 6);
      const frame = scene.add
        .graphics()
        .lineStyle(3, C.warning)
        .strokeRoundedRect(x + 5, y + 5, 215, 41, 7)
        .setVisible(false);
      const text = label(scene, x + 31, y + 10, "", 19, C.text, 181);
      scene.add
        .zone(x, y, 225, 51)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectDestination(i));
      this.targetFrames.push(frame);
      this.targetLabels.push(text);
    }
    for (let i = 0; i < 6; i++) {
      const x = 555 + (i % 3) * 233;
      const y = 575 + Math.floor(i / 3) * 102;
      controlSurface(scene, x, y, 219, 88, C.metalEdge);
      const name = label(scene, x + 15, y + 10, "", 20, C.text, 190);
      const value = label(scene, x + 15, y + 45, "", 23, C.text, 190);
      scene.add
        .zone(x, y, 219, 88)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.cycleControl(i));
      this.controlLabels.push(name);
      this.controlValues.push(value);
    }
    this.summaryTitle = label(scene, 575, 351, "MASCHINENAUFTRAG", 27, C.ink);
    this.summaryText = label(
      scene,
      575,
      398,
      "Ziel vorwählen.",
      20,
      C.ink,
      650,
    );
    this.summaryText.setLineSpacing(4);
    this.previousSummaryPage = label(scene, 575, 483, "◀", 19, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeSummaryPage(-1));
    this.summaryPageLabel = label(scene, 780, 483, "", 18, C.ink);
    this.nextSummaryPage = label(scene, 1215, 483, "▶", 19, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeSummaryPage(1));
    controlSurface(scene, 1313, 738, 474, 62, C.metalEdge);
    this.incidentText = label(scene, 1328, 748, "", 18, C.text, 440);
    this.incidentText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.recover());
    scene.add
      .zone(1313, 738, 474, 62)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.recover());
    controlSurface(scene, 1313, 813, 474, 55, C.warning);
    this.prepareText = label(scene, 1328, 826, "ANLAGE VORBEREITEN", 22);
    this.prepareText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.prepare());
    scene.add
      .zone(1313, 813, 474, 55)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.prepare());
    controlSurface(scene, 1313, 884, 474, 55, C.success);
    this.readyText = label(scene, 1328, 897, "BEREIT MELDEN", 22);
    this.readyText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleReady());
    scene.add
      .zone(1313, 884, 474, 55)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleReady());
    controlSurface(scene, 584, 795, 642, 181, C.error);
    this.commitText = label(scene, 634, 856, "↗ HEBEL SPERRE", 34);
    this.commitText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.commit());
    scene.add
      .zone(584, 795, 642, 181)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.commit());
    const arm = placeholder(scene, "lever-arm", -40, -135, 80, 150);
    this.leverArm = scene.add.container(1188, 936, [arm]);
    this.feedbackText = label(scene, 1320, 953, "", 18, C.text, 460);
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
        if (page && this.summaryText.height > 72) {
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
        "Letzte Prüfung: Ziel, Hinweise und Freigaben bestätigen. Erneut ziehen.";
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
    const sparks = this.scene.add.container(0, 0);
    if (!prefersReducedFlash())
      for (let i = 0; i < 7; i++) {
        sparks.add(
          placeholder(
            this.scene,
            "spark",
            1790 + i * 12,
            890 - (i % 3) * 17,
            24,
            24,
          ),
        );
      }
    sparks.add(placeholder(this.scene, "smoke", 1780, 840, 110, 60));
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
          181,
          31,
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
        fitText(text, "—", 181, 31, 19, 15).setAlpha(0.35);
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
      fitText(this.controlLabels[i]!, control?.label ?? "–", 190, 28, 20, 16);
      fitText(
        this.controlValues[i]!,
        control ? `${showValue(control.value)}  ↻` : "",
        190,
        32,
        23,
        18,
      );
      this.controlButtons[i]!.textContent = control
        ? `${control.label}: ${showValue(control.value)}. Nächsten Wert wählen.`
        : "Regler nicht belegt";
      this.controlButtons[i]!.disabled = !control || !shared.activeCaseId;
    }
    fitText(
      this.summaryTitle,
      selected ? `${selected.glyph} ${selected.name}` : "ZIELBANK",
      650,
      38,
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
    const summary = selected
      ? `${selected.description}\n\nTECHNIK\n${requirementLines.join("\n") || "Keine Vorgaben"}\n\nFreigaben: ${shared.approvals.agent ? "A✓" : "A○"} ${shared.approvals.archivist ? "R✓" : "R○"} ${shared.approvals.dispatcher ? "D✓" : "D○"}`
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
    const incident = role.incident;
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
      440,
      54,
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
      440,
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
      440,
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
    fitText(
      this.commitText,
      canCommit
        ? this.armed
          ? "↗ JETZT ZUSTELLEN"
          : "↗ HEBEL ENTSICHERN"
        : "↗ HEBEL GESPERRT",
      560,
      55,
      34,
      24,
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
      460,
      40,
      18,
      15,
    );
    const status = `${selected ? `Ziel ${selected.name}. ${requirementLines.join(". ")}.` : "Kein Ziel gewählt."} ${incident ? `Störung ${incident.diagnosis}.` : "Keine Störung."} ${role.prepared ? "Anlage vorbereitet." : "Anlage nicht vorbereitet."} ${role.lastOutcome ? `Ergebnis: ${role.lastOutcome.outcome}.` : ""} ${this.network.error || this.feedback}`;
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
