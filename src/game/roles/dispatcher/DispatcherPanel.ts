import Phaser from "phaser";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type { RoleView } from "../../state/contracts";
import { label, neon, plate } from "../../presentation/art";
import { TOKENS } from "../../../ui/tokens";

type DispatcherView = Extract<RoleView, { role: "dispatcher" }>;
const C = TOKENS.color;
const colors = [
  C.error,
  C.dispatcher,
  C.cyan,
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
  private readonly targetFrames: Phaser.GameObjects.Graphics[] = [];
  private readonly controlLabels: Phaser.GameObjects.Text[] = [];
  private readonly controlValues: Phaser.GameObjects.Text[] = [];
  private readonly summaryTitle: Phaser.GameObjects.Text;
  private readonly summaryText: Phaser.GameObjects.Text;
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
      const x = 575 + (i % 3) * 262;
      const y = 386 + Math.floor(i / 3) * 92;
      neon(scene, x, y, 246, 79, colors[i]!);
      const frame = scene.add.graphics();
      const text = label(scene, x + 16, y + 21, "", 23, C.text, 220);
      scene.add
        .zone(x, y, 246, 79)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectDestination(i));
      this.targetFrames.push(frame);
      this.targetLabels.push(text);
    }
    for (let i = 0; i < 6; i++) {
      const x = 575 + (i % 3) * 262;
      const y = 778 + Math.floor(i / 3) * 102;
      plate(scene, x, y, 246, 90, C.metal, C.metalEdge, 10);
      const name = label(scene, x + 18, y + 12, "", 21, C.text, 215);
      const value = label(scene, x + 18, y + 48, "", 25, C.text, 215);
      scene.add
        .zone(x, y, 246, 90)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.cycleControl(i));
      this.controlLabels.push(name);
      this.controlValues.push(value);
    }
    this.summaryTitle = label(scene, 1466, 378, "ZIELBANK", 29, C.ink);
    this.summaryText = label(
      scene,
      1466,
      428,
      "Ziel vorwählen.",
      22,
      C.ink,
      278,
    );
    this.summaryText.setLineSpacing(4);
    this.incidentText = label(scene, 1460, 690, "", 21, C.text, 290);
    this.incidentText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.recover());
    neon(scene, 1437, 756, 333, 59, C.warning);
    this.prepareText = label(scene, 1453, 769, "ANLAGE VORBEREITEN", 23);
    this.prepareText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.prepare());
    neon(scene, 1437, 828, 333, 59, C.success);
    this.readyText = label(scene, 1453, 841, "BEREIT MELDEN", 23);
    this.readyText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleReady());
    neon(scene, 1432, 916, 342, 88, C.error);
    this.commitText = label(scene, 1451, 941, "↗ HEBEL SPERRE", 25);
    this.commitText
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.commit());
    const arm = scene.add.graphics();
    arm.lineStyle(10, 0xd9b6a0).lineBetween(0, 0, 0, -45);
    arm.fillStyle(C.error).fillCircle(0, -48, 16);
    this.leverArm = scene.add.container(1720, 982, [arm]);
    this.feedbackText = label(scene, 587, 985, "", 20, C.text, 780);
    this.unsubscribe = network.subscribe(() => this.render());
  }

  private current(): DispatcherView | null {
    const role = this.network.view?.role;
    return role?.role === "dispatcher" ? role : null;
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
    this.scene.tweens.add({
      targets: this.leverArm,
      angle: 64,
      duration: 130,
      yoyo: true,
      ease: "Back.easeIn",
    });
    const sparks = this.scene.add.graphics();
    for (let i = 0; i < 7; i++) {
      sparks
        .lineStyle(3, i % 2 ? C.fire : C.warning)
        .lineBetween(1680 + i * 9, 926, 1660 + i * 14, 890 - (i % 3) * 17);
    }
    sparks.fillStyle(0xa0a4a7, 0.8).fillEllipse(1670, 875, 125, 60);
    this.scene.tweens.add({
      targets: sparks,
      alpha: 0,
      y: -72,
      duration: 650,
      onComplete: () => sparks.destroy(),
    });
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(150, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        45,
        audio.currentTime + 0.22,
      );
      gain.gain.setValueAtTime(0.09, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.24);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.25);
      oscillator.onended = () => void audio.close();
    } catch {
      // Visual feedback remains available when browser audio is unavailable.
    }
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
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x21141f, 0.97).fillRoundedRect(0, 0, 820, 402, 24);
    backdrop
      .lineStyle(10, success ? C.success : C.error)
      .strokeRoundedRect(6, 6, 808, 390, 20);
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
    const soul = this.scene.add.graphics();
    soul.fillStyle(C.cyan).fillCircle(145, 290, 38);
    soul.fillStyle(0x1a2834).fillCircle(132, 282, 5).fillCircle(158, 282, 5);
    const skip = label(this.scene, 600, 328, "ÜBERSPRINGEN →", 22);
    skip
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.closeVignette());
    panel.add([backdrop, title, caption, soul, skip]);
    panel.setDepth(100);
    this.vignette = panel;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
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
        text.setText(
          `${destination.kind === "special" ? "✶ " : ""}${destination.glyph} ${destination.name}`,
        );
        text.setAlpha(1);
        button.textContent = `${destination.kind === "special" ? "Sonderziel" : "Ziel"}: ${destination.name}. ${destination.description}`;
        button.disabled = !shared.activeCaseId;
      } else {
        text.setText("—").setAlpha(0.35);
        button.textContent = "Ziel nicht belegt";
        button.disabled = true;
      }
      const frame = this.targetFrames[i]!;
      frame.clear();
      if (destination?.id === shared.selectedDestination) {
        const x = 575 + (i % 3) * 262;
        const y = 386 + Math.floor(i / 3) * 92;
        frame
          .lineStyle(6, C.warning)
          .strokeRoundedRect(x + 5, y + 5, 236, 69, 12);
      }
    }
    for (let i = 0; i < 6; i++) {
      const control = role.controls[i];
      this.controlLabels[i]!.setText(control?.label ?? "–");
      this.controlValues[i]!.setText(
        control ? `${showValue(control.value)}  ↻` : "",
      );
      this.controlButtons[i]!.textContent = control
        ? `${control.label}: ${showValue(control.value)}. Nächsten Wert wählen.`
        : "Regler nicht belegt";
      this.controlButtons[i]!.disabled = !control || !shared.activeCaseId;
    }
    this.summaryTitle.setText(
      selected ? `${selected.glyph} ${selected.name}` : "ZIELBANK",
    );
    const requirementLines =
      selected?.requirements.map((entry) => {
        const control = role.controls.find(
          (item) => item.id === entry.controlId,
        );
        const matches = control?.value === entry.value;
        return `${matches ? "✓" : "◇"} ${entry.label}: ${showValue(entry.value)}`;
      }) ?? [];
    this.summaryText.setText(
      selected
        ? `${selected.description}\n\nTECHNIK\n${requirementLines.join("\n") || "Keine Vorgaben"}\n\nFreigaben: ${shared.approvals.agent ? "A✓" : "A○"} ${shared.approvals.archivist ? "R✓" : "R○"} ${shared.approvals.dispatcher ? "D✓" : "D○"}`
        : "Neun Regelziele und drei Sonderrohre.\nZiel wählen, Anlage einstellen, Freigaben prüfen.",
    );
    const incident = role.incident;
    const recovered =
      incident &&
      role.controls.find((item) => item.id === incident.recoveryControlId)
        ?.value === incident.recoveryValue;
    this.incidentText.setText(
      incident
        ? `⚠ ${incident.name}: ${incident.diagnosis}\n${recovered ? "↗ GEGENAKTION BESTÄTIGEN" : "Regler korrigieren"}`
        : "✓ Keine aktive Störung",
    );
    this.recoveryButton.textContent = incident
      ? `Störung beheben: ${incident.diagnosis}`
      : "Keine aktive Störung";
    this.recoveryButton.disabled = !incident || !recovered;
    const technicalReady =
      Boolean(selected) &&
      !incident &&
      requirementLines.every((line) => line.startsWith("✓"));
    this.prepareText.setText(
      role.prepared ? "✓ ANLAGE VORBEREITET" : "ANLAGE VORBEREITEN",
    );
    this.prepareText.setAlpha(technicalReady && !role.prepared ? 1 : 0.55);
    this.prepareButton.textContent = role.prepared
      ? "Anlage bereits vorbereitet"
      : "Anlage vorbereiten";
    this.prepareButton.disabled = !technicalReady || role.prepared;
    this.readyText.setText(
      shared.approvals.dispatcher ? "✓ BEREIT · WIDERRUFEN" : "BEREIT MELDEN",
    );
    this.readyText.setAlpha(role.prepared ? 1 : 0.55);
    this.readyButton.textContent = shared.approvals.dispatcher
      ? "Bereitschaft widerrufen"
      : "Bereitschaft melden";
    this.readyButton.disabled = !role.prepared;
    const canCommit =
      role.prepared && Object.values(shared.approvals).every(Boolean);
    this.commitText.setText(
      canCommit
        ? this.armed
          ? "↗ JETZT ZUSTELLEN"
          : "↗ HEBEL ENTSICHERN"
        : "↗ HEBEL GESPERRT",
    );
    this.commitText.setAlpha(canCommit ? 1 : 0.5);
    this.commitButton.textContent = canCommit
      ? this.armed
        ? "Zustellung endgültig auslösen"
        : "Hebel entsichern und Zusammenfassung prüfen"
      : "Hebel gesperrt: Freigaben oder Vorbereitung fehlen";
    this.commitButton.disabled = !canCommit;
    this.feedbackText.setText(this.network.error || this.feedback);
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
