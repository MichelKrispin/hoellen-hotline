import Phaser from "phaser";
import { installDebugNavigation } from "./navigation";
import { LobbyOverlay } from "../../ui/lobbyOverlay";
import { lobbyRoom } from "../presentation/lobbyRoom";

export class Lobby extends Phaser.Scene {
  private overlay: LobbyOverlay | null = null;
  constructor() {
    super("Lobby");
  }
  create(): void {
    this.game.canvas.dataset.scene = "Lobby";
    lobbyRoom(this);
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
