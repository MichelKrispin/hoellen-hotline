import Phaser from "phaser";
import { installDebugNavigation } from "./navigation";
import { LobbyOverlay } from "../../ui/lobbyOverlay";
import { titleRoom } from "../presentation/titleRoom";

export class Lobby extends Phaser.Scene {
  private overlay: LobbyOverlay | null = null;
  constructor() {
    super("Lobby");
  }
  create(): void {
    this.game.canvas.dataset.scene = "Lobby";
    titleRoom(this);
    this.add.rectangle(960, 540, 1920, 1080, 0x160e18, 0.25);
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
