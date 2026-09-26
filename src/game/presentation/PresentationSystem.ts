import Phaser from "phaser";
import type { GameNetwork } from "../../net/gameNetwork";
import { ReactionScheduler } from "./reactionScheduler";
import { prefersReducedMotion } from "../../app/options";
import { placeholder } from "../../assets/placeholders";

export class PresentationSystem {
  private readonly scheduler = new ReactionScheduler();
  private readonly graphics: Record<string, Phaser.GameObjects.Image>;
  private readonly unsubscribe: () => void;
  private lastReaction = "";
  private lastIncident = "";
  private lastPressure = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly network: GameNetwork,
  ) {
    const figure = placeholder(scene, "warning-light", 52, 736, 48, 48);
    const plant = placeholder(scene, "plant", 1795, 740, 110, 120);
    const pipes = placeholder(scene, "pipe", 1388, 275, 34, 250);
    const gauge = placeholder(scene, "gauge-face", 1798, 688, 64, 64);
    const demons = placeholder(scene, "demon-eyes", 235, 400, 68, 24);
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
    if (prefersReducedMotion()) {
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
