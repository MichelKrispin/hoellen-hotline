import Phaser from "phaser";
import { preloadPlaceholders } from "../../assets/placeholders";
import { preloadWorkspaceSprites } from "../../assets/workspaceSprites";
import agentPortrait from "../../assets/generated/role-agent/clerk@2x.png?url";
import archivistPortrait from "../../assets/generated/role-agent/map-folder@2x.png?url";
import dispatcherPortrait from "../../assets/generated/role-agent/biscuit-auditor@2x.png?url";
import titleRoom from "../../assets/title-room.webp?url";
import lobbySign from "../../assets/lobby-sign.png?url";

export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload(): void {
    preloadPlaceholders(this);
    preloadWorkspaceSprites(this);
    this.load.image("role-figure-agent", agentPortrait);
    this.load.image("role-figure-archivist", archivistPortrait);
    this.load.image("role-figure-dispatcher", dispatcherPortrait);
    this.load.image("title-room", titleRoom);
    this.load.image("lobby-sign", lobbySign);
  }
  create(): void {
    this.scene.start("Lobby");
  }
}
