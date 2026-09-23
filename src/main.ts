import Phaser from "phaser";
import { DESIGN } from "./ui/tokens";
import { Boot } from "./game/scenes/Boot";
import { Title } from "./game/scenes/Title";
import { Lobby } from "./game/scenes/Lobby";
import { Game } from "./game/scenes/Game";
import { Results } from "./game/scenes/Results";
import "./style.css";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: DESIGN.width,
  height: DESIGN.height,
  backgroundColor: "#1b111b",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, Lobby, Game, Results],
  render: { pixelArt: false, antialias: true },
});
