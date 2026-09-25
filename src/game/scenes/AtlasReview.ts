import Phaser from "phaser";
import { atlasGroups, preloadAssetGroups } from "../../assets/registry";
import { DESIGN, TOKENS } from "../../ui/tokens";
import { installDebugNavigation } from "./navigation";

const manifests = import.meta.glob("../../assets/generated/*.json", {
  eager: true,
  import: "default",
}) as Record<
  string,
  {
    frames: Record<
      string,
      {
        frame: { x: number; y: number; w: number; h: number };
        pivot: { x: number; y: number };
      }
    >;
    meta: {
      size: { w: number; h: number };
      preloadBytes: number;
      vramBytes: number;
      animation: { fps: number; loop: boolean };
    };
  }
>;

export class AtlasReview extends Phaser.Scene {
  private selected = 0;

  constructor() {
    super("AtlasReview");
  }

  preload(): void {
    preloadAssetGroups(this, [...atlasGroups()]);
  }

  create(): void {
    this.game.canvas.dataset.scene = "AtlasReview";
    this.cameras.main.setBackgroundColor(TOKENS.color.background);
    this.input.keyboard?.on("keydown-LEFT", () => this.select(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.select(1));
    this.draw();
    installDebugNavigation(this);
  }

  private select(delta: number): void {
    this.selected =
      (this.selected + delta + atlasGroups().length) % atlasGroups().length;
    this.draw();
  }

  private draw(): void {
    this.children.removeAll(true);
    const group = atlasGroups()[this.selected]!;
    const manifest = manifests[`../../assets/generated/${group}.json`];
    this.add.text(70, 30, `ATLAS REVIEW  ← ${group} →`, {
      fontSize: "36px",
      color: "#f4e1bd",
    });
    if (!manifest || !this.textures.exists(group)) {
      this.add.text(70, 120, `MISSING ATLAS: ${group}`, {
        fontSize: "36px",
        color: "#ff6755",
      });
      return;
    }
    const scale = Math.min(
      1,
      1200 / manifest.meta.size.w,
      850 / manifest.meta.size.h,
    );
    const originX = 70;
    const originY = 105;
    this.add.image(originX, originY, group).setOrigin(0).setScale(scale);
    const graphics = this.add.graphics();
    graphics.lineStyle(2, TOKENS.color.cyan);
    for (const [name, entry] of Object.entries(manifest.frames)) {
      const frame = entry.frame;
      graphics.strokeRect(
        originX + frame.x * scale,
        originY + frame.y * scale,
        frame.w * scale,
        frame.h * scale,
      );
      graphics
        .fillStyle(TOKENS.color.error)
        .fillCircle(
          originX + (frame.x + entry.pivot.x * frame.w) * scale,
          originY + (frame.y + entry.pivot.y * frame.h) * scale,
          4,
        );
      this.add.text(
        originX + frame.x * scale + 4,
        originY + frame.y * scale + 4,
        name,
        {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#211423",
        },
      );
    }
    this.add.text(
      1310,
      110,
      `${Object.keys(manifest.frames).length} Frames\n${manifest.meta.size.w}×${manifest.meta.size.h}\n${(manifest.meta.preloadBytes / 1024).toFixed(1)} KiB Download\n${(manifest.meta.vramBytes / 1048576).toFixed(2)} MiB VRAM\n${manifest.meta.animation.fps} FPS · ${manifest.meta.animation.loop ? "Loop" : "Still"}\n\nCyan: Bounds\nRot: Pivot\n← / →: Gruppe`,
      {
        fontSize: "28px",
        color: "#f4e1bd",
        lineSpacing: 14,
        wordWrap: { width: DESIGN.width - 1380 },
      },
    );
  }
}
