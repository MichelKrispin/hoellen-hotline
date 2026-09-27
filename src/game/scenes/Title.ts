import Phaser from "phaser";
import { installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";
import { titleRoom } from "../presentation/titleRoom";

function neonLobbyButton(scene: Phaser.Scene, action: () => void): void {
  const x = 960;
  const y = 430;
  const width = 376;
  const height = 74;
  const frame = scene.add.graphics();
  const draw = (hovered: boolean): void => {
    frame.clear();
    const left = x - width / 2;
    const top = y - height / 2;
    frame.fillStyle(0x08050a, 0.72);
    frame.fillRoundedRect(left + 6, top + 9, width, height, 24);
    frame.fillStyle(0xff381f, hovered ? 0.17 : 0.08);
    frame.fillRoundedRect(left - 12, top - 12, width + 24, height + 24, 32);
    frame.fillStyle(0xff442b, hovered ? 0.27 : 0.12);
    frame.fillRoundedRect(left - 6, top - 6, width + 12, height + 12, 29);
    frame.fillStyle(0x18090e);
    frame.fillRoundedRect(left, top, width, height, 23);
    frame.lineStyle(hovered ? 5 : 4, hovered ? 0xffaa65 : 0xf3422d);
    frame.strokeRoundedRect(left + 2, top + 2, width - 4, height - 4, 21);
    frame.lineStyle(2, hovered ? 0xff6746 : 0xa82422, 0.8);
    frame.strokeRoundedRect(left + 9, top + 9, width - 18, height - 18, 15);
  };
  draw(false);
  frame.setInteractive(
    new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  frame.input!.cursor = "pointer";
  const label = scene.add
    .text(x, y, "Zur Lobby  →", {
      fontFamily: '"Trebuchet MS", "DejaVu Sans", Arial, sans-serif',
      fontSize: "30px",
      fontStyle: "bold",
      color: "#ffe2d0",
    })
    .setOrigin(0.5)
    .setShadow(0, 0, "#ff4b36", 12, true, true);
  frame.on("pointerover", () => {
    draw(true);
    label.setColor("#fff5e8");
    label.setShadow(0, 0, "#ff7958", 21, true, true);
  });
  frame.on("pointerout", () => {
    draw(false);
    label.setColor("#ffe2d0");
    label.setShadow(0, 0, "#ff4b36", 12, true, true);
  });
  frame.on("pointerdown", action);
}

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
    neonLobbyButton(this, () => this.scene.start("Lobby"));
    installDebugNavigation(this);
  }
}
