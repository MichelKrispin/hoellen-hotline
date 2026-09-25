import type { GameNetwork } from "../net/gameNetwork";

const pressureWord = (value: number): string =>
  value >= 75
    ? "kritisch"
    : value >= 50
      ? "hoch"
      : value >= 25
        ? "erhöht"
        : "ruhig";

export class ShiftMirror {
  private readonly root = document.createElement("section");
  private readonly live = document.createElement("p");
  private readonly detail = document.createElement("p");
  private readonly unsubscribe: () => void;
  private lastAnnouncement = "";

  constructor(network: GameNetwork) {
    this.root.className = "shift-mirror";
    this.root.tabIndex = 0;
    this.root.setAttribute("aria-label", "Gemeinsamer Schichtstatus");
    this.live.setAttribute("aria-live", "polite");
    this.root.append(this.live, this.detail);
    document.body.append(this.root);
    this.unsubscribe = network.subscribe(() => {
      const view = network.view?.public;
      if (!view) return;
      const approvals = Object.values(view.approvals).filter(Boolean).length;
      const announcement = `${view.phase === "results" ? "Schicht beendet" : view.pauseReason ? "Schicht pausiert" : "Schicht aktiv"}. Fall ${view.activeCaseId ?? "keiner"}. ${approvals} von 3 Freigaben. Wartedruck ${pressureWord(view.queuePressure)}, Kesseldruck ${pressureWord(view.boilerPressure)}, Prüfrisiko ${pressureWord(view.auditRisk)}.`;
      if (announcement !== this.lastAnnouncement) {
        this.live.textContent = announcement;
        this.lastAnnouncement = announcement;
      }
      const seconds = Math.floor(view.elapsedMs / 1000);
      this.detail.textContent = `Schichtzeit ${Math.floor(seconds / 60)} Minuten ${seconds % 60} Sekunden. ${view.queueLength} Fälle in der Warteschlange. Kollegen: ${view.colleagues.map((entry) => `${entry.role} ${entry.activity}`).join(", ")}. ${view.modifiers.map((entry) => `${entry.state === "announced" ? "Angekündigt" : "Aktiv"}: ${entry.text}`).join(". ")}`;
    });
  }

  destroy(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
