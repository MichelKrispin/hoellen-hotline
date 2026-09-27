import type { GameNetwork } from "../net/gameNetwork";
import { CAMPAIGN_CATALOG } from "../content/catalog";
import { nextScenario, readLocalProgress } from "../game/campaign/progress";
import { FREE_PLAY_PRESETS } from "../game/modes/config";
import { SIMULATION_VERSION } from "../game/state/simulation";
import { reactionUrl } from "../assets/reactions";
import { AudioSystem, type AudioBus } from "../audio/AudioSystem";
import { GAMEPLAY_HASH_VERSION } from "../content/schemas";
import { PROTOCOL_VERSION } from "../net/protocol";
import type { PublicShiftView } from "../game/state/contracts";

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function tutorialChecklist(view: PublicShiftView): string {
  const tutorial = view.tutorial;
  if (!tutorial) return "";
  const finished = view.phase === "results";
  const steps: [string, boolean][] =
    tutorial.stage === "stations"
      ? [
          ["Agent · geteilten Tag erkennen", tutorial.stations.agent],
          ["Archiv · geteilten Pin erkennen", tutorial.stations.archivist],
          ["Disposition · Freigaben verstehen", tutorial.stations.dispatcher],
        ]
      : [
          ["Anruf · Agent", finished || Boolean(view.activeCaseId)],
          ["Tag · Agent", finished || view.publishedTags.length > 0],
          ["Pin · Archiv", finished || view.archivePins.length > 0],
          ["Ziel · Disposition", finished || Boolean(view.selectedDestination)],
          [
            "Freigaben · alle drei",
            finished || Object.values(view.approvals).every(Boolean),
          ],
          ["Zustellung · Disposition", finished],
        ];
  return `<ol class="tutorial-checklist" aria-label="Tutorialaufgaben">${steps
    .map(
      ([label, done]) =>
        `<li class="${done ? "is-done" : ""}"><span aria-hidden="true">${done ? "✓" : "○"}</span> ${label}</li>`,
    )
    .join("")}</ol>`;
}
export class GameNetworkOverlay {
  private root = document.createElement("section");
  private reportRoot = document.createElement("section");
  private reportDismissed = false;
  private inputs: [string, string] = ["", ""];
  private guestOffer = "";
  private notice = "";
  private lastStatus = "";
  private lastTutorialKey = "";
  private lastChecklist = "";
  private lastReactionKey = "";
  private lastAttention = false;
  readonly audio = new AudioSystem();
  constructor(private readonly network: GameNetwork) {
    this.root.className = "game-network-overlay";
    if (network.role === "archivist")
      this.root.classList.add("archive-network-overlay");
    if (network.lobby.mode.kind === "tutorial")
      this.root.classList.add("tutorial-overlay");
    this.root.setAttribute("aria-label", "Netzwerkstatus");
    document.body.append(this.root);
    this.reportRoot.className = "shift-report";
    this.reportRoot.setAttribute("aria-label", "Abschlussakte");
    document.body.append(this.reportRoot);
    this.reportRoot.addEventListener("click", (event) => {
      if (
        (event.target as HTMLElement).closest('[data-action="close-report"]')
      ) {
        this.reportDismissed = true;
        this.renderReport();
      }
    });
    if (import.meta.env.DEV)
      (
        window as typeof window & {
          __closeGameChannel?: (slot: 0 | 1 | 2) => void;
        }
      ).__closeGameChannel = (slot) => network.lobby.channelFor(slot)?.close();
    network.onChange = () => this.render();
    network.lobby.onChange = () => this.render(network.status !== "active");
    this.root.addEventListener("input", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.dataset.audioBus) {
        this.audio.setVolume(
          target.dataset.audioBus as AudioBus,
          Number(target.value) / 100,
        );
        return;
      }
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (target.id === "reconnect-offer") this.guestOffer = target.value;
      if (target.id === "reconnect-answer-1") this.inputs[0] = target.value;
      if (target.id === "reconnect-answer-2") this.inputs[1] = target.value;
    });
    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action =
        target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action) {
        this.audio.tone("ui", 480);
        void this.act(action);
      }
    });
    this.render();
  }
  private async act(action: string): Promise<void> {
    try {
      this.notice = "";
      if (action.startsWith("reconnect-slot-"))
        await this.network.lobby.createReconnectOffer(
          Number(action.slice(-1)) as 1 | 2,
        );
      else if (action.startsWith("import-slot-"))
        await this.network.lobby.importAnswer(
          this.inputs[Number(action.slice(-1)) - 1]!,
          Number(action.slice(-1)) as 1 | 2,
        );
      else if (action === "guest-rejoin")
        await this.network.lobby.rejoin(
          this.guestOffer,
          this.network.lobby.members[this.network.lobby.localSlot].name,
        );
      else if (action === "toggle-pause") {
        const command =
          this.network.view?.public.pauseReason === "host-menu"
            ? "RESUME"
            : "PAUSE";
        const error = this.network.submit({ kind: command });
        if (error) this.notice = error;
      } else if (action === "tutorial-station") {
        const answer =
          this.root.querySelector<HTMLSelectElement>("#tutorial-answer")?.value;
        if (answer) {
          const error = this.network.submit({
            kind: "COMPLETE_TUTORIAL_STATION",
            answer,
          });
          if (error)
            this.notice =
              error === "Tutorial station answer is incorrect"
                ? "Das ist noch nicht richtig. Lies den Hinweis zur Sichtbarkeit und versuche es erneut."
                : error;
        } else this.notice = "Wähle zuerst eine Antwort auf die Stationsfrage.";
      } else if (action === "open-report") this.reportDismissed = false;
      else if (action === "audio-unlock") {
        this.notice = (await this.audio.unlock())
          ? "Audio aktiviert."
          : "Audio ist im Browser nicht verfügbar.";
        this.audio.playJingle();
      } else if (action.startsWith("copy-")) {
        const value =
          action === "copy-answer"
            ? this.network.lobby.answerLink
            : this.network.lobby.getSlot(Number(action.slice(-1)) as 1 | 2)
                .offerLink;
        try {
          await navigator.clipboard.writeText(value);
          this.notice = "Link kopiert.";
        } catch {
          this.notice =
            "Zwischenablage nicht verfügbar. Feld manuell kopieren.";
        }
      }
    } catch (error) {
      this.notice =
        error instanceof Error ? error.message : "Reconnect fehlgeschlagen.";
    }
    this.render(true);
  }
  private renderReport(): void {
    const report = this.network.view?.public.report;
    if (!report || this.reportDismissed) {
      this.reportRoot.hidden = true;
      return;
    }
    this.reportRoot.hidden = false;
    const score = report.score;
    const goodShift =
      report.endReason === "completed" && score.resolvedIncorrectly === 0;
    this.reportRoot.innerHTML = `<div class="shift-report-paper ${goodShift ? "report-good" : "report-troubled"}"><button data-action="close-report" aria-label="Abschlussakte schließen">×</button><h1>Abschlussakte</h1><p class="report-verdict">${goodShift ? "✓ Dienstbeurteilung: Tadellos absurd" : "⚠ Dienstbeurteilung: Kessel glüht"}</p><p>Schichtzeit: ${Math.floor(report.elapsedMs / 60_000)} min ${Math.floor((report.elapsedMs % 60_000) / 1000)} s · Mittlere Fallzeit: ${Math.round(report.averageCaseMs / 1000)} s</p><div class="report-score"><span>✓ Korrekt ${score.resolvedCorrectly}</span><span>◇ Vertretbar ${score.resolvedAcceptably}</span><span>× Falsch ${score.resolvedIncorrectly}</span><span>⚠ Katastrophal ${score.catastrophicErrors}</span></div><h2>Fallchronik</h2><ol>${report.cases.map((item) => `<li class="${item.outcome === "wrong" || item.outcome === "catastrophic" ? "report-error" : ""}">${escapeHtml(item.id)} · ${escapeHtml(item.outcome ?? "abgebrochen")} · ${escapeHtml(item.selectedDestination ?? "kein Ziel")} ${item.outcome === "wrong" || item.outcome === "catastrophic" ? `→ ${escapeHtml(item.trueDestination)}` : ""}</li>`).join("")}</ol><p class="report-seed">Seed: ${escapeHtml(report.seed)}<br>Content-Hash v${GAMEPLAY_HASH_VERSION}: ${escapeHtml(report.contentHash)}<br>Simulation v${SIMULATION_VERSION} · Protokoll v${PROTOCOL_VERSION}</p></div>`;
    if (this.network.lobby.mode.kind === "freePlay") {
      const mode = this.network.lobby.mode;
      const preset = FREE_PLAY_PRESETS[mode.preset];
      this.reportRoot
        .querySelector(".shift-report-paper")
        ?.insertAdjacentHTML(
          "beforeend",
          `<p>Freies Spiel: ${escapeHtml(preset.label)} · ${mode.caseCount ?? preset.cases} Fälle · Simulation v${SIMULATION_VERSION}</p><label>Reproduzierbare Konfiguration<textarea readonly aria-label="Freies-Spiel-Konfiguration">${escapeHtml(JSON.stringify(mode))}</textarea></label>`,
        );
    }
    const progress = this.network.exportCampaignProgress();
    const mode = this.network.lobby.mode;
    if (mode.kind === "campaign") {
      const pkg = CAMPAIGN_CATALOG.find(
        (item) => item.manifest.id === mode.campaignId,
      );
      const scenario = pkg?.scenarios.find(
        (item) => item.id === mode.scenarioId,
      );
      const outro = scenario?.outro ? pkg?.translations[scenario.outro] : null;
      const next =
        this.network.isHost && pkg
          ? nextScenario(readLocalProgress(), pkg)
          : null;
      const note = this.network.isHost
        ? next
          ? `Nächstes freigeschaltetes Szenario: ${pkg?.translations[pkg.scenarios.find((item) => item.id === next)?.titleKey ?? ""] ?? next}`
          : "Die Kampagne ist abgeschlossen."
        : "Abschlussvermerk lokal gespeichert. Der Host verwaltet die Kampagnenfreischaltung.";
      this.reportRoot
        .querySelector(".shift-report-paper")
        ?.insertAdjacentHTML(
          "beforeend",
          `<p>${escapeHtml(outro ?? "")}</p><p>${escapeHtml(note)}</p>`,
        );
    }
    if (progress)
      this.reportRoot
        .querySelector(".shift-report-paper")
        ?.insertAdjacentHTML(
          "beforeend",
          `<label>Kampagnenfortschritt exportieren<textarea readonly aria-label="Kampagnenfortschritt zum Kopieren">${escapeHtml(progress)}</textarea></label>`,
        );
    if (this.network.lobby.mode.kind === "tutorial")
      this.reportRoot
        .querySelector(".shift-report-paper")
        ?.insertAdjacentHTML(
          "beforeend",
          "<p>Übung abgeschlossen: Tags und Pins sind bewusst geteilt; Dialogantworten, vollständige Akten und Maschinenwerte bleiben am jeweiligen Arbeitsplatz. Teile deinen Bildschirm nicht.</p>",
        );
  }
  private render(force = false): void {
    this.renderReport();
    const view = this.network.view;
    document.documentElement.dataset.contentHash =
      view?.public.report?.contentHash ?? this.network.lobby.modeHash ?? "";
    const tutorial = view?.public.tutorial;
    const tutorialKey = tutorial
      ? `${tutorial.stage}:${tutorial.stations[this.network.role]}`
      : "none";
    if (tutorialKey !== this.lastTutorialKey) force = true;
    this.lastTutorialKey = tutorialKey;
    const activeIncident =
      view?.role.role === "dispatcher" ? view.role.incident : null;
    const reaction = activeIncident
      ? {
          caseId: view?.public.activeCaseId ?? activeIncident.id,
          assetId: activeIncident.reactionAssetId,
          caption: activeIncident.reactionCaption,
        }
      : view?.public.lastReaction;
    const reactionKey = reaction
      ? `${reaction.caseId}:${reaction.assetId}`
      : "none";
    const newReaction = reactionKey !== this.lastReactionKey && !!reaction;
    if (reactionKey !== this.lastReactionKey) {
      force = true;
      if (reaction) this.audio.tone("sfx", activeIncident ? 165 : 330);
    }
    this.lastReactionKey = reactionKey;
    if (view)
      this.audio.setEscalation(
        Math.max(
          view.public.queuePressure,
          view.public.boilerPressure,
          view.public.auditRisk,
        ) / 100,
      );
    const reactionImage = reaction ? reactionUrl(reaction.assetId) : null;
    const reactionHtml =
      reaction && reactionImage
        ? `<figure class="network-reaction"><img src="${escapeHtml(reactionImage)}" alt=""><figcaption>${escapeHtml(reaction.caption)}</figcaption></figure>`
        : "";
    const tutorialHint = (() => {
      if (!tutorial) return "";
      if (view?.public.phase === "results")
        return "Übung abgeschlossen. Öffnet gemeinsam die Abschlussakte und besprecht, welche Hinweise ihr geteilt habt.";
      if (view?.public.phase !== "shift") return "";
      if (tutorial.stage === "stations")
        return tutorial.stations[this.network.role]
          ? `Station abgeschlossen (${Object.values(tutorial.stations).filter(Boolean).length}/3). Warte auf die übrigen Arbeitsplätze. Sprecht schon jetzt darüber, welche Hinweise ihr weitergeben könnt; teilt eure Bildschirme nicht.`
          : this.network.role === "agent"
            ? "Station Agent · Du sprichst mit dem Anrufer. Dialogantworten und entdeckte Hinweise siehst zunächst nur du. Über Hinweis veröffentlichen wird ein Tag für alle sichtbar. Welcher Eintrag wird geteilt?"
            : this.network.role === "archivist"
              ? "Station Archiv · Durchsuche Akten und Regelbuch. Vollständige Dossiers bleiben bei dir; über Akte pinnen erscheint ein Beleg bei allen. Was wird geteilt?"
              : "Station Disposition · Wähle ein Ziel, stelle die Regler passend ein und bereite die Anlage vor. Erst nach den Freigaben aller drei Rollen darfst du zustellen. Wann ist der Hebel frei?";
      if (!view.public.activeCaseId)
        return this.network.role === "agent"
          ? "Übungsfall · Nimm den Anruf am Agentenpult an. Danach befragst du den Anrufer und veröffentlichst einen Hinweis."
          : "Übungsfall · Der Agent nimmt jetzt den Anruf an. Sieh dir währenddessen dein Pult an; danach arbeitet ihr gemeinsam am selben Fall.";
      if (view.role.role === "agent")
        return view.public.publishedTags.length === 0
          ? view.role.discoveredTags.length === 0
            ? "Agent · Wähle eine Gesprächsoption, um Hinweise aufzudecken. Die Antwort bleibt bei dir. Danach wähle einen entdeckten Hinweis und veröffentliche ihn in einem freien Slot."
            : "Agent · Höre dem Anrufer auch über eine Gesprächsoption zu. Wähle dann einen entdeckten Hinweis und klicke auf Hinweis veröffentlichen, Slot 1. Nur der veröffentlichte Tag wird für Archiv und Disposition sichtbar."
          : view.public.suggestedDestination === null
            ? "Agent · Besprich Tag und mögliche Ziele mit dem Team. Wähle einen Zielbereich und sende eine Zielbitte an die Disposition; die Bitte legt das Ziel noch nicht fest."
            : view.public.selectedDestination === null
              ? "Agent · Die Zielbitte ist gesendet. Warte, bis die Disposition ein Ziel ausgewählt hat, und vergleiche es mit deinem Gespräch."
              : !view.public.approvals.agent
                ? "Agent · Vergleiche das gewählte Ziel mit deinen Hinweisen. Klicke auf Freigabe, wenn es passt; bei Zweifeln sprecht miteinander und ändert das Ziel."
                : "Agent · Deine Freigabe ist erteilt. Warte auf die übrigen Freigaben und die Zustellung.";
      if (view.role.role === "archivist")
        return view.public.archivePins.length === 0
          ? "Archiv · Suche nach dem Namen oder dem veröffentlichten Tag. Öffne eine passende Akte und pinne sie in Slot 1. Die vollständige Akte bleibt nur bei dir sichtbar."
          : view.role.stamp === null
            ? "Archiv · Lies die aktiven Regeln und Ausnahmen im Regelbuch. Setze einen Stempel: passt, unklar oder nein; erkläre dem Team deine Einschätzung."
            : view.public.selectedDestination === null
              ? "Archiv · Teile deine Regelbewertung mit der Disposition. Warte auf ihre Zielwahl und prüfe sie anschließend."
              : !view.public.approvals.archivist
                ? "Archiv · Prüfe das gewählte Ziel gegen Akte und Regelbuch. Gib es frei, wenn es passt; eine neue Zielwahl setzt Freigaben zurück."
                : "Archiv · Deine Freigabe ist erteilt. Warte auf die übrigen Freigaben und die Zustellung.";
      return view.public.publishedTags.length === 0 ||
        view.public.archivePins.length === 0
        ? "Disposition · Warte auf den veröffentlichten Tag des Agenten und den gepinnten Archivbeleg. Vergleicht eure Informationen gemeinsam; Bildschirme bleiben privat."
        : view.public.selectedDestination === null
          ? "Disposition · Vergleiche Tag, Pin und Zielbitte. Wähle an der Zielbank ein Ziel. Eine neue Wahl setzt alle Freigaben zurück."
          : view.role.incident
            ? "Disposition · Lies die Störungsdiagnose. Stelle den genannten Regler auf den verlangten Wert und klicke auf Störung beheben."
            : !view.role.prepared
              ? "Disposition · Stelle jeden Regler gemäß den Anforderungen des gewählten Ziels ein. Klicke danach auf Anlage vorbereiten."
              : !view.public.approvals.dispatcher
                ? "Disposition · Die Anlage ist vorbereitet. Melde Bereitschaft; Agent und Archiv müssen das Ziel ebenfalls freigeben."
                : !view.public.approvals.agent ||
                    !view.public.approvals.archivist
                  ? "Disposition · Du bist bereit. Warte auf die Freigaben von Agent und Archiv."
                  : "Disposition · Alle drei Freigaben liegen vor. Prüfe Ziel und Hinweise und betätige den Zustellhebel zweimal.";
    })();
    const tutorialProgress = tutorial
      ? view?.public.phase === "results"
        ? "Übung abgeschlossen · 6/6 Aufgaben"
        : tutorial.stage === "stations"
          ? `Rollenstationen ${Object.values(tutorial.stations).filter(Boolean).length}/3 · danach gemeinsamer Übungsfall`
          : `Gemeinsamer Übungsfall · ${[view?.public.activeCaseId, view?.public.publishedTags.length, view?.public.archivePins.length, view?.public.selectedDestination, Object.values(view?.public.approvals ?? {}).every(Boolean)].filter(Boolean).length}/6 Aufgaben`
      : "";
    const checklist = view ? tutorialChecklist(view.public) : "";
    const stationChoices =
      this.network.role === "agent"
        ? '<option value="" selected disabled>Antwort wählen</option><option value="dossier">Geheimes Dossier</option><option value="tag">Veröffentlichter Tag</option><option value="machine">Maschinenwert</option>'
        : this.network.role === "archivist"
          ? '<option value="" selected disabled>Antwort wählen</option><option value="dialogue">Dialogantwort</option><option value="pin">Gepinnter Beleg</option><option value="pressure">Geheimer Regeltext</option>'
          : '<option value="" selected disabled>Antwort wählen</option><option value="speed">Sobald die Maschine läuft</option><option value="approvals">Nach Freigaben und Bereitschaft</option><option value="caller">Wenn der Anrufer zustimmt</option>';
    const stationControls =
      tutorial?.stage === "stations" && !tutorial.stations[this.network.role]
        ? `<label>Stationsfrage<select id="tutorial-answer">${stationChoices}</select></label><button data-action="tutorial-station">Station abschließen</button>`
        : "";
    if (
      Boolean(stationControls) !==
      Boolean(this.root.querySelector("#tutorial-answer"))
    )
      force = true;
    const approvalLog =
      this.network.view?.public.approvalLog
        .slice(-3)
        .map(
          (entry) =>
            `${entry.role === "agent" ? "Agent" : entry.role === "archivist" ? "Archiv" : "Disposition"} ${entry.approved ? "✓" : "↶"}`,
        )
        .join(" · ") ?? "";
    const modifiers =
      this.network.view?.public.modifiers
        .map(
          (modifier) =>
            `${modifier.state === "announced" ? "Bald" : "Aktiv"}: ${modifier.text}`,
        )
        .join(" · ") ?? "";
    const needsAttention = Boolean(
      view?.public.pauseReason || this.notice || this.network.error,
    );
    const newAttention = needsAttention && !this.lastAttention;
    this.lastAttention = needsAttention;
    if (!force && this.lastStatus === this.network.status) {
      const pauseReason = this.network.view?.public.pauseReason;
      const status = this.root.querySelector<HTMLElement>(
        ".network-panel strong",
      );
      if (status && this.network.status === "active")
        status.textContent = `${tutorial ? "Tutorial · " : ""}${pauseReason ? "◷ Schicht pausiert" : "● Verbunden"}`;
      const pauseButton = this.root.querySelector<HTMLButtonElement>(
        '[data-action="toggle-pause"]',
      );
      if (pauseButton) {
        pauseButton.textContent =
          pauseReason === "host-menu"
            ? "Schicht fortsetzen"
            : "Schicht pausieren";
        pauseButton.disabled = pauseReason === "disconnect";
      }
      const detail = this.root.querySelector<HTMLElement>(".network-detail");
      const remaining =
        this.root.querySelector<HTMLElement>(".network-remaining");
      const notice = this.root.querySelector<HTMLElement>("[role=status]");
      if (detail)
        detail.textContent = `Rolle: ${this.network.role} · Revision: ${this.network.view?.public.revision ?? "–"} · Fall: ${this.network.view?.public.activeCaseId ?? "–"}`;
      if (remaining)
        remaining.textContent =
          this.network.remainingMs !== null
            ? `Reconnect: ${Math.ceil(this.network.remainingMs / 1000)} s`
            : "";
      if (notice) notice.textContent = this.notice || this.network.error;
      const ping = this.root.querySelector<HTMLElement>(".network-ping");
      if (ping) ping.textContent = `Ping: ${this.network.pingMs ?? "–"} ms`;
      const panel =
        this.root.querySelector<HTMLDetailsElement>(".network-panel");
      if (panel && (newAttention || stationControls)) panel.open = true;
      const log = this.root.querySelector<HTMLElement>(".network-approval-log");
      if (log) log.textContent = approvalLog;
      const modifierLine =
        this.root.querySelector<HTMLElement>(".network-modifiers");
      if (modifierLine) modifierLine.textContent = modifiers;
      const tutorialLine =
        this.root.querySelector<HTMLElement>(".network-tutorial");
      if (tutorialLine && tutorialLine.textContent !== tutorialHint)
        tutorialLine.textContent = tutorialHint;
      const progressLine =
        this.root.querySelector<HTMLElement>(".tutorial-progress");
      if (progressLine && progressLine.textContent !== tutorialProgress)
        progressLine.textContent = tutorialProgress;
      const checklistLine = this.root.querySelector<HTMLElement>(
        ".tutorial-checklist",
      );
      if (checklistLine && checklist !== this.lastChecklist)
        checklistLine.outerHTML = checklist;
      this.lastChecklist = checklist;
      return;
    }
    this.lastStatus = this.network.status;
    const network = this.network;
    const labels = {
      active: "● Verbunden",
      "guest-disconnected": "○ Gast getrennt · Schicht pausiert",
      "host-disconnected": "× Host nicht erreichbar",
      "host-aborted": "× Host hat die Partie beendet",
      "guest-aborted": "× Reconnect-Frist abgelaufen",
      "connection-lost": "○ Verbindung zum Host verloren",
      "protocol-error": "× Protokollfehler",
      ended: "✓ Schicht beendet",
    } as const;
    const status =
      network.status === "active" && view?.public.pauseReason
        ? "◷ Schicht pausiert"
        : labels[network.status];
    const pauseButton =
      network.isHost &&
      (network.status === "active" || network.status === "guest-disconnected")
        ? `<button data-action="toggle-pause" ${view?.public.pauseReason === "disconnect" ? "disabled" : ""}>${view?.public.pauseReason === "host-menu" ? "Schicht fortsetzen" : "Schicht pausieren"}</button>`
        : "";
    const reconnect =
      network.isHost &&
      (network.status === "guest-disconnected" ||
        network.status === "protocol-error")
        ? ([1, 2] as const)
            .map((slot) => {
              if (network.lobby.members[slot].connected) return "";
              const info = network.lobby.getSlot(slot);
              return `<div class="network-reconnect"><button data-action="reconnect-slot-${slot}">Neuen Link für Gast ${slot} erzeugen</button>${info.offerLink ? `<label>Einladung Gast ${slot}<textarea readonly>${escapeHtml(info.offerLink)}</textarea></label><button data-action="copy-${slot}">Kopieren</button><label>Antwort Gast ${slot}<textarea id="reconnect-answer-${slot}">${escapeHtml(this.inputs[slot - 1] ?? "")}</textarea></label><button data-action="import-slot-${slot}">Antwort importieren</button>` : ""}</div>`;
            })
            .join("")
        : !network.isHost && network.status === "host-disconnected"
          ? "<p>Der Host ist nicht erreichbar. Die Partie kann ohne Host nicht fortgesetzt werden.</p>"
          : !network.isHost &&
              network.status !== "active" &&
              network.status !== "ended" &&
              network.status !== "host-aborted" &&
              network.status !== "guest-aborted"
            ? `<label>Neuer Reconnect-Link vom Host<textarea id="reconnect-offer">${escapeHtml(this.guestOffer)}</textarea></label><button data-action="guest-rejoin">Neu verbinden</button>${network.lobby.answerLink ? `<label>Neue Antwort für den Host<textarea readonly>${escapeHtml(network.lobby.answerLink)}</textarea></label><button data-action="copy-answer">Antwort kopieren</button>` : ""}`
            : "";
    const audioControls = `<details class="audio-options"><summary>Ton · ${this.audio.unlocked ? "aktiv" : "aus"}</summary><button data-action="audio-unlock">${this.audio.unlocked ? "Jingle spielen" : "Ton aktivieren"}</button>${(["master", "music", "sfx", "ui"] as const).map((bus) => `<label>${{ master: "Gesamt", music: "Musik", sfx: "Effekte", ui: "Bedienung" }[bus]}<input type="range" min="0" max="100" value="${Math.round(this.audio.settings[bus] * 100)}" data-audio-bus="${bus}"></label>`).join("")}</details>`;
    const diagnostic =
      network.status === "protocol-error" ||
      network.status === "connection-lost"
        ? `<small class="network-diagnostic">Content-Hash v${GAMEPLAY_HASH_VERSION}: ${escapeHtml(network.lobby.modeHash ?? "unbekannt")} · Simulation v${SIMULATION_VERSION} · Protokoll v${PROTOCOL_VERSION}</small>`
        : "";
    const expanded =
      Boolean(tutorial) ||
      network.status !== "active" ||
      newAttention ||
      Boolean(stationControls) ||
      (newReaction && Boolean(reactionHtml)) ||
      (this.root.querySelector<HTMLDetailsElement>(".network-panel")?.open ??
        false);
    this.root.innerHTML = `<details class="network-panel"${expanded ? " open" : ""}><summary class="network-panel-summary"><strong>${tutorial ? "Tutorial · " : ""}${status}</strong><span class="network-ping">Ping: ${network.pingMs ?? "–"} ms</span></summary><div class="network-panel-body">${tutorial ? `<strong class="tutorial-progress" aria-label="Tutorialfortschritt">${escapeHtml(tutorialProgress)}</strong><span class="network-tutorial" aria-label="Tutorialschritt" aria-live="polite">${escapeHtml(tutorialHint)}</span>${stationControls}${checklist}` : ""}<span class="network-detail">Rolle: ${escapeHtml(network.role)} · Revision: ${view?.public.revision ?? "–"} · Fall: ${escapeHtml(view?.public.activeCaseId ?? "–")}</span>${reactionHtml}<span class="network-approval-log" aria-label="Freigabeprotokoll">${escapeHtml(approvalLog)}</span><span class="network-modifiers" aria-label="Schichtmodifikatoren">${escapeHtml(modifiers)}</span><span class="network-remaining">${network.remainingMs !== null ? `Reconnect: ${Math.ceil(network.remainingMs / 1000)} s` : ""}</span>${view?.public.report ? '<button data-action="open-report">Abschlussakte öffnen</button>' : ""}${pauseButton}${reconnect}${audioControls}${diagnostic}<p role="status">${escapeHtml(this.notice || network.error)}</p></div></details>`;
    this.lastChecklist = checklist;
  }
  destroy(): void {
    delete document.documentElement.dataset.contentHash;
    this.audio.destroy();
    this.network.onChange = () => undefined;
    this.network.lobby.onChange = () => undefined;
    this.network.destroy();
    if (import.meta.env.DEV)
      delete (
        window as typeof window & {
          __closeGameChannel?: (slot: 0 | 1 | 2) => void;
        }
      ).__closeGameChannel;
    this.root.remove();
    this.reportRoot.remove();
  }
}
