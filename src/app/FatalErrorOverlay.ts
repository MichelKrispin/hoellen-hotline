import type Phaser from "phaser";
import { SIMULATION_VERSION } from "../game/state/simulation";
import { GAMEPLAY_HASH_VERSION } from "../content/schemas";

export class FatalErrorOverlay {
  private readonly root = document.createElement("section");
  private readonly detail = document.createElement("textarea");
  private restoreTimer: number | null = null;

  constructor() {
    this.root.className = "fatal-error";
    this.root.hidden = true;
    this.root.setAttribute("role", "alertdialog");
    this.root.setAttribute(
      "aria-label",
      "Spiel konnte nicht fortgesetzt werden",
    );
    const title = document.createElement("h1");
    title.textContent = "Die Leitung ist unterbrochen";
    const message = document.createElement("p");
    message.textContent =
      "Ein unerwarteter Fehler ist aufgetreten. Kopiere die Diagnose oder lade die Seite neu.";
    this.detail.readOnly = true;
    this.detail.setAttribute("aria-label", "Fehlerdiagnose");
    const copy = document.createElement("button");
    copy.textContent = "Diagnose kopieren";
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(this.detail.value);
        copy.textContent = "Kopiert";
      } catch {
        this.detail.focus();
        this.detail.select();
        copy.textContent = "Text markieren und kopieren";
      }
    };
    const reload = document.createElement("button");
    reload.textContent = "Seite neu laden";
    reload.onclick = () => location.reload();
    this.root.append(title, message, this.detail, copy, reload);
    document.body.append(this.root);
    window.addEventListener("error", (event) =>
      this.show(event.error ?? event.message),
    );
    window.addEventListener("unhandledrejection", (event) =>
      this.show(event.reason),
    );
  }

  attach(game: Phaser.Game): void {
    game.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.restoreTimer = window.setTimeout(
        () => this.show("Canvas-Kontext wurde nicht wiederhergestellt."),
        10_000,
      );
    });
    game.canvas.addEventListener("webglcontextrestored", () => {
      if (this.restoreTimer !== null) window.clearTimeout(this.restoreTimer);
      this.restoreTimer = null;
    });
  }

  private show(error: unknown): void {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
        : String(error);
    const canvas = document.querySelector("canvas");
    this.detail.value = `Höllen-Hotline Diagnose\nSimulation: ${SIMULATION_VERSION}\nContent-Hash v${GAMEPLAY_HASH_VERSION}: ${document.documentElement.dataset.contentHash || "unbekannt"}\nURL: ${location.href.split("#")[0]}\nSzene: ${canvas?.dataset.scene ?? "unbekannt"}\nBrowser: ${navigator.userAgent}\nFehler: ${message}`;
    this.root.hidden = false;
    this.root.querySelector("button")?.focus();
  }
}
