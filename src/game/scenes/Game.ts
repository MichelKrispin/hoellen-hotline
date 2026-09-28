import Phaser from "phaser";
import { button, installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";
import type { Role } from "../state/contracts";
import type { GameNetwork } from "../../net/gameNetwork";
import { GameNetworkOverlay } from "../../ui/gameNetworkOverlay";
import { preloadAssetGroups } from "../../assets/registry";
import { preloadRoleSprites } from "../../assets/roleSprites";
import { AgentPanel } from "../roles/agent/AgentPanel";
import { ArchivistPanel } from "../roles/archivist/ArchivistPanel";
import { DispatcherPanel } from "../roles/dispatcher/DispatcherPanel";
import { PresentationSystem } from "../presentation/PresentationSystem";
import { ShiftMirror } from "../../ui/shiftMirror";
import { prefersReducedMotion } from "../../app/options";
import { room, statusBar } from "../presentation/art";
import { roleWorkspace } from "../presentation/roleWorkspaces";

const C = TOKENS.color;

export class Game extends Phaser.Scene {
  private role: Role = "agent";
  private network: GameNetwork | null = null;
  private overlay: GameNetworkOverlay | null = null;
  private agentPanel: AgentPanel | null = null;
  private archivistPanel: ArchivistPanel | null = null;
  private dispatcherPanel: DispatcherPanel | null = null;
  private presentation: PresentationSystem | null = null;
  private shiftMirror: ShiftMirror | null = null;
  constructor() {
    super("Game");
  }
  init(data: { role?: Role; network?: GameNetwork }): void {
    this.network = data.network ?? null;
    this.role =
      data.role === "archivist" || data.role === "dispatcher"
        ? data.role
        : "agent";
  }
  preload(): void {
    const progress = this.add.text(96, 72, "Pultgrafiken laden: 0 %", {
      fontFamily: "Arial, sans-serif",
      fontSize: "28px",
      color: "#f4e1bd",
    });
    this.load.on("progress", (fraction: number) =>
      progress.setText(`Pultgrafiken laden: ${Math.round(fraction * 100)} %`),
    );
    this.load.once("complete", () => progress.destroy());
    preloadAssetGroups(this, ["shared", `role-${this.role}`]);
    preloadRoleSprites(this, this.role);
  }
  create(): void {
    document.body.classList.add("role-game");
    this.game.canvas.dataset.scene = "Game";
    this.game.canvas.dataset.role = this.role;
    this.cameras.main.setBackgroundColor(C.background);
    room(
      this,
      this.role === "agent" ? 0 : this.role === "archivist" ? 120 : 240,
    );
    const hud = statusBar(this, this.role);
    const unsubscribeHud = this.network?.subscribe(() => {
      if (this.network?.view) hud.update(this.network.view.public);
    });
    roleWorkspace(this, this.role, Boolean(this.network));
    const shiftEnded = (): boolean =>
      this.network?.status === "ended" ||
      this.network?.status === "host-aborted" ||
      this.network?.status === "guest-aborted";
    const exitButton = button(
      this,
      1650,
      146,
      this.network?.isHost
        ? "SCHICHT ABBRECHEN"
        : this.network
          ? "PARTIE VERLASSEN"
          : "ERGEBNIS  →",
      () => {
        if (!this.network) this.scene.start("Results");
        else if (this.network.isHost && !shiftEnded())
          this.network.submit({ kind: "ABANDON" });
        else this.scene.start("Title");
      },
      C.dispatcher,
      260,
      48,
    );
    const unsubscribeExit = this.network?.subscribe(() => {
      if (shiftEnded()) exitButton.setText("ZUM TITEL");
    });
    if (this.network) this.overlay = new GameNetworkOverlay(this.network);
    if (this.network && this.role === "agent")
      this.agentPanel = new AgentPanel(this, this.network);
    if (this.network && this.role === "archivist")
      this.archivistPanel = new ArchivistPanel(this, this.network);
    if (this.network && this.role === "dispatcher")
      this.dispatcherPanel = new DispatcherPanel(
        this,
        this.network,
        this.overlay!.audio,
      );
    if (this.network)
      this.presentation = new PresentationSystem(this, this.network);
    if (this.network) this.shiftMirror = new ShiftMirror(this.network);
    const updateMotion = (): void => {
      if (prefersReducedMotion()) {
        this.tweens.pauseAll();
        for (const name of [
          "agent-operator",
          "archivist-worker",
          "dispatcher-worker",
        ])
          (
            this.children.getByName(name) as Phaser.GameObjects.Image | null
          )?.setAngle(0);
      } else this.tweens.resumeAll();
    };
    window.addEventListener("display-options-changed", updateMotion);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.body.classList.remove("role-game");
      window.removeEventListener("display-options-changed", updateMotion);
      this.shiftMirror?.destroy();
      this.shiftMirror = null;
      this.presentation?.destroy();
      this.presentation = null;
      unsubscribeHud?.();
      unsubscribeExit?.();
      this.dispatcherPanel?.destroy();
      this.dispatcherPanel = null;
      this.archivistPanel?.destroy();
      this.archivistPanel = null;
      this.agentPanel?.destroy();
      this.agentPanel = null;
      this.overlay?.destroy();
      this.overlay = null;
    });
    installDebugNavigation(this);
  }
}
