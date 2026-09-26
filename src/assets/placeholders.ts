import Phaser from "phaser";

const urls = import.meta.glob("./source/placeholders/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type PlaceholderName =
  | "hellscape-backdrop"
  | "hellscape-city"
  | "bridge"
  | "pipe"
  | "chain"
  | "ember"
  | "desk-wood"
  | "panel-metal"
  | "panel-wood"
  | "panel-bakelite"
  | "panel-paper"
  | "paper-sheet"
  | "neon-frame"
  | "gauge-face"
  | "gauge-needle"
  | "telephone"
  | "filing-cabinet"
  | "archive-stack"
  | "rulebook"
  | "routing-machine"
  | "lever-console"
  | "lever-arm"
  | "button"
  | "warning-light"
  | "room-sign"
  | "soul"
  | "plant"
  | "demon-eyes"
  | "stamp"
  | "fax-slip"
  | "spark"
  | "handset"
  | "soul-mouth"
  | "smoke";

export function placeholderKey(name: PlaceholderName): string {
  return `placeholder:${name}`;
}

export function preloadPlaceholders(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(urls)) {
    const name = path
      .split("/")
      .at(-1)!
      .replace(/\.svg$/, "") as PlaceholderName;
    scene.load.image(placeholderKey(name), url);
  }
}

export function placeholder(
  scene: Phaser.Scene,
  name: PlaceholderName,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, placeholderKey(name))
    .setOrigin(0)
    .setDisplaySize(width, height);
}
