import Phaser from "phaser";
import { sceneHeader, button, installDebugNavigation } from "./navigation";
import { TOKENS, DESIGN } from "../../ui/tokens";
import type { Role } from "../state/contracts";

const ROLES = {
  agent: {
    label: "Agent der Höllen-Hotline",
    color: TOKENS.color.agent,
    desk: "Telefonpult",
    hint: "Gespräche und Hinweise",
  },
  archivist: {
    label: "Archivar der Verdammnis",
    color: TOKENS.color.archivist,
    desk: "Aktenschrank",
    hint: "Akten und Regeln",
  },
  dispatcher: {
    label: "Disponent der neun Kreise",
    color: TOKENS.color.dispatcher,
    desk: "Routingmaschine",
    hint: "Ziele und Hebel",
  },
} as const;

export class Game extends Phaser.Scene {
  private role: Role = "agent";
  constructor() {
    super("Game");
  }
  init(data: { role?: Role }): void {
    this.role = data.role && data.role in ROLES ? data.role : "agent";
  }
  create(): void {
    this.game.canvas.dataset.role = this.role;
    const current = ROLES[this.role];
    sceneHeader(this, current.label, `Rollenplatzhalter · ${current.hint}`);
    this.add
      .rectangle(DESIGN.width / 2, 635, 1500, 430, current.color)
      .setAlpha(0.3);
    this.add.rectangle(DESIGN.width / 2, 635, 1430, 360, TOKENS.color.panel);
    this.add.text(310, 540, current.desk, {
      fontFamily: "Georgia, serif",
      fontSize: "70px",
      color: TOKENS.color.text,
    });
    this.add.text(310, 665, "Noch keine laufende Schicht", {
      fontFamily: "Arial, sans-serif",
      fontSize: "32px",
      color: TOKENS.color.muted,
    });
    button(
      this,
      335,
      865,
      "Zum Ergebnis",
      () => this.scene.start("Results"),
      current.color,
    );
    installDebugNavigation(this);
  }
}
