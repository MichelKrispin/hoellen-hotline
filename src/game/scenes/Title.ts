import Phaser from "phaser";
import { button, installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";
import { titleRoom } from "../presentation/titleRoom";

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    this.game.canvas.dataset.scene = "Title";
    const mobileTitle = document.createElement("section");
    mobileTitle.className = "mobile-title";
    mobileTitle.innerHTML =
      '<span>HÖLLEN-HOTLINE</span><h1>Bitte bleiben Sie dran …</h1><p>Drei Arbeitsplätze. Eine Schicht in der Hölle.</p><button type="button">Zur Lobby →</button>';
    mobileTitle.querySelector("button")!.onclick = () =>
      this.scene.start("Lobby");
    document.body.append(mobileTitle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => mobileTitle.remove());

    this.cameras.main.setBackgroundColor(TOKENS.color.background);
    titleRoom(this);
    button(
      this,
      960,
      430,
      "ZUR LOBBY   →",
      () => this.scene.start("Lobby"),
      TOKENS.color.fire,
      320,
      68,
    );
    installDebugNavigation(this);
  }
}
