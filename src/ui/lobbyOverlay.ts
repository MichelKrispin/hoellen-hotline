import type { Role } from "../game/state/contracts";
import type { GameMode } from "../game/modes/config";
import { CAMPAIGN_CATALOG } from "../content/catalog";
import {
  importProgress,
  isScenarioUnlocked,
  readLocalProgress,
  writeLocalProgress,
} from "../game/campaign/progress";
import { PrivateLobby } from "../net/privateLobby";
import type { GameNetwork } from "../net/gameNetwork";
import { clearFragment, fragmentFrom } from "../net/signalingLink";
import {
  readFreePlayControls,
  renderFreePlayControls,
  type FreePlayMode,
} from "./freePlayControls";

const roles: { id: Role; label: string }[] = [
  { id: "agent", label: "Agent" },
  { id: "archivist", label: "Archivar" },
  { id: "dispatcher", label: "Disponent" },
];
const modeChoices: { key: string; label: string; mode: GameMode }[] = [
  ...CAMPAIGN_CATALOG.flatMap((pkg) =>
    pkg.scenarios.map((scenario) => ({
      key: scenario.id,
      label: `Kampagne · ${pkg.translations[scenario.titleKey] ?? scenario.id}`,
      mode: {
        kind: "campaign" as const,
        campaignId: pkg.manifest.id,
        scenarioId: scenario.id,
      },
    })),
  ),
  {
    key: "tutorial",
    label: "Tutorial · Übungsfall",
    mode: { kind: "tutorial", scenarioId: "core.scenario.first" },
  },
  ...(["relaxed", "standard", "infernal"] as const).map((preset) => ({
    key: `free-${preset}`,
    label: `Freies Spiel · ${preset === "relaxed" ? "Feierabendrunde" : preset === "standard" ? "Dienstplan" : "Ewige Warteschleife"}`,
    mode: {
      kind: "freePlay" as const,
      scenarioId: "core.scenario.first",
      preset,
      campaignIds: ["campaign.core"],
    },
  })),
];
const modeKey = (mode: GameMode): string =>
  mode.kind === "tutorial"
    ? "tutorial"
    : mode.kind === "freePlay"
      ? `free-${mode.preset}`
      : mode.scenarioId;
const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const legalLinks = `<a href="${import.meta.env.BASE_URL}privacy.html" target="_blank" rel="noopener">Datenschutz und Verbindungsdaten</a> · <a href="${import.meta.env.BASE_URL}credits.html" target="_blank" rel="noopener">Credits und Lizenzen</a>`;
const readable = (error: unknown): string =>
  error instanceof Error ? error.message : "Vorgang fehlgeschlagen.";

function reconcileChildren(current: Node, next: Node): void {
  const oldChildren = Array.from(current.childNodes);
  const newChildren = Array.from(next.childNodes);
  for (let index = 0; index < newChildren.length; index++) {
    const oldNode = oldChildren[index];
    const newNode = newChildren[index]!;
    if (!oldNode) {
      current.appendChild(newNode.cloneNode(true));
      continue;
    }
    if (
      oldNode.nodeType !== newNode.nodeType ||
      oldNode.nodeName !== newNode.nodeName
    ) {
      oldNode.replaceWith(newNode.cloneNode(true));
      continue;
    }
    if (oldNode.nodeType === Node.TEXT_NODE) {
      if (oldNode.nodeValue !== newNode.nodeValue)
        oldNode.nodeValue = newNode.nodeValue;
      continue;
    }
    if (!(oldNode instanceof Element) || !(newNode instanceof Element))
      continue;
    for (const attribute of Array.from(oldNode.attributes))
      if (!newNode.hasAttribute(attribute.name))
        oldNode.removeAttribute(attribute.name);
    for (const attribute of Array.from(newNode.attributes))
      if (oldNode.getAttribute(attribute.name) !== attribute.value)
        oldNode.setAttribute(attribute.name, attribute.value);
    reconcileChildren(oldNode, newNode);
    if (
      (oldNode instanceof HTMLInputElement &&
        newNode instanceof HTMLInputElement) ||
      (oldNode instanceof HTMLTextAreaElement &&
        newNode instanceof HTMLTextAreaElement) ||
      (oldNode instanceof HTMLSelectElement &&
        newNode instanceof HTMLSelectElement)
    ) {
      if (oldNode.value !== newNode.value) oldNode.value = newNode.value;
      if (
        oldNode instanceof HTMLInputElement &&
        newNode instanceof HTMLInputElement &&
        oldNode.checked !== newNode.checked
      )
        oldNode.checked = newNode.checked;
    }
  }
  for (const oldNode of oldChildren.slice(newChildren.length)) oldNode.remove();
}

