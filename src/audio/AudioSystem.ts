const files = import.meta.glob("./generated/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type AudioBus = "master" | "music" | "sfx" | "ui";
export type AudioSettings = Record<AudioBus, number>;
const storageKey = "hoellen-hotline.audio.v1";
const defaults: AudioSettings = {
  master: 0.7,
  music: 0.35,
  sfx: 0.55,
  ui: 0.45,
};

function readSettings(): AudioSettings {
  try {
    const value = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as Partial<AudioSettings> | null;
    return Object.fromEntries(
      (Object.keys(defaults) as AudioBus[]).map((bus) => [
        bus,
        Math.max(0, Math.min(1, Number(value?.[bus] ?? defaults[bus]))),
      ]),
    ) as AudioSettings;
  } catch {
    return { ...defaults };
  }
}

export class AudioSystem {
  readonly settings = readSettings();
  private context: AudioContext | null = null;
  private gains: Record<AudioBus, GainNode> | null = null;
  private buffers: AudioBuffer[] = [];
  private ambience: { oscillator: OscillatorNode; gain: GainNode } | null =
    null;
  private timer: number | null = null;
  private jingleIndex = 0;
  private escalation = 0;
  private readonly visibility = (): void => {
    if (!this.context) return;
    if (document.hidden) void this.context.suspend();
    else void this.context.resume();
  };

  constructor() {
    document.addEventListener("visibilitychange", this.visibility);
  }

  get unlocked(): boolean {
    return this.context !== null && this.context.state === "running";
  }

  async unlock(): Promise<boolean> {
    try {
      if (!this.context) {
        const context = new AudioContext();
        const master = context.createGain();
        const music = context.createGain();
        const sfx = context.createGain();
        const ui = context.createGain();
        music.connect(master);
        sfx.connect(master);
        ui.connect(master);
        master.connect(context.destination);
        this.context = context;
        this.gains = { master, music, sfx, ui };
        this.applyVolumes();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 55;
        gain.gain.value = 0;
        oscillator.connect(gain).connect(music);
        oscillator.start();
        this.ambience = { oscillator, gain };
        this.setEscalation(this.escalation);
        void this.loadJingles();
        this.timer = window.setInterval(() => this.playJingle(), 22000);
      }
      await this.context.resume();
      return this.unlocked;
    } catch {
      return false;
    }
  }

  setVolume(bus: AudioBus, value: number): void {
    this.settings[bus] = Math.max(0, Math.min(1, value));
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.settings));
    } catch {
      /* Storage may be unavailable. */
    }
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.gains) return;
    for (const bus of Object.keys(this.gains) as AudioBus[])
      this.gains[bus].gain.value = this.settings[bus];
  }

  private async loadJingles(): Promise<void> {
    const context = this.context;
    if (!context) return;
    const urls = Object.entries(files)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, url]) => url);
    this.buffers = (
      await Promise.all(
        urls.map(async (url) => {
          try {
            return await context.decodeAudioData(
              await (await fetch(url)).arrayBuffer(),
            );
          } catch {
            return null;
          }
        }),
      )
    ).filter((buffer): buffer is AudioBuffer => buffer !== null);
    this.playJingle();
  }

  playJingle(): void {
    if (
      !this.unlocked ||
      !this.context ||
      !this.gains ||
      !this.buffers.length ||
      document.hidden
    )
      return;
    const source = this.context.createBufferSource();
    source.buffer = this.buffers[this.jingleIndex++ % this.buffers.length]!;
    source.connect(this.gains.music);
    source.start();
  }

  setEscalation(value: number): void {
    this.escalation = Math.max(0, Math.min(1, value));
    if (!this.context || !this.ambience) return;
    const now = this.context.currentTime;
    this.ambience.oscillator.frequency.setTargetAtTime(
      55 + this.escalation * 35,
      now,
      0.2,
    );
    this.ambience.gain.gain.setTargetAtTime(
      0.01 + this.escalation * 0.09,
      now,
      0.2,
    );
  }

  tone(bus: "sfx" | "ui", frequency = 240): void {
    if (!this.unlocked || !this.context || !this.gains || document.hidden)
      return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = bus === "ui" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency / 2),
      context.currentTime + 0.15,
    );
    gain.gain.setValueAtTime(0.09, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(this.gains[bus]);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  }

  destroy(): void {
    document.removeEventListener("visibilitychange", this.visibility);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.ambience?.oscillator.stop();
    void this.context?.close();
  }
}
