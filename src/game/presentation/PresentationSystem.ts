import Phaser from "phaser";
import type { GameNetwork } from "../../net/gameNetwork";
import { TOKENS } from "../../ui/tokens";
import { ReactionScheduler } from "./reactionScheduler";

export class PresentationSystem {
  private readonly scheduler = new ReactionScheduler();
  private readonly graphics: Record<string, Phaser.GameObjects.Graphics>;
  private readonly unsubscribe: () => void;
  private lastReaction = "";
  private lastIncident = "";
  private lastPressure = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly network: GameNetwork,
  ) {
    const figure = scene.add.graphics();
    figure.fillStyle(TOKENS.color.fire).fillCircle(76, 760, 24);
    figure.fillStyle(0x161019).fillCircle(68, 756, 4).fillCircle(84, 756, 4);
    const plant = scene.add.graphics();
    plant.lineStyle(7, TOKENS.color.success).lineBetween(1850, 850, 1850, 750);
    plant
      .fillStyle(TOKENS.color.success)
      .fillEllipse(1825, 785, 52, 25)
      .fillEllipse(1873, 775, 52, 25);
    const pipes = scene.add.graphics();
    pipes
      .lineStyle(12, TOKENS.color.metalEdge)
      .lineBetween(1405, 275, 1405, 510);
    pipes.fillStyle(TOKENS.color.fire).fillCircle(1405, 510, 11);
    const gauge = scene.add.graphics();
    gauge.lineStyle(6, TOKENS.color.warning).strokeCircle(1830, 720, 32);
    gauge.lineStyle(4, TOKENS.color.error).lineBetween(1830, 720, 1848, 700);
    const demons = scene.add.graphics();
    demons
      .fillStyle(TOKENS.color.fire)
      .fillEllipse(250, 412, 20, 9)
      .fillEllipse(288, 412, 20, 9);
    this.graphics = { figure, plant, pipes, gauge, demons };
    for (const graphic of Object.values(this.graphics))
      graphic.setDepth(5).setAlpha(0.72);
    this.unsubscribe = network.subscribe(() => this.update());
    this.update();
  }

  private pulse(
    group: keyof PresentationSystem["graphics"],
    key: string,
    priority: number,
  ): void {
    const now = performance.now();
    if (!this.scheduler.allow(key, group, priority, now)) return;
    const graphic = this.graphics[group];
    if (!graphic) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      graphic.setAlpha(1);
      this.scene.time.delayedCall(400, () => graphic.setAlpha(0.72));
      return;
    }
    this.scene.tweens.add({
      targets: graphic,
      alpha: 1,
      scale: 1.08,
      duration: 190,
      yoyo: true,
      repeat: 1,
      onComplete: () => graphic.setScale(1).setAlpha(0.72),
    });
  }

  private update(): void {
    const view = this.network.view;
    if (!view) return;
    const incident =
      view.role.role === "dispatcher" ? (view.role.incident?.id ?? "") : "";
    if (incident && incident !== this.lastIncident) {
      this.pulse("pipes", `incident:${incident}`, 3);
      this.pulse("plant", `plant:${incident}`, 2);
    }
    this.lastIncident = incident;
    const reaction = view.public.lastReaction;
    const reactionKey = reaction
      ? `${reaction.caseId}:${reaction.assetId}`
      : "";
    if (reactionKey && reactionKey !== this.lastReaction) {
      this.pulse("figure", `route:${reactionKey}`, 3);
      this.pulse("demons", `demons:${reactionKey}`, 2);
    }
    this.lastReaction = reactionKey;
    const pressure = Math.max(
      view.public.queuePressure,
      view.public.boilerPressure,
      view.public.auditRisk,
    );
    const tier =
      pressure >= 75 ? 3 : pressure >= 50 ? 2 : pressure >= 25 ? 1 : 0;
    if (tier > this.lastPressure && tier >= 2)
      this.pulse("gauge", `pressure:${tier}`, 1);
    this.lastPressure = tier;
  }

  destroy(): void {
    this.unsubscribe();
    for (const graphic of Object.values(this.graphics)) graphic.destroy();
  }
}
