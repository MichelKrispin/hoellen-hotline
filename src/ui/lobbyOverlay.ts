import type { Role } from "../game/state/contracts";
import { PrivateLobby } from "../net/privateLobby";
import type { GameNetwork } from "../net/gameNetwork";
import { clearFragment, fragmentFrom } from "../net/signalingLink";

const roles: { id: Role; label: string }[] = [
  { id: "agent", label: "Agent" },
  { id: "archivist", label: "Archivar" },
  { id: "dispatcher", label: "Disponent" },
];
const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const readable = (error: unknown): string =>
  error instanceof Error ? error.message : "Vorgang fehlgeschlagen.";

export class LobbyOverlay {
  private root = document.createElement("section");
  private lobby: PrivateLobby | null = null;
  private name = "";
  private answerInputs: [string, string] = ["", ""];
  private notice = "";
  private openedAnswer = "";
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
    });
    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action =
        target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action) void this.act(action);
    });
    void this.init();
  }
  private async init(): Promise<void> {
    if (location.hash) {
      try {
        const fragment = fragmentFrom(location.hash);
        if (fragment.kind === "answer") {
          this.openedAnswer = location.href;
          this.notice =
            "Dieser Answer-Link muss im bereits geöffneten Host-Tab eingefügt werden. Erst kopieren, dann hier schließen.";
        } else this.setLobby(await PrivateLobby.fromOffer(location.hash));
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
      } else if (action === "dismiss-answer") {
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
      else if (action.startsWith("offer-"))
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
        this.lobby!.choose(action.slice(5) as Role, false, this.name);
      else if (action === "ready") {
        const local = this.lobby!.members[this.lobby!.localSlot];
        this.lobby!.choose(local.role, !local.ready, this.name);
      }
    } catch (error) {
      this.notice = readable(error);
    }
    this.render();
  }
  private render(): void {
    const lobby = this.lobby;
    if (this.openedAnswer) {
      this.root.innerHTML = `<div class="lobby-card"><h1>Antwortlink</h1><p>${escapeHtml(this.notice)}</p><textarea readonly aria-label="Answer-Link">${escapeHtml(this.openedAnswer)}</textarea><div class="lobby-actions"><button data-action="copy-answer-opened">Link kopieren</button><button data-action="dismiss-answer">Zur Startseite</button></div></div>`;
      return;
    }
    if (!lobby) {
      this.root.innerHTML = `<div class="lobby-card"><h1>Private Lobby</h1><p>Drei bekannte Personen verbinden sich über Einladungs- und Antwortlinks. Links nur vertraulich teilen.</p><button data-action="host">Lobby erstellen</button>${this.notice ? `<p role="status">${escapeHtml(this.notice)}</p>` : ""}<p>Öffentliches Matchmaking ist noch nicht verfügbar.</p></div>`;
      return;
    }
    const local = lobby.members[lobby.localSlot];
    const slotHtml = ([1, 2] as const)
      .map((slot) => {
        const info = lobby.getSlot(slot);
        return `<div class="slot-box"><h3>Gast ${slot} · ${escapeHtml(info.status)}</h3><button data-action="offer-${slot}">${info.offerLink ? "Neuen Link erzeugen" : "Einladung erzeugen"}</button>${info.offerLink ? `<label>Einladungslink<textarea readonly aria-label="Einladungslink Gast ${slot}">${escapeHtml(info.offerLink)}</textarea></label><button data-action="copy-offer-${slot}">Einladung kopieren</button><label>Antwortlink hier einfügen<textarea id="answer-${slot}" aria-label="Antwortlink Gast ${slot}">${escapeHtml(this.answerInputs[slot - 1] ?? "")}</textarea></label><button data-action="import-${slot}">Antwort importieren</button>` : ""}</div>`;
      })
      .join("");
    this.root.innerHTML = `<div class="lobby-card"><header><h1>Warteraum <span>${lobby.code}</span></h1><p>Nur mit vertrauten Mitspielern teilen · Direktverbindung per WebRTC</p></header>
      <div class="lobby-grid"><div><label>Dein Name<input id="player-name" maxlength="24" value="${escapeHtml(this.name)}" /></label>
      ${lobby.isHost ? `<h2>Einladungen</h2>${slotHtml}` : `<h2>Einladung für Gast ${lobby.localSlot}</h2><p>Sitzungskürzel mit dem Host abgleichen.</p><button data-action="join" ${lobby.answerLink ? "disabled" : ""}>Beitreten und Antwort erzeugen</button>${lobby.answerLink ? `<label>Antwortlink · an Host senden<textarea readonly aria-label="Antwortlink">${escapeHtml(lobby.answerLink)}</textarea></label><button data-action="copy-generated-answer">Antwort kopieren</button><p>Der Host fügt diesen Link in seine bestehende Lobby ein.</p>` : ""}`}</div>
      <div><h2>Arbeitsplätze</h2>${lobby.members.map((m, i) => `<div class="member"><strong>${i === 0 ? "Host" : `Gast ${i}`} · ${escapeHtml(m.name)}</strong><span>${m.connected ? "● Verbunden" : "○ Getrennt"} · ${m.role ? (roles.find((r) => r.id === m.role)?.label ?? "Unbekannt") : "Rolle offen"} · ${m.ready ? "✓ Bereit" : "Wartet"} · ${m.ping === null ? "Ping –" : `${m.ping} ms`}</span></div>`).join("")}
      <h2>Deine Rolle</h2><div class="lobby-actions">${roles.map((r) => `<button data-action="role-${r.id}" ${!local.connected || lobby.members.some((m, i) => i !== lobby.localSlot && m.role === r.id) ? "disabled" : ""} aria-pressed="${local.role === r.id}">${r.label}</button>`).join("")}</div><div class="lobby-actions"><button data-action="ready" ${!local.role || !local.connected ? "disabled" : ""}>${local.ready ? "Bereits bereit ✓" : "Bereit melden"}</button><button data-action="ping">Verbindung testen</button></div>${lobby.isHost ? `<button data-action="start" ${lobby.canStart() ? "" : "disabled"}>Schicht starten</button>` : ""}</div></div>
      <p role="status" class="lobby-notice">${escapeHtml(this.notice || lobby.error)}</p><p class="lobby-footnote">Wenn die direkte Verbindung scheitert, neuen Link versuchen. Ohne TURN-Relay funktionieren manche Netzwerke nicht.</p></div>`;
  }
  destroy(): void {
    this.lobby?.close();
    this.root.remove();
  }
}
