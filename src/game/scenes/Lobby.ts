import Phaser from "phaser";
import { sceneHeader, button, installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";

export class Lobby extends Phaser.Scene {
  constructor() {
    super("Lobby");
  }
  create(): void {
    sceneHeader(
      this,
      "Warteraum",
      "Platzhalter für die private Drei-Personen-Lobby. Verbindungsaufbau folgt in Batch 4.",
    );
    button(
      this,
      320,
      510,
      "Agent ansehen",
      () => this.scene.start("Game", { role: "agent" }),
      TOKENS.color.agent,
    );
    button(
      this,
      800,
      510,
      "Archiv ansehen",
      () => this.scene.start("Game", { role: "archivist" }),
      TOKENS.color.archivist,
    );
    button(
      this,
      1280,
      510,
      "Disposition ansehen",
      () => this.scene.start("Game", { role: "dispatcher" }),
      TOKENS.color.dispatcher,
    );
    installDebugNavigation(this);
  }
}
