import Phaser from "phaser";
import { sceneHeader, button, installDebugNavigation } from "./navigation";

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }
  create(): void {
    sceneHeader(
      this,
      "Bitte bleiben Sie dran.",
      "Drei Schreibtische. Neun Kreise. Eine denkbar schlechte Verbindung.",
    );
    button(this, 320, 540, "Zur Lobby", () => this.scene.start("Lobby"));
    installDebugNavigation(this);
  }
}
