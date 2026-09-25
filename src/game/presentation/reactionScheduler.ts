export class ReactionScheduler {
  private readonly cooldowns = new Map<string, number>();
  private readonly active = new Map<
    string,
    { until: number; priority: number }
  >();

  constructor(
    private readonly maxGroups = 2,
    private readonly cooldownMs = 1800,
  ) {}

  allow(
    key: string,
    group: string,
    priority: number,
    now: number,
    durationMs = 800,
  ): boolean {
    if ((this.cooldowns.get(key) ?? -Infinity) > now) return false;
    for (const [name, entry] of this.active)
      if (entry.until <= now) this.active.delete(name);
    if (!this.active.has(group) && this.active.size >= this.maxGroups) {
      const lowest = [...this.active].sort(
        (a, b) => a[1].priority - b[1].priority,
      )[0];
      if (!lowest || lowest[1].priority >= priority) return false;
      this.active.delete(lowest[0]);
    }
    this.cooldowns.set(key, now + this.cooldownMs);
    this.active.set(group, { until: now + durationMs, priority });
    return true;
  }
}
