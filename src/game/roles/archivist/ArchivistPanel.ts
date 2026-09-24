import Phaser from "phaser";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type {
  ArchiveRecordView,
  RoleView,
  RuleEntryView,
} from "../../state/contracts";
import { label, plate } from "../../presentation/art";
import { TOKENS } from "../../../ui/tokens";
import { searchArchive } from "./archiveSearch";

type ArchivistView = Extract<RoleView, { role: "archivist" }>;
type Tab = "dossier" | "rules" | "exceptions" | "notes";
const C = TOKENS.color;
const STAMPS = ["verified", "questionable", "reject"] as const;
const STAMP_LABELS = ["✓ VERIFIZIERT", "? FRAGWÜRDIG", "× NICHT FREIGEBEN"];

export class ArchivistPanel {
  private readonly root = document.createElement("section");
  private readonly search = document.createElement("input");
  private readonly filter = document.createElement("select");
  private readonly mirror = document.createElement("div");
  private readonly mirrorResults = document.createElement("div");
  private readonly mirrorDetail = document.createElement("p");
  private readonly mirrorStatus = document.createElement("p");
  private readonly prevButton = document.createElement("button");
  private readonly nextButton = document.createElement("button");
  private readonly pinButtons: HTMLButtonElement[] = [];
  private readonly stampButtons: HTMLButtonElement[] = [];
  private readonly approvalButton = document.createElement("button");
  private readonly pageLabel: Phaser.GameObjects.Text;
  private readonly prevPage: Phaser.GameObjects.Text;
  private readonly nextPage: Phaser.GameObjects.Text;
  private readonly resultLabels: Phaser.GameObjects.Text[] = [];
  private readonly resultCards: Phaser.GameObjects.Graphics[] = [];
  private readonly pinLabels: Phaser.GameObjects.Text[] = [];
  private readonly contentTitle: Phaser.GameObjects.Text;
  private readonly contentText: Phaser.GameObjects.Text;
  private readonly stampLabels: Phaser.GameObjects.Text[] = [];
  private readonly stampStatus: Phaser.GameObjects.Text;
  private readonly approval: Phaser.GameObjects.Text;
  private readonly drawer: Phaser.GameObjects.Graphics;
  private readonly unsubscribe: () => void;
  private readonly resize = () => this.positionControls();
  private query = "";
  private tagFilter: string | null = null;
  private page = 0;
  private selectedRecordId: string | null = null;
  private tab: Tab = "rules";
  private results: ArchiveRecordView[] = [];
  private renderedResults = "";
  private feedback = "";
  private lastCommand = "";
  private pendingUntil = 0;
  private lastEjectionAt = 0;
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
    this.root.className = "archivist-controls";
    this.root.setAttribute("aria-label", "Archivarbeitsplatz");
    this.search.className = "archive-search";
    this.search.placeholder = "Name, Alias, Beruf, Ereignis oder Tag";
    this.search.setAttribute("aria-label", "Akten durchsuchen");
    this.search.oninput = () => {
      this.query = this.search.value;
      this.page = 0;
      this.render(true);
    };
    this.filter.className = "archive-filter";
    this.filter.setAttribute("aria-label", "Akten nach Tag filtern");
    this.filter.onchange = () => {
      this.tagFilter = this.filter.value || null;
      this.page = 0;
      this.render(true);
    };
    this.mirror.className = "archivist-mirror";
    this.mirror.setAttribute(
      "aria-label",
      "Akten, Regelbuch und Stempel per Tastatur",
    );
    this.mirror.addEventListener("focusin", () => {
      this.mirror.dataset.open = "true";
    });
    this.mirrorDetail.setAttribute("role", "status");
    this.mirrorStatus.setAttribute("aria-live", "polite");
    this.prevButton.textContent = "Vorherige Akten";
    this.nextButton.textContent = "Nächste Akten";
    this.prevButton.onclick = () => this.changePage(-1);
    this.nextButton.onclick = () => this.changePage(1);
    this.mirror.append(this.mirrorResults, this.prevButton, this.nextButton);
    for (const [tab, title] of [
      ["dossier", "Akte"],
      ["rules", "Regeln"],
      ["exceptions", "Ausnahmen"],
      ["notes", "Notizen"],
    ] as const) {
      const button = document.createElement("button");
      button.textContent = title;
      button.onclick = () => this.selectTab(tab);
      this.mirror.append(button);
    }
    for (let i = 0; i < 2; i++) {
      const button = document.createElement("button");
      button.onclick = () => this.pin(i);
      this.pinButtons.push(button);
      this.mirror.append(button);
    }
    for (const [index, stamp] of STAMPS.entries()) {
      const button = document.createElement("button");
      button.textContent = STAMP_LABELS[index]!;
      button.onclick = () => this.stamp(stamp, index);
      this.stampButtons.push(button);
      this.mirror.append(button);
    }
    this.approvalButton.onclick = () => this.toggleApproval();
    this.mirror.append(
      this.approvalButton,
      this.mirrorDetail,
      this.mirrorStatus,
    );
    this.root.append(this.search, this.filter, this.mirror);
    document.body.append(this.root);
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointerdown", this.outsidePointer);
    this.positionControls();

