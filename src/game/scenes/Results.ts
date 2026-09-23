import Phaser from "phaser";
import { sceneHeader, button, installDebugNavigation } from "./navigation";

export class Results extends Phaser.Scene {
  constructor() {
    super("Results");
  }
  create(): void {
    sceneHeader(
      this,
      "Abschlussakte",
      "Ergebnisplatzhalter · Wertung und Fehlerchronik folgen in späteren Batches.",
    );
    button(this, 320, 540, "Zurück zum Titel", () => this.scene.start("Title"));
    installDebugNavigation(this);
  }
}