export class LobbyOverlay {
  private root = document.createElement("section");
  private lobby: PrivateLobby | null = null;
  private name = "";
  private answerInputs: [string, string] = ["", ""];
  private showManual = false;
  private notice = "";
  private openedAnswer = "";
  private progressImport = "";
  private seedInput = "";
  private freeDraft: FreePlayMode = {
    kind: "freePlay",
    scenarioId: "core.scenario.first",
    preset: "standard",
    campaignIds: ["campaign.core"],
  };
  onStart: (role: Role, network: GameNetwork) => void = () => undefined;
  constructor() {
    this.root.className = "lobby-overlay";
    this.root.setAttribute("aria-label", "Private Lobby");
    document.body.append(this.root);
    this.root.addEventListener("input", (event) => {
      const target = event.target;
      if (!(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ))
        return;
      if (target.id === "player-name") this.name = target.value;
      if (target.id === "answer-1") this.answerInputs[0] = target.value;
      if (target.id === "answer-2") this.answerInputs[1] = target.value;
      if (target.id === "progress-import") this.progressImport = target.value;
      if (target.id === "game-seed") this.seedInput = target.value;
      if (target.closest(".freeplay-config"))
        this.freeDraft = readFreePlayControls(this.root, this.freeDraft);
    });
    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action =
        target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action) void this.act(action);
    });
    this.root.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.id === "game-mode")
        void this.act(`mode-${target.value}`);
      else if (
        target instanceof HTMLElement &&
        target.closest(".freeplay-config")
      ) {
        this.freeDraft = readFreePlayControls(this.root, this.freeDraft);
        if (
          target instanceof HTMLSelectElement &&
          target.id === "free-layout-policy" &&
          target.value === "random"
        ) {
          this.freeDraft.layoutIds = undefined;
          this.render();
        }
        if (
          target instanceof HTMLInputElement &&
          target.name === "free-campaign"
        )
          this.render();
      }
    });
    void this.init();
  }
  private async init(): Promise<void> {
    if (location.hash) {
      try {
        if (location.hash.startsWith("#join=")) {
          this.notice = "Verbindung zum Host wird vorbereitet …";
          this.render();
          const lobby = await PrivateLobby.fromInvite(location.hash);
          this.setLobby(lobby);
          await lobby.join(this.name.trim().slice(0, 24) || "Gast");
          this.notice = "";
        } else {
          const fragment = fragmentFrom(location.hash);
          if (fragment.kind === "answer") {
            this.openedAnswer = location.href;
            this.notice =
              "Dieser Answer-Link muss im bereits geöffneten Host-Tab eingefügt werden. Erst kopieren, dann hier schließen.";
          } else this.setLobby(await PrivateLobby.fromOffer(location.hash));
        }
      } catch (error) {
        this.notice = readable(error);
        clearFragment();
      }
    }
    this.render();
  }
  private setLobby(lobby: PrivateLobby): void {
    this.lobby?.close();
    this.lobby = lobby;
    lobby.onChange = () => this.render();
    lobby.onStart = (role, network) => this.onStart(role, network);
  }
  private async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.notice = "Link kopiert.";
    } catch {
      this.notice =
        "Zwischenablage nicht verfügbar. Link im markierbaren Feld manuell kopieren.";
    }
    this.render();
  }
  private async act(action: string): Promise<void> {
    try {
      this.notice = "";
      if (action === "host") {
        this.setLobby(PrivateLobby.host());
        clearFragment();
      } else if (action === "toggle-manual") this.showManual = !this.showManual;
      else if (action === "copy-invite")
        await this.copy(this.lobby!.inviteLink);
      else if (action === "dismiss-answer") {
        clearFragment();
        this.openedAnswer = "";
      } else if (action === "copy-answer-opened")
        await this.copy(this.openedAnswer);
      else if (action === "join")
        await this.lobby!.join(this.name.trim().slice(0, 24) || "Gast");
      else if (action === "copy-generated-answer")
        await this.copy(this.lobby!.answerLink);
      else if (action === "ping") this.lobby!.ping();
      else if (action === "start") await this.lobby!.start();
      else if (action === "import-progress") {
        if (!this.lobby?.isHost)
          throw new Error("Nur der Host importiert Fortschritt.");
        writeLocalProgress(importProgress(this.progressImport));
        this.notice = "Kampagnenfortschritt importiert.";
      } else if (action === "apply-seed") {
        if (!this.lobby?.isHost)
          throw new Error("Nur der Host wählt den Seed.");
        const mode = this.lobby.mode;
        if (mode.kind === "tutorial")
          throw new Error("Der Übungsfall verwendet einen festen Seed.");
        await this.lobby.chooseMode({
          ...mode,
          seed: this.seedInput.trim() || undefined,
        });
        this.notice =
          "Seed übernommen. Alle Spieler müssen erneut bereit melden.";
      } else if (action === "apply-freeplay") {
        if (!this.lobby?.isHost || this.lobby.mode.kind !== "freePlay")
          throw new Error("Freies Spiel kann nur der Host konfigurieren.");
        this.freeDraft = readFreePlayControls(this.root, this.freeDraft);
        await this.lobby.chooseMode({
          ...this.freeDraft,
          seed: this.seedInput.trim() || undefined,
        });
        this.notice =
          "Freies Spiel übernommen. Alle Spieler müssen erneut bereit melden.";
      } else if (action.startsWith("mode-")) {
        const choice = modeChoices.find((item) => item.key === action.slice(5));
        if (!choice) throw new Error("Unbekannter Spielmodus.");
        const selectedMode = choice.mode;
        if (selectedMode.kind === "campaign") {
          const pkg = CAMPAIGN_CATALOG.find(
            (item) => item.manifest.id === selectedMode.campaignId,
          );
          if (
            !pkg ||
            !isScenarioUnlocked(
              readLocalProgress(),
              pkg,
              selectedMode.scenarioId,
            )
          )
            throw new Error("Dieses Szenario ist noch gesperrt.");
        }
        await this.lobby!.chooseMode(selectedMode);
        if (selectedMode.kind === "freePlay")
          this.freeDraft = structuredClone(selectedMode);
      } else if (action.startsWith("offer-"))
        await this.lobby!.createOffer(Number(action.slice(-1)) as 1 | 2);
      else if (action.startsWith("import-"))
        await this.lobby!.importAnswer(
          this.answerInputs[Number(action.slice(-1)) - 1]!,
          Number(action.slice(-1)) as 1 | 2,
        );
      else if (action.startsWith("copy-offer-"))
        await this.copy(
          this.lobby!.getSlot(Number(action.slice(-1)) as 1 | 2).offerLink,
        );
      else if (action.startsWith("role-"))
        await this.lobby!.choose(action.slice(5) as Role, false, this.name);
      else if (action === "ready") {
        const local = this.lobby!.members[this.lobby!.localSlot];
        await this.lobby!.choose(local.role, !local.ready, this.name);
      }
    } catch (error) {
      this.notice = readable(error);
    }
    this.render();
  }
  private render(): void {
    const lobby = this.lobby;
    if (this.openedAnswer) {
      this.updateMarkup(
        `<div class="lobby-card"><h1>Antwortlink</h1><p>${escapeHtml(this.notice)}</p><textarea readonly aria-label="Answer-Link">${escapeHtml(this.openedAnswer)}</textarea><div class="lobby-actions"><button data-action="copy-answer-opened">Link kopieren</button><button data-action="dismiss-answer">Zur Startseite</button></div></div>`,
      );
      return;
    }
    if (!lobby) {
      this.updateMarkup(
        `<div class="lobby-card"><h1>Private Lobby</h1><p>Host erstellt eine Lobby und teilt einen Einladungslink mit zwei Mitspielern.</p><button data-action="host">Lobby erstellen</button>${this.notice ? `<p role="status">${escapeHtml(this.notice)}</p>` : ""}<p>Öffentliches Matchmaking ist noch nicht verfügbar.</p><p>${legalLinks}</p></div>`,
      );
      return;
    }
    const local = lobby.members[lobby.localSlot];
    const progress = lobby.isHost ? readLocalProgress() : null;
    const intro =
      CAMPAIGN_CATALOG.flatMap((pkg) =>
        pkg.scenarios.map((scenario) =>
          scenario.id === lobby.mode.scenarioId && scenario.intro
            ? pkg.translations[scenario.intro]
            : null,
        ),
      ).find((text) => text) ?? "";
    const modeOptions = modeChoices
      .map((item) => {
        const mode = item.mode;
        const locked =
          mode.kind === "campaign" && progress
            ? !isScenarioUnlocked(
                progress,
                CAMPAIGN_CATALOG.find(
                  (pkg) => pkg.manifest.id === mode.campaignId,
                )!,
                mode.scenarioId,
              )
            : false;
        return `<option value="${item.key}" ${modeKey(lobby.mode) === item.key ? "selected" : ""} ${locked ? "disabled" : ""}>${locked ? "🔒 " : ""}${escapeHtml(item.label)}</option>`;
      })
      .join("");
    const slotHtml = ([1, 2] as const)
      .map((slot) => {
        const info = lobby.getSlot(slot);
        return `<div class="slot-box"><h3>Gast ${slot} · ${escapeHtml(info.status)}</h3><button data-action="offer-${slot}">${info.offerLink ? "Neuen Link erzeugen" : "Einladung erzeugen"}</button>${info.offerLink ? `<label>Einladungslink<textarea readonly aria-label="Einladungslink Gast ${slot}">${escapeHtml(info.offerLink)}</textarea></label><button data-action="copy-offer-${slot}">Einladung kopieren</button><label>Antwortlink hier einfügen<textarea id="answer-${slot}" aria-label="Antwortlink Gast ${slot}">${escapeHtml(this.answerInputs[slot - 1] ?? "")}</textarea></label><button data-action="import-${slot}">Antwort importieren</button>` : ""}</div>`;
      })
      .join("");
    const invitations = lobby.isHost
      ? `<h2>Einladung</h2><p>Diesen Link an beide Gäste senden.</p><button data-action="toggle-manual">${this.showManual ? "Manuelle Verbindung ausblenden" : "Manuelle Verbindung (Fallback)"}</button>${lobby.inviteLink ? `<label>Einladungslink<textarea readonly aria-label="Einladungslink">${escapeHtml(lobby.inviteLink)}</textarea></label><button data-action="copy-invite">Einladung kopieren</button>` : lobby.automaticSignalingEnabled ? "<p>Einladungslink wird vorbereitet. Falls der Dienst nicht erreichbar ist, die manuelle Verbindung öffnen.</p>" : "<p>Automatische Einladungen sind in diesem Build deaktiviert. Manuelle Verbindung öffnen.</p>"}${this.showManual ? `<div><h3>Offer/Answer-Links</h3>${slotHtml}</div>` : ""}`
      : lobby.isAutomaticGuest
        ? `<h2>Einladung für Gast ${lobby.localSlot}</h2><p>${local.connected ? "Mit dem Host verbunden." : "Direkte Verbindung wird hergestellt …"}</p>${!lobby.answerLink ? '<button data-action="join">Verbindung erneut versuchen</button>' : ""}`
        : `<h2>Einladung für Gast ${lobby.localSlot}</h2><p>Sitzungskürzel mit dem Host abgleichen.</p><button data-action="join" ${lobby.answerLink ? "disabled" : ""}>Beitreten und Antwort erzeugen</button>${lobby.answerLink ? `<label>Antwortlink · an Host senden<textarea readonly aria-label="Antwortlink">${escapeHtml(lobby.answerLink)}</textarea></label><button data-action="copy-generated-answer">Antwort kopieren</button><p>Der Host fügt diesen Link in seine bestehende Lobby ein.</p>` : ""}`;
    this
      .updateMarkup(`<div class="lobby-card"><header><h1>Warteraum <span>${lobby.code}</span></h1><p>Nur mit vertrauten Mitspielern teilen · Direktverbindung per WebRTC</p></header>
      <div class="lobby-grid"><div><label>Dein Name<input id="player-name" maxlength="24" value="${escapeHtml(this.name)}" /></label>
      ${lobby.isHost ? `<label>Spielmodus<select id="game-mode">${modeOptions}</select></label>${lobby.mode.kind === "tutorial" ? "" : `<label>Seed (leer = zufällig)<input id="game-seed" maxlength="128" value="${escapeHtml(this.seedInput)}"></label>${lobby.mode.kind === "campaign" ? '<button data-action="apply-seed">Seed übernehmen</button>' : renderFreePlayControls(this.freeDraft)}`}<label>Fortschritt von anderem Gerät importieren<textarea id="progress-import" aria-label="Kampagnenfortschritt importieren">${escapeHtml(this.progressImport)}</textarea></label><button data-action="import-progress">Fortschritt importieren</button>` : `<p>Spielmodus: ${escapeHtml(modeChoices.find((item) => item.key === modeKey(lobby.mode))?.label ?? lobby.mode.kind)} · Hostauswahl; nur der Host schaltet Szenarien frei.</p>`}<p class="scenario-intro">${escapeHtml(intro)}</p>
      ${invitations}</div>
      <div><h2>Arbeitsplätze</h2>${lobby.members.map((m, i) => `<div class="member"><strong>${i === 0 ? "Host" : `Gast ${i}`} · ${escapeHtml(m.name)}</strong><span>${m.connected ? "● Verbunden" : "○ Getrennt"} · ${m.role ? (roles.find((r) => r.id === m.role)?.label ?? "Unbekannt") : "Rolle offen"} · ${m.ready ? "✓ Bereit" : "Wartet"} · ${m.contentHash === null || lobby.modeHash === null ? "Inhalte offen" : m.contentHash === lobby.modeHash ? "✓ Inhalte gleich" : "× Inhalte verschieden"} · ${m.ping === null ? "Ping –" : `${m.ping} ms`}</span></div>`).join("")}
      <h2>Deine Rolle</h2><div class="lobby-actions">${roles.map((r) => `<button data-action="role-${r.id}" ${!local.connected || lobby.members.some((m, i) => i !== lobby.localSlot && m.role === r.id) ? "disabled" : ""} aria-pressed="${local.role === r.id}">${r.label}</button>`).join("")}</div><div class="lobby-actions"><button data-action="ready" ${!local.role || !local.connected ? "disabled" : ""}>${local.ready ? "Bereits bereit ✓" : "Bereit melden"}</button><button data-action="ping">Verbindung testen</button></div>${lobby.isHost ? `<button data-action="start" ${lobby.canStart() ? "" : "disabled"}>Schicht starten</button>` : ""}</div></div>
      <p role="status" class="lobby-notice">${escapeHtml(this.notice || lobby.error)}</p><p class="lobby-footnote">Wenn die direkte Verbindung scheitert, neuen Link versuchen. Ohne TURN-Relay funktionieren manche Netzwerke nicht. ${legalLinks}</p></div>`);
  }
  private updateMarkup(html: string): void {
    const template = document.createElement("template");
    template.innerHTML = html;
    reconcileChildren(this.root, template.content);
  }
  destroy(): void {
    this.lobby?.close();
    this.root.remove();
  }
}
