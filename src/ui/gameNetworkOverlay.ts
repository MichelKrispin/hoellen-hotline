import type { GameNetwork } from "../net/gameNetwork";

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export class GameNetworkOverlay {
  private root = document.createElement("section");
  private inputs: [string, string] = ["", ""];
  private guestOffer = "";
  private notice = "";
  private lastStatus = "";
  constructor(private readonly network: GameNetwork) {
    this.root.className = "game-network-overlay";
    this.root.setAttribute("aria-label", "Netzwerkstatus");
    document.body.append(this.root);
    if (import.meta.env.DEV)
      (
        window as typeof window & {
          __closeGameChannel?: (slot: 0 | 1 | 2) => void;
        }
      ).__closeGameChannel = (slot) => network.lobby.channelFor(slot)?.close();
    network.onChange = () => this.render();
    network.lobby.onChange = () => this.render(true);
    this.root.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (target.id === "reconnect-offer") this.guestOffer = target.value;
      if (target.id === "reconnect-answer-1") this.inputs[0] = target.value;
      if (target.id === "reconnect-answer-2") this.inputs[1] = target.value;
    });
    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action =
        target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action) void this.act(action);
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
      else if (action.startsWith("copy-")) {
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
  private render(force = false): void {
    if (!force && this.lastStatus === this.network.status) {
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
      return;
    }
    this.lastStatus = this.network.status;
    const network = this.network;
    const view = network.view;
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
    const status = labels[network.status];
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
    this.root.innerHTML = `<div class="network-panel"><strong>${status}</strong><span class="network-detail">Rolle: ${escapeHtml(network.role)} · Revision: ${view?.public.revision ?? "–"} · Fall: ${escapeHtml(view?.public.activeCaseId ?? "–")}</span><span class="network-ping">Ping: ${network.pingMs ?? "–"} ms</span><span class="network-remaining">${network.remainingMs !== null ? `Reconnect: ${Math.ceil(network.remainingMs / 1000)} s` : ""}</span>${reconnect}<p role="status">${escapeHtml(this.notice || network.error)}</p></div>`;
  }
  destroy(): void {
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
  }
}
