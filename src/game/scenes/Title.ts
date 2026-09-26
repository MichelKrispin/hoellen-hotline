import Phaser from "phaser";
import { button, installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";
import {
  archiveStack,
  devil,
  label,
  leverConsole,
  neon,
  paper,
  plate,
  room,
  telephone,
} from "../presentation/art";

const C = TOKENS.color;

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }
  create(): void {
    this.game.canvas.dataset.scene = "Title";
    this.cameras.main.setBackgroundColor(C.background);
    room(this);
    devil(this, 359, 674, 1.24, 0xc23b36);
    devil(this, 954, 744, 0.64, 0x71517b);
    devil(this, 1568, 675, 1.4, 0xa64131);
    plate(this, 107, 791, 1702, 266, C.wood, C.woodEdge);
    telephone(this, 362, 863, 1.05);
    archiveStack(this, 949, 907, 1.15);
    leverConsole(this, 1571, 860, 1.1);
    paper(this, 1082, 793, 238, 166);
    label(this, 1103, 828, "EILT!", 30, C.ink);
    label(this, 1103, 877, "SEIT 1666", 24, C.ink);
    neon(this, 318, 147, 1284, 320, C.fire);
    const title = this.add
      .text(960, 205, "Höllen-Hotline", {
        fontFamily: "Georgia, serif",
        fontSize: "142px",
        fontStyle: "bold",
        color: "#ffe0ac",
        stroke: "#6a1c22",
        strokeThickness: 13,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#ff4827",
          blur: 30,
          fill: true,
        },
      })
      .setOrigin(0.5, 0);
    title.setDepth(1);
    this.add
      .text(960, 375, "BITTE BLEIBEN SIE DRAN …", {
        fontFamily: "Arial, sans-serif",
        fontSize: "43px",
        fontStyle: "bold",
        color: "#ffe2cf",
      })
      .setOrigin(0.5)
      .setDepth(1);
    button(
      this,
      960,
      592,
      "ZUR LOBBY   →",
      () => this.scene.start("Lobby"),
      C.dispatcher,
      433,
      88,
    );
    const debugHint = label(
      this,
      112,
      983,
      "1 Titel   2 Lobby   3 Agent   4 Archiv   5 Disposition   6 Ergebnis",
      22,
      C.muted,
    );
    installDebugNavigation(this, debugHint);
  }
}
