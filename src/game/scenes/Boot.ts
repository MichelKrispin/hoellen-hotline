import Phaser from "phaser";
import { preloadPlaceholders } from "../../assets/placeholders";
import agentPortrait from "../../assets/generated/role-agent/clerk@2x.png?url";
import archivistPortrait from "../../assets/generated/role-agent/map-folder@2x.png?url";
import dispatcherPortrait from "../../assets/generated/role-agent/biscuit-auditor@2x.png?url";

export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload(): void {
    preloadPlaceholders(this);
    this.load.image("role-figure-agent", agentPortrait);
    this.load.image("role-figure-archivist", archivistPortrait);
    this.load.image("role-figure-dispatcher", dispatcherPortrait);
  }
  create(): void {
    this.scene.start(location.hash ? "Lobby" : "Title");
  }
}
