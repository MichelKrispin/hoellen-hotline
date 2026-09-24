import Phaser from "phaser";
import { sceneHeader, installDebugNavigation } from "./navigation";
import { LobbyOverlay } from "../../ui/lobbyOverlay";

export class Lobby extends Phaser.Scene {
  private overlay: LobbyOverlay | null = null;
  constructor() {
    super("Lobby");
  }
  create(): void {
    sceneHeader(this, "Warteraum", "Private Verbindung für drei Arbeitsplätze");
    this.overlay = new LobbyOverlay();
    this.overlay.onStart = (role, network) =>
      this.scene.start("Game", { role, network });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlay?.destroy();
      this.overlay = null;
    });
    installDebugNavigation(this);
  }
}