    for (const [index, y] of [353, 472, 591, 710].entries()) {
      scene.add
        .zone(126, y, 388, 92)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () =>
          this.selectTab(
            (["dossier", "rules", "exceptions", "notes"] as const)[index]!,
          ),
        );
    }
    this.contentTitle = label(scene, 619, 430, "AKTIVE REGELN", 27, C.ink, 570);
    this.contentText = label(scene, 619, 488, "", 21, C.ink, 565);
    this.contentText.setLineSpacing(5);
    this.drawer = scene.add.graphics();
    this.drawer.fillStyle(C.dispatcher).fillRoundedRect(442, 378, 42, 18, 6);
    this.pageLabel = label(scene, 1326, 475, "", 18, C.ink);
    this.prevPage = label(scene, 1652, 475, "◀", 20, C.ink);
    this.nextPage = label(scene, 1722, 475, "▶", 20, C.ink);
    this.prevPage
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(-1));
    this.nextPage
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(1));
    for (let i = 0; i < 3; i++) {
      const y = 499 + i * 46;
      this.resultCards.push(
        plate(scene, 1319, y, 444, 42, C.paper, 0x9d7155, 6),
      );
      const text = label(scene, 1334, y + 7, "", 21, C.ink, 412);
      scene.add
        .zone(1319, y, 444, 42)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectRecord(i));
      this.resultLabels.push(text);
    }
    for (let i = 0; i < 2; i++) {
      const text = label(
        scene,
        1332,
        640 + i * 36,
        `◇ PIN ${i + 1}: frei`,
        21,
        C.ink,
        425,
      );
      text
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.pin(i));
      this.pinLabels.push(text);
    }
    for (const [index, stamp] of STAMPS.entries()) {
      const x = 603 + index * 290;
      const text = label(scene, x + 14, 918, STAMP_LABELS[index]!, 22);
      text
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.stamp(stamp, index));
      this.stampLabels.push(text);
    }
    this.stampStatus = label(scene, 619, 823, "Noch kein Stempel.", 22, C.ink);
    this.approval = label(scene, 619, 785, "◇ Freigabe offen", 22, C.ink);
    this.approval
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleApproval());
    this.unsubscribe = network.subscribe(() => this.render());
  }

  private positionControls(): void {
    const bounds = this.scene.game.canvas.getBoundingClientRect();
    const scaleX = bounds.width / 1920;
    const scaleY = bounds.height / 1080;
    Object.assign(this.search.style, {
      left: `${bounds.left + 1324 * scaleX}px`,
      top: `${bounds.top + 422 * scaleY}px`,
      width: `${285 * scaleX}px`,
      height: `${45 * scaleY}px`,
    });
    Object.assign(this.filter.style, {
      left: `${bounds.left + 1615 * scaleX}px`,
      top: `${bounds.top + 422 * scaleY}px`,
      width: `${148 * scaleX}px`,
      height: `${45 * scaleY}px`,
    });
  }
  private current(): ArchivistView | null {
    const role = this.network.view?.role;
    return role?.role === "archivist" ? role : null;
  }
  private caseId(): CaseId | null {
    return this.network.view?.public.activeCaseId ?? null;
  }
  private submit(command: Parameters<GameNetwork["submit"]>[0]): void {
    const key = JSON.stringify(command);
    if (this.lastCommand === key && performance.now() < this.pendingUntil)
      return;
    const error = this.network.submit(command);
    this.feedback = error ?? "Anweisung übermittelt.";
    if (!error) {
      this.lastCommand = key;
      this.pendingUntil = performance.now() + 450;
    }
    this.render();
  }
  private selectTab(tab: Tab): void {
    this.tab = tab;
    this.render();
  }
  private selectRecord(index: number): void {
    const record = this.results[this.page * 3 + index];
    if (!record) return;
    this.selectedRecordId = record.id;
    this.tab = "dossier";
    this.render();
  }
  private changePage(delta: number): void {
    this.page = Math.max(
      0,
      Math.min(Math.ceil(this.results.length / 3) - 1, this.page + delta),
    );
    this.render(true);
  }
  private pin(slot: number): void {
    const id = this.caseId();
    const recordId = this.selectedRecordId;
    const pins = this.network.view?.public.archivePins ?? [];
    if (!id || slot > pins.length) return;
    if (pins[slot] && (!recordId || pins[slot] === recordId))
      this.submit({ kind: "ARCHIVE_UNPIN", caseId: id, index: slot });
    else if (recordId)
      this.submit({
        kind: "ARCHIVE_PIN",
        caseId: id,
        recordId,
        ...(slot < pins.length ? { replaceIndex: slot } : {}),
      });
  }
  private stamp(value: (typeof STAMPS)[number], index: number): void {
    const id = this.caseId();
    if (!id) return;
    this.submit({ kind: "STAMP", caseId: id, stamp: value });
    this.scene.tweens.add({
      targets: this.stampLabels[index],
      scaleY: 0.68,
      duration: 110,
      yoyo: true,
      ease: "Back.easeOut",
    });
  }
  private toggleApproval(): void {
    const id = this.caseId();
    const view = this.network.view?.public;
    if (id && view?.selectedDestination)
      this.submit({
        kind: "APPROVE",
        caseId: id,
        approved: !view.approvals.archivist,
      });
  }
  private ejectPaper(): void {
    if (performance.now() - this.lastEjectionAt < 550) return;
    this.lastEjectionAt = performance.now();
    const scrap = this.scene.add.graphics();
    scrap.fillStyle(C.paper).fillRoundedRect(1330, 506, 160, 24, 4);
    scrap.lineStyle(2, C.error).strokeRoundedRect(1330, 506, 160, 24, 4);
    this.scene.tweens.add({
      targets: scrap,
      y: -80,
      x: 45,
      alpha: 0,
      duration: 550,
      onComplete: () => scrap.destroy(),
    });
    this.scene.tweens.add({
      targets: this.drawer,
      x: 15,
      duration: 100,
      yoyo: true,
    });
  }
  private detail(record: ArchiveRecordView, role: ArchivistView): string {
    return [
      record.name,
      `Alias: ${record.aliases.join(", ") || "–"}`,
      `Beruf: ${record.occupation || "–"}`,
      `Ereignis: ${record.events.join(" · ") || "–"}`,
      `Tags: ${record.tags.map((id) => role.tagLabels[id] ?? id).join(" · ")}`,
      `Beschwerde: ${record.complaints.join(" · ") || "–"}`,
      `Akte: ${record.dossier}`,
      `Unstimmigkeit: ${record.warnings.join(" · ") || "keine vermerkt"}`,
    ].join("\n");
  }
  private ruleDetail(entries: RuleEntryView[], all: RuleEntryView[]): string {
    if (!entries.length) return "Für diese Schicht liegt kein Eintrag vor.";
    return entries
      .map(
        (entry) =>
          `${entry.active ? "● AKTIV" : "○ RUHT"} · Priorität ${entry.priority}\n${entry.text}\nZiel: ${entry.destination}${entry.overrides ? `\nÜberschreibt: ${all.find((rule) => rule.id === entry.overrides)?.text ?? entry.overrides}` : ""}`,
      )
      .join("\n\n");
  }
  private render(forceResults = false): void {
    const role = this.current();
    const publicView = this.network.view?.public;
    if (!role || !publicView) return;
    const tagOptions = Object.entries(role.tagLabels).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const tagSignature = JSON.stringify(tagOptions);
    if (this.filter.dataset.signature !== tagSignature) {
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "Alle Tags";
      this.filter.replaceChildren(
        all,
        ...tagOptions.map(([id, name]) => {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = name;
          return option;
        }),
      );
      this.filter.dataset.signature = tagSignature;
      this.filter.value = this.tagFilter ?? "";
    }
    this.results = searchArchive(
      role.archiveRecords,
      this.query,
      this.tagFilter,
      publicView.publishedTags,
      role.tagLabels,
    );
    this.page = Math.min(
      this.page,
      Math.max(0, Math.ceil(this.results.length / 3) - 1),
    );
    const signature = JSON.stringify([
      this.query,
      this.tagFilter,
      this.page,
      this.results.map((item) => item.id),
    ]);
    if (
      forceResults &&
      this.query.trim() &&
      !this.results.length &&
      signature !== this.renderedResults
    )
      this.ejectPaper();
    const resultsChanged = signature !== this.renderedResults;
    if (resultsChanged) {
      this.renderedResults = signature;
      this.mirrorResults.replaceChildren(
        ...this.results
          .slice(this.page * 3, this.page * 3 + 3)
          .map((record, index) => {
            const button = document.createElement("button");
            button.textContent = `${record.name} · ${record.aliases[0] ?? record.occupation}`;
            button.onclick = () => this.selectRecord(index);
            return button;
          }),
      );
    }
    this.pageLabel.setText(
      `${this.results.length} Treffer · Seite ${this.page + 1}`,
    );
    for (let i = 0; i < 3; i++) {
      const record = this.results[this.page * 3 + i];
      this.resultLabels[i]!.setText(
        record
          ? `${record.id === this.selectedRecordId ? "▸" : "◇"} ${record.aliases[0] ?? record.name}`
          : i === 0 && this.results.length === 0
            ? "Keine passende Akte"
            : "",
      );
      if (
        resultsChanged &&
        record &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const card = this.resultCards[i]!;
        const text = this.resultLabels[i]!;
        this.scene.tweens.killTweensOf(card);
        this.scene.tweens.killTweensOf(text);
        card.setAlpha(0.25).setY(10);
        text.setAlpha(0.25).setY(499 + i * 46 + 17);
        this.scene.tweens.add({
          targets: card,
          alpha: 1,
          y: 0,
          duration: 180,
          delay: i * 55,
        });
        this.scene.tweens.add({
          targets: text,
          alpha: 1,
          y: 499 + i * 46 + 7,
          duration: 180,
          delay: i * 55,
        });
      }
    }
    this.prevButton.disabled = this.page === 0;
    this.nextButton.disabled = (this.page + 1) * 3 >= this.results.length;
    this.prevPage.setAlpha(this.prevButton.disabled ? 0.4 : 1);
    this.nextPage.setAlpha(this.nextButton.disabled ? 0.4 : 1);
    const selected = role.archiveRecords.find(
      (item) => item.id === this.selectedRecordId,
    );
    const title = {
      dossier: "AKTE / VERGLEICH",
      rules: "TAGESKLAUSELN",
      exceptions: "AUSNAHMEN / QUERVERWEISE",
      notes: "GEMEINSAME NOTIZEN",
    }[this.tab];
    this.contentTitle.setText(title);
    const body =
      this.tab === "dossier"
        ? selected
          ? this.detail(selected, role)
          : "Wähle rechts eine Akte zum Vergleich.\nGleiche Alias, Ereignis und Tags mit dem Gespräch ab."
        : this.tab === "rules"
          ? this.ruleDetail(
              role.ruleEntries.filter((item) => item.kind === "rule"),
              role.ruleEntries,
            )
          : this.tab === "exceptions"
            ? this.ruleDetail(
                role.ruleEntries.filter((item) => item.kind === "exception"),
                role.ruleEntries,
              )
            : `Agentenhinweise: ${publicView.publishedTags.map((id) => role.tagLabels[id] ?? id).join(" · ") || "–"}\nGepinnte Akten: ${publicView.archivePins.map((id) => role.archiveRecords.find((item) => item.id === id)?.aliases[0] ?? id).join(" · ") || "–"}\nZielbitte: ${publicView.suggestedDestination ?? "–"}\nVorbereitetes Ziel: ${publicView.selectedDestination ?? "–"}`;
    this.contentText.setText(body);
    const accessibleDetail = `${title}. ${body}`;
    if (this.mirrorDetail.textContent !== accessibleDetail)
      this.mirrorDetail.textContent = accessibleDetail;
    for (let i = 0; i < 2; i++) {
      const recordId = publicView.archivePins[i];
      const record = role.archiveRecords.find((item) => item.id === recordId);
      const name = record?.aliases[0] ?? recordId ?? "frei";
      this.pinLabels[i]!.setText(`◇ PIN ${i + 1}: ${name}`);
      this.pinButtons[i]!.textContent =
        `Pin ${i + 1}: ${name}. ${recordId && (!selected || recordId === this.selectedRecordId) ? "Lösen" : recordId ? "Ersetzen" : "Ausgewählte Akte pinnen"}`;
      this.pinButtons[i]!.disabled =
        !publicView.activeCaseId ||
        (!selected && !recordId) ||
        i > publicView.archivePins.length;
    }
    this.stampStatus.setText(
      `Stempel: ${role.stamp ? STAMP_LABELS[STAMPS.indexOf(role.stamp)] : "–"}`,
    );
    for (const [index, stamp] of STAMPS.entries()) {
      this.stampLabels[index]!.setAlpha(role.stamp === stamp ? 1 : 0.76);
      this.stampButtons[index]!.disabled = !publicView.activeCaseId;
    }
    this.approval.setText(
      publicView.selectedDestination
        ? publicView.approvals.archivist
          ? "✓ FREIGABE WIDERRUFEN"
          : "◇ ZIEL FREIGEBEN"
        : "◇ ZIEL NOCH OFFEN",
    );
    this.approvalButton.textContent = publicView.approvals.archivist
      ? "Freigabe widerrufen"
      : "Vorbereitetes Ziel freigeben";
    this.approvalButton.disabled = !publicView.selectedDestination;
    const status = `Stempel: ${role.stamp ? STAMP_LABELS[STAMPS.indexOf(role.stamp)] : "keiner"}. ${this.network.error || this.feedback}`;
    if (this.mirrorStatus.textContent !== status)
      this.mirrorStatus.textContent = status;
  }
  destroy(): void {
    this.unsubscribe();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointerdown", this.outsidePointer);
    this.root.remove();
  }
}
