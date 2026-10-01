import Phaser from "phaser";
import { isolateCanvasInput } from "../../../ui/canvasInput";
import type { GameNetwork } from "../../../net/gameNetwork";
import type { CaseId } from "../../core/ids";
import type {
  ArchiveRecordView,
  RoleView,
  RuleEntryView,
} from "../../state/contracts";
import { fitText, label } from "../../presentation/art";
import { workspaceSprite } from "../../../assets/workspaceSprites";
import { ARCHIVE_LAYOUT } from "../../presentation/workspaceLayout";
import { placeholder } from "../../../assets/placeholders";
import { roleSprite } from "../../../assets/roleSprites";
import { TOKENS } from "../../../ui/tokens";
import { searchArchive } from "./archiveSearch";
import { prefersReducedMotion } from "../../../app/options";

type ArchivistView = Extract<RoleView, { role: "archivist" }>;
type Tab = "dossier" | "rules" | "exceptions" | "notes";
const C = TOKENS.color;
const STAMPS = ["verified", "questionable", "reject"] as const;
const STAMP_LABELS = ["✓ VERIFIZIERT", "? FRAGWÜRDIG", "× NICHT FREIGEBEN"];
const cardLine = (value: string): string =>
  value.length > 29 ? `${value.slice(0, 28)}…` : value;

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
  private readonly tabButtons: HTMLButtonElement[] = [];
  private readonly previousContentButton = document.createElement("button");
  private readonly nextContentButton = document.createElement("button");
  private readonly approvalButton = document.createElement("button");
  private readonly pageLabel: Phaser.GameObjects.Text;
  private readonly prevPage: Phaser.GameObjects.Text;
  private readonly nextPage: Phaser.GameObjects.Text;
  private readonly resultLabels: Phaser.GameObjects.Text[] = [];
  private readonly resultPortraits: Phaser.GameObjects.Image[] = [];
  private readonly resultCards: (
    Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice
  )[] = [];
  private readonly pinLabels: Phaser.GameObjects.Text[] = [];
  private readonly dossierTitle: Phaser.GameObjects.Text;
  private readonly dossierText: Phaser.GameObjects.Text;
  private readonly dossierNotes: Phaser.GameObjects.Text;
  private readonly dossierCaseId: Phaser.GameObjects.Text;
  private readonly dossierPortrait: Phaser.GameObjects.Image;
  private readonly contentTitle: Phaser.GameObjects.Text;
  private readonly contentText: Phaser.GameObjects.Text;
  private readonly continuationText: Phaser.GameObjects.Text;
  private readonly contentPage: Phaser.GameObjects.Text;
  private readonly tabMarker: Phaser.GameObjects.Graphics;
  private readonly previousContentPage: Phaser.GameObjects.Text;
  private readonly nextContentPage: Phaser.GameObjects.Text;
  private readonly stampLabels: Phaser.GameObjects.Text[] = [];
  private readonly stampImprint: Phaser.GameObjects.Text;
  private readonly stampImprintFrame: Phaser.GameObjects.Graphics;
  private readonly stampStatus: Phaser.GameObjects.Text;
  private readonly approval: Phaser.GameObjects.Text;
  private readonly drawer: Phaser.GameObjects.Image;
  private readonly figure: Phaser.GameObjects.Image | null;
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
  private lastStamp: (typeof STAMPS)[number] | null = null;
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
    this.figure = scene.children.getByName(
      "archivist-worker",
    ) as Phaser.GameObjects.Image | null;
    isolateCanvasInput(this.root);
    this.root.className = "archivist-controls";
    this.root.setAttribute("aria-label", "Archivarbeitsplatz");
    this.search.className = "archive-search";
    this.search.placeholder = "Name, Alias oder Tag";
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
    this.mirrorResults.setAttribute("aria-live", "polite");
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
      this.tabButtons.push(button);
      this.mirror.append(button);
    }
    this.previousContentButton.textContent = "Vorherige Regelbuchseite";
    this.nextContentButton.textContent = "Nächste Regelbuchseite";
    this.previousContentButton.onclick = () => this.changeContentPage(-1);
    this.nextContentButton.onclick = () => this.changeContentPage(1);
    this.mirror.append(this.previousContentButton, this.nextContentButton);
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
        .zone(ARCHIVE_LAYOUT.tab(index).x, ARCHIVE_LAYOUT.tab(index).y, 46, 53)
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
      806,
      237,
      "Keine Akte geöffnet",
      27,
      C.ink,
      329,
    );
    this.dossierText = label(scene, 806, 295, "", 19, C.ink, 330);
    this.dossierText.setLineSpacing(4);
    this.dossierNotes = label(scene, 615, 501, "", 19, C.ink, 525);
    this.dossierNotes.setLineSpacing(4);
    this.dossierCaseId = label(scene, 1036, 169, "FALL-ID  —", 17, C.ink, 120);
    this.dossierPortrait = placeholder(
      scene,
      "soul",
      632,
      235,
      145,
      179,
    ).setVisible(false);
    this.tabMarker = scene.add.graphics();
    this.contentTitle = label(
      scene,
      1246,
      288,
      "AKTIVE REGELN",
      19,
      C.ink,
      250,
    );
    this.contentText = label(scene, 1246, 323, "", 19, C.ink, 245);
    this.contentText.setLineSpacing(5);
    label(scene, 1550, 288, "FORTSETZUNG", 19, C.ink, 242);
    this.continuationText = label(
      scene,
      1550,
      323,
      "",
      19,
      C.ink,
      245,
    ).setLineSpacing(5);
    this.previousContentPage = label(scene, 1250, 706, "◀", 20, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeContentPage(-1));
    this.contentPage = label(scene, 1450, 706, "", 18, C.ink);
    this.nextContentPage = label(scene, 1780, 706, "▶", 20, C.ink)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeContentPage(1));
    this.drawer = placeholder(scene, "button", 461, 337, 30, 13);
    this.pageLabel = label(scene, 162, 779, "", 18, C.text);
    this.prevPage = label(scene, 407, 778, "◀", 20);
    this.nextPage = label(scene, 458, 778, "▶", 20);
    this.prevPage
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(-1));
    this.nextPage
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(1));
    for (let i = 0; i < 4; i++) {
      const { x, y, w, h } = ARCHIVE_LAYOUT.result(i);
      this.resultCards.push(workspaceSprite(scene, "paper-card", x, y, w, h));
      this.resultPortraits.push(
        placeholder(scene, "soul", x + 12, y + 8, 70, 77),
      );
      const text = label(scene, x + 93, y + 9, "", 18, C.ink, 239);
      scene.add
        .zone(x, y, w, h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectRecord(i));
      this.resultLabels.push(text);
    }
    for (let i = 0; i < 2; i++) {
      const text = label(
        scene,
        1300 + i * 130,
        959,
        `◇ PIN ${i + 1}: frei`,
        16,
        C.text,
        116,
      );
      text
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.pin(i));
      this.pinLabels.push(text);
    }
    for (const [index, stamp] of STAMPS.entries()) {
      const { x, y, w, h } = ARCHIVE_LAYOUT.stamp(index);
      const text = label(scene, x + 15, 954, STAMP_LABELS[index]!, 16);
      text
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.stamp(stamp, index));
      scene.add
        .zone(x, y, w, h)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.stamp(stamp, index));
      this.stampLabels.push(text);
    }
    this.stampStatus = label(scene, 615, 749, "Noch kein Stempel.", 18, C.ink);
    this.stampImprintFrame = scene.add.graphics();
    this.stampImprintFrame
      .lineStyle(3, 0x8e3d31)
      .strokeRoundedRect(1126, 534, 47, 67, 5);
    this.stampImprint = label(scene, 1136, 544, "", 37, "#813529", 39);
    this.stampImprint.setVisible(false);
    this.stampImprintFrame.setVisible(false);
    this.approval = label(scene, 1607, 932, "◇ Freigabe offen", 20);
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
      left: `${bounds.left + 158 * scaleX}px`,
      top: `${bounds.top + 224 * scaleY}px`,
      width: `${200 * scaleX}px`,
      height: `${46 * scaleY}px`,
    });
    Object.assign(this.filter.style, {
      left: `${bounds.left + 365 * scaleX}px`,
      top: `${bounds.top + 224 * scaleY}px`,
      width: `${124 * scaleX}px`,
      height: `${46 * scaleY}px`,
    });
  }
  private current(): ArchivistView | null {
    const role = this.network.view?.role;
    return role?.role === "archivist" ? role : null;
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
  private selectTab(tab: Tab): void {
    this.tab = tab;
    this.contentPageIndex = 0;
    this.render();
  }
  private selectRecord(index: number): void {
    const record = this.results[this.page * 4 + index];
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
      Math.min(this.contentPages.length - 1, this.contentPageIndex + delta * 2),
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
        if (page && this.contentText.height > 365) {
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
      Math.min(Math.ceil(this.results.length / 4) - 1, this.page + delta),
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
    if (!this.submit({ kind: "STAMP", caseId: id, stamp: value })) return;
    if (prefersReducedMotion()) return;
    const stamp = this.stampLabels[index]!;
    this.scene.tweens.killTweensOf(stamp);
    this.scene.tweens.add({
      targets: stamp,
      scaleY: 0.68,
      duration: 150,
      yoyo: true,
      ease: "Back.easeOut",
    });
    if (this.figure)
      this.scene.tweens.add({
        targets: this.figure,
        angle: -7,
        duration: 150,
        yoyo: true,
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
    if (prefersReducedMotion()) return;
    const scrap = roleSprite(this.scene, "torn_record_slip", 146, 538, 52, 60);
    const fragments = roleSprite(
      this.scene,
      "paper_fragments",
      168,
      542,
      46,
      48,
    );
    this.scene.tweens.add({
      targets: [scrap, fragments],
      y: -80,
      x: 45,
      alpha: 0,
      duration: 550,
      onComplete: () => {
        scrap.destroy();
        fragments.destroy();
      },
    });
    this.scene.tweens.add({
      targets: this.drawer,
      x: 435,
      duration: 100,
      yoyo: true,
    });
  }
  private detail(record: ArchiveRecordView, role: ArchivistView): string {
    return [
      `Alias: ${record.aliases.join(", ") || "–"}`,
      `BERUF / EREIGNIS\n${record.occupation || "–"} · ${record.events.join(" · ") || "–"}`,
      `RELEVANTE TAGS\n${record.tags.map((id) => role.tagLabels[id] ?? id).join(" · ") || "–"}`,
      `BESCHWERDE\n${record.complaints.join(" · ") || "–"}`,
      `UNSTIMMIGKEITEN\n${record.warnings.join(" · ") || "keine vermerkt"}`,
      `AKTENVERMERK\n${record.dossier}`,
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
      Math.max(0, Math.ceil(this.results.length / 4) - 1),
    );
    const signature = JSON.stringify([
      this.query,
      this.tagFilter,
      this.page,
      this.selectedRecordId,
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
      const empty = document.createElement("p");
      empty.textContent = "Keine passende Akte";
      this.mirrorResults.replaceChildren(
        ...(this.results.length
          ? this.results
              .slice(this.page * 4, this.page * 4 + 4)
              .map((record) => {
                const button = document.createElement("button");
                button.textContent = `${record.name} · ${record.aliases[0] ?? record.occupation}`;
                button.setAttribute(
                  "aria-pressed",
                  String(record.id === this.selectedRecordId),
                );
                button.onclick = () => this.selectRecordById(record.id);
                return button;
              })
          : [empty]),
      );
    }
    fitText(
      this.pageLabel,
      `${this.results.length} Treffer · Seite ${this.page + 1}`,
      235,
      27,
      18,
    );
    for (let i = 0; i < 4; i++) {
      const record = this.results[this.page * 4 + i];
      const selectedCard = record?.id === this.selectedRecordId;
      const box = ARCHIVE_LAYOUT.result(i);
      this.resultCards[i]!.setX(box.x + (selectedCard ? 7 : 0));
      this.resultPortraits[i]!.setX(
        box.x + 12 + (selectedCard ? 7 : 0),
      ).setVisible(Boolean(record));
      this.resultLabels[i]!.setX(box.x + 93 + (selectedCard ? 7 : 0));
      fitText(
        this.resultLabels[i]!,
        record
          ? `${record.id === this.selectedRecordId ? "▸" : "◇"} ${cardLine(record.aliases[0] ?? record.name)}\n${cardLine(`${record.occupation || "–"} · ${record.events[0] ?? "–"}`)}\n${cardLine(
              record.tags
                .slice(0, 2)
                .map((id) => role.tagLabels[id] ?? id)
                .join(" · "),
            )}`
          : i === 0 && this.results.length === 0
            ? "Keine passende Akte"
            : "",
        235,
        72,
        16,
        13,
      );
      this.resultCards[i]!.setAlpha(1).setY(box.y);
      this.resultLabels[i]!.setAlpha(1).setY(box.y + 9);
    }
    this.prevButton.disabled = this.page === 0;
    this.nextButton.disabled = (this.page + 1) * 4 >= this.results.length;
    this.prevPage.setAlpha(this.prevButton.disabled ? 0.4 : 1);
    this.nextPage.setAlpha(this.nextButton.disabled ? 0.4 : 1);
    const selected = role.archiveRecords.find(
      (item) => item.id === this.selectedRecordId,
    );
    this.dossierCaseId.setText(
      `FALL-ID  ${publicView.activeCaseId?.split(".").at(-1) ?? "—"}`,
    );
    fitText(
      this.dossierTitle,
      selected ? selected.name : "Keine Akte geöffnet",
      330,
      47,
      27,
      18,
    );
    fitText(
      this.dossierText,
      selected
        ? `ALIAS  ${selected.aliases.join(", ") || "—"}\nBERUF  ${selected.occupation || "—"}\nEREIGNIS  ${selected.events.join(" · ") || "—"}`
        : "Karte im linken Schubfach wählen.\nAlias, Ereignis und Beschwerde mit dem Gespräch abgleichen.",
      330,
      135,
      19,
      14,
    );
    fitText(
      this.dossierNotes,
      selected
        ? `TAGS\n${selected.tags.map((id) => role.tagLabels[id] ?? id).join(" · ") || "—"}\n\nBESCHWERDE\n${selected.complaints.join(" · ") || "—"}\n\nUNSTIMMIGKEITEN / OFFENE PUNKTE\n${selected.warnings.join(" · ") || "Keine vermerkt"}\n\nAKTENVERMERK\n${selected.dossier}`
        : "TAGS\n—\n\nBESCHWERDE\n—\n\nUNSTIMMIGKEITEN / OFFENE PUNKTE\n—",
      520,
      230,
      18,
      13,
    );
    this.dossierPortrait.setVisible(Boolean(selected));
    const title = {
      dossier: "AKTE / VERGLEICH",
      rules: "AKTIVE REGELN",
      exceptions: "AUSNAHMEN / QUERVERWEISE",
      notes: "GEMEINSAME NOTIZEN",
    }[this.tab];
    const activeTab = (
      ["dossier", "rules", "exceptions", "notes"] as const
    ).indexOf(this.tab);
    this.tabMarker.clear();
    const activeTabBox = ARCHIVE_LAYOUT.tab(activeTab);
    this.tabMarker
      .lineStyle(3, 0xa96bd3)
      .strokeRect(
        activeTabBox.x - 2,
        activeTabBox.y - 2,
        activeTabBox.w + 4,
        activeTabBox.h + 4,
      );
    this.tabButtons.forEach((button, index) =>
      button.setAttribute("aria-pressed", String(index === activeTab)),
    );
    fitText(this.contentTitle, title, 245, 28, 19, 15);
    const body =
      this.tab === "dossier"
        ? selected
          ? this.detail(selected, role)
          : "Wähle links eine Akte zum Vergleich.\nGleiche Alias, Ereignis und Tags mit dem Gespräch ab."
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
    this.continuationText.setText(
      this.contentPages[this.contentPageIndex + 1] ?? "",
    );
    const hasContentPages = this.contentPages.length > 2;
    this.contentPage.setText(
      hasContentPages
        ? `${this.contentPageIndex + 1}–${Math.min(this.contentPageIndex + 2, this.contentPages.length)} / ${this.contentPages.length}`
        : "",
    );
    this.previousContentPage.setVisible(hasContentPages);
    this.nextContentPage.setVisible(hasContentPages);
    this.previousContentPage.setAlpha(this.contentPageIndex === 0 ? 0.35 : 1);
    this.nextContentPage.setAlpha(
      this.contentPageIndex + 2 >= this.contentPages.length ? 0.35 : 1,
    );
    this.previousContentButton.disabled =
      !hasContentPages || this.contentPageIndex === 0;
    this.nextContentButton.disabled =
      !hasContentPages || this.contentPageIndex + 2 >= this.contentPages.length;
    const accessibleDetail = `${selected ? `${selected.name}. ${this.detail(selected, role)}. ` : ""}${title}. ${this.contentPages.slice(this.contentPageIndex, this.contentPageIndex + 2).join(" ")}`;
    if (this.mirrorDetail.textContent !== accessibleDetail)
      this.mirrorDetail.textContent = accessibleDetail;
    for (let i = 0; i < 2; i++) {
      const recordId = publicView.archivePins[i];
      const record = role.archiveRecords.find((item) => item.id === recordId);
      const name = record?.aliases[0] ?? recordId ?? "frei";
      fitText(this.pinLabels[i]!, `${i + 1}: ${name}`, 116, 31, 16, 13);
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
      365,
      30,
      18,
    );
    if (this.lastStamp !== role.stamp) {
      this.lastStamp = role.stamp;
      this.stampImprint.setAlpha(prefersReducedMotion() ? 1 : 0);
      if (role.stamp && !prefersReducedMotion())
        this.scene.tweens.add({
          targets: this.stampImprint,
          alpha: 1,
          duration: 160,
        });
    }
    const stampIndex = role.stamp ? STAMPS.indexOf(role.stamp) : -1;
    this.stampImprint.setVisible(stampIndex >= 0);
    this.stampImprintFrame.setVisible(stampIndex >= 0);
    if (stampIndex >= 0)
      this.stampImprint.setText(["✓", "?", "×"][stampIndex]!);
    for (const [index, stamp] of STAMPS.entries()) {
      this.stampLabels[index]!.setAlpha(role.stamp === stamp ? 1 : 0.76);
      this.stampButtons[index]!.disabled = !publicView.activeCaseId;
      this.stampButtons[index]!.setAttribute(
        "aria-pressed",
        String(role.stamp === stamp),
      );
    }
    fitText(
      this.approval,
      publicView.selectedDestination
        ? publicView.approvals.archivist
          ? "✓ FREIGABE WIDERRUFEN"
          : "◇ ZIEL FREIGEBEN"
        : "◇ ZIEL NOCH OFFEN",
      213,
      34,
      20,
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
