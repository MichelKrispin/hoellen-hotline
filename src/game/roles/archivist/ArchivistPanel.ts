import Phaser from "phaser";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type {
  ArchiveRecordView,
  RoleView,
  RuleEntryView,
} from "../../state/contracts";
import { fitText, label, plate } from "../../presentation/art";
import { placeholder } from "../../../assets/placeholders";
import { TOKENS } from "../../../ui/tokens";
import { searchArchive } from "./archiveSearch";
import { prefersReducedMotion } from "../../../app/options";

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
  private readonly resultCards: Phaser.GameObjects.NineSlice[] = [];
  private readonly pinLabels: Phaser.GameObjects.Text[] = [];
  private readonly dossierTitle: Phaser.GameObjects.Text;
  private readonly dossierText: Phaser.GameObjects.Text;
  private readonly contentTitle: Phaser.GameObjects.Text;
  private readonly contentText: Phaser.GameObjects.Text;
  private readonly contentPage: Phaser.GameObjects.Text;
  private readonly previousContentPage: Phaser.GameObjects.Text;
  private readonly nextContentPage: Phaser.GameObjects.Text;
  private readonly stampLabels: Phaser.GameObjects.Text[] = [];
  private readonly stampStatus: Phaser.GameObjects.Text;
  private readonly approval: Phaser.GameObjects.Text;
  private readonly drawer: Phaser.GameObjects.Image;
  private readonly unsubscribe: () => void;
  private readonly resize = () => this.positionControls();
  private readonly canvasResize = new ResizeObserver(() =>
    this.positionControls(),
  );
  private query = "";
  private tagFilter: string | null = null;
  private page = 0;
  private selectedRecordId: string | null = null;
  private tab: Tab = "rules";
  private contentPageIndex = 0;
  private contentSource = "";
  private contentPages: string[] = [""];
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
    this.mirror.addEventListener("pointerdown", (event) =>
      event.stopPropagation(),
    );
    this.mirror.addEventListener("pointerup", (event) =>
      event.stopPropagation(),
    );
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
    this.canvasResize.observe(scene.game.canvas);
    window.addEventListener("pointerdown", this.outsidePointer);
    this.positionControls();

    for (let index = 0; index < 4; index++) {
      scene.add
        .zone(1265 + index * 128, 385, 124, 38)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () =>
          this.selectTab(
            (["dossier", "rules", "exceptions", "notes"] as const)[index]!,
          ),
        );
    }
    this.dossierTitle = label(
      scene,
      575,
      407,
      "Keine Akte geöffnet",
      29,
      C.ink,
      585,
    );
    this.dossierText = label(scene, 575, 462, "", 21, C.ink, 580);
    this.dossierText.setLineSpacing(6);
    this.contentTitle = label(
      scene,
      1280,
      439,
      "AKTIVE REGELN",
      24,
      C.ink,
      465,
    );
    this.contentText = label(scene, 1280, 491, "", 20, C.ink, 465);
    this.contentText.setLineSpacing(5);
    this.previousContentPage = label(scene, 1280, 778, "◀", 20, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeContentPage(-1));
    this.contentPage = label(scene, 1480, 778, "", 18, C.ink);
    this.nextContentPage = label(scene, 1740, 778, "▶", 20, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeContentPage(1));
    this.drawer = placeholder(scene, "button", 445, 489, 34, 17);
    this.pageLabel = label(scene, 130, 492, "", 18, C.text);
    this.prevPage = label(scene, 412, 492, "◀", 20);
    this.nextPage = label(scene, 458, 492, "▶", 20);
    this.prevPage
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(-1));
    this.nextPage
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(1));
    for (let i = 0; i < 3; i++) {
      const y = 532 + i * 57;
      this.resultCards.push(
        plate(scene, 124, y, 360, 49, C.paper, 0x9d7155, 6),
      );
      const text = label(scene, 140, y + 10, "", 20, C.ink, 326);
      scene.add
        .zone(124, y, 360, 49)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectRecord(i));
      this.resultLabels.push(text);
    }
    for (let i = 0; i < 2; i++) {
      const text = label(
        scene,
        130,
        850 + i * 43,
        `◇ PIN ${i + 1}: frei`,
        20,
        C.text,
        340,
      );
      text
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.pin(i));
      this.pinLabels.push(text);
    }
    for (const [index, stamp] of STAMPS.entries()) {
      const x = 550 + index * 220;
      const text = label(scene, x + 12, 921, STAMP_LABELS[index]!, 18);
      text
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.stamp(stamp, index));
      this.stampLabels.push(text);
    }
    this.stampStatus = label(scene, 575, 798, "Noch kein Stempel.", 21, C.ink);
    this.approval = label(scene, 1270, 916, "◇ Freigabe offen", 22);
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
      left: `${bounds.left + 136 * scaleX}px`,
      top: `${bounds.top + 412 * scaleY}px`,
      width: `${211 * scaleX}px`,
      height: `${45 * scaleY}px`,
    });
    Object.assign(this.filter.style, {
      left: `${bounds.left + 354 * scaleX}px`,
      top: `${bounds.top + 412 * scaleY}px`,
      width: `${118 * scaleX}px`,
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
    this.contentPageIndex = 0;
    this.render();
  }
  private selectRecord(index: number): void {
    const record = this.results[this.page * 3 + index];
    if (!record) return;
    this.selectRecordById(record.id);
  }
  private selectRecordById(recordId: string): void {
    this.selectedRecordId = recordId;
    this.contentPageIndex = 0;
    this.render();
  }
  private changeContentPage(delta: number): void {
    this.contentPageIndex = Math.max(
      0,
      Math.min(this.contentPages.length - 1, this.contentPageIndex + delta),
    );
    this.render();
  }
  private paginateContent(body: string): string[] {
    const pages: string[] = [];
    let page = "";
    // Phaser measures the wrapped text with the same font used on the page.
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
        this.contentText.setText(candidate);
        if (page && this.contentText.height > 278) {
          pages.push(page);
          page = word;
        } else page = candidate;
        first = false;
      }
    }
    pages.push(page);
    return pages;
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
    const scrap = placeholder(this.scene, "fax-slip", 150, 538, 160, 24);
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
          .map((record) => {
            const button = document.createElement("button");
            button.textContent = `${record.name} · ${record.aliases[0] ?? record.occupation}`;
            button.onclick = () => this.selectRecordById(record.id);
            return button;
          }),
      );
    }
    fitText(
      this.pageLabel,
      `${this.results.length} Treffer · Seite ${this.page + 1}`,
      300,
      28,
      18,
    );
    for (let i = 0; i < 3; i++) {
      const record = this.results[this.page * 3 + i];
      fitText(
        this.resultLabels[i]!,
        record
          ? `${record.id === this.selectedRecordId ? "▸" : "◇"} ${record.aliases[0] ?? record.name}`
          : i === 0 && this.results.length === 0
            ? "Keine passende Akte"
            : "",
        326,
        30,
        20,
        16,
      );
      if (resultsChanged && record && !prefersReducedMotion()) {
        const card = this.resultCards[i]!;
        const text = this.resultLabels[i]!;
        this.scene.tweens.killTweensOf(card);
        this.scene.tweens.killTweensOf(text);
        card.setAlpha(0.25).setY(10);
        text.setAlpha(0.25).setY(532 + i * 57 + 20);
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
          y: 532 + i * 57 + 10,
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
    fitText(
      this.dossierTitle,
      selected
        ? `${selected.name}  /  ${selected.aliases[0] ?? "–"}`
        : "Keine Akte geöffnet",
      585,
      42,
      29,
      21,
    );
    fitText(
      this.dossierText,
      selected
        ? this.detail(selected, role)
        : "Karte im linken Schubfach wählen.\nAlias, Ereignis und Beschwerde mit dem Gespräch abgleichen.",
      580,
      310,
      21,
      16,
    );
    const title = {
      dossier: "AKTE / VERGLEICH",
      rules: "TAGESKLAUSELN",
      exceptions: "AUSNAHMEN / QUERVERWEISE",
      notes: "GEMEINSAME NOTIZEN",
    }[this.tab];
    fitText(this.contentTitle, title, 465, 38, 24, 19);
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
    if (this.contentSource !== body) {
      this.contentSource = body;
      this.contentPages = this.paginateContent(body);
      this.contentPageIndex = Math.min(
        this.contentPageIndex,
        this.contentPages.length - 1,
      );
    }
    this.contentText.setText(this.contentPages[this.contentPageIndex] ?? "");
    const hasContentPages = this.contentPages.length > 1;
    this.contentPage.setText(
      hasContentPages
        ? `Seite ${this.contentPageIndex + 1} / ${this.contentPages.length}`
        : "",
    );
    this.previousContentPage.setVisible(hasContentPages);
    this.nextContentPage.setVisible(hasContentPages);
    this.previousContentPage.setAlpha(this.contentPageIndex === 0 ? 0.35 : 1);
    this.nextContentPage.setAlpha(
      this.contentPageIndex === this.contentPages.length - 1 ? 0.35 : 1,
    );
    const accessibleDetail = `${title}. ${body}`;
    if (this.mirrorDetail.textContent !== accessibleDetail)
      this.mirrorDetail.textContent = accessibleDetail;
    for (let i = 0; i < 2; i++) {
      const recordId = publicView.archivePins[i];
      const record = role.archiveRecords.find((item) => item.id === recordId);
      const name = record?.aliases[0] ?? recordId ?? "frei";
      fitText(this.pinLabels[i]!, `◇ PIN ${i + 1}: ${name}`, 340, 30, 20, 16);
      this.pinButtons[i]!.textContent =
        `Pin ${i + 1}: ${name}. ${recordId && (!selected || recordId === this.selectedRecordId) ? "Lösen" : recordId ? "Ersetzen" : "Ausgewählte Akte pinnen"}`;
      this.pinButtons[i]!.disabled =
        !publicView.activeCaseId ||
        (!selected && !recordId) ||
        i > publicView.archivePins.length;
    }
    fitText(
      this.stampStatus,
      `Stempel: ${role.stamp ? STAMP_LABELS[STAMPS.indexOf(role.stamp)] : "–"}`,
      445,
      30,
      21,
    );
    for (const [index, stamp] of STAMPS.entries()) {
      this.stampLabels[index]!.setAlpha(role.stamp === stamp ? 1 : 0.76);
      this.stampButtons[index]!.disabled = !publicView.activeCaseId;
    }
    fitText(
      this.approval,
      publicView.selectedDestination
        ? publicView.approvals.archivist
          ? "✓ FREIGABE WIDERRUFEN"
          : "◇ ZIEL FREIGEBEN"
        : "◇ ZIEL NOCH OFFEN",
      414,
      34,
      22,
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
    this.canvasResize.disconnect();
    window.removeEventListener("pointerdown", this.outsidePointer);
    this.root.remove();
  }
}
