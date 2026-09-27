import Phaser from "phaser";

const urls = import.meta.glob("./source/placeholders/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const shapeUrls = import.meta.glob(
  [
    "./source/placeholders/panel-*.svg",
    "./source/placeholders/neon-frame.svg",
    "./source/placeholders/room-sign.svg",
  ],
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

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

export function shapePlaceholderKey(name: PlaceholderName): string {
  return `placeholder:shape:${name}`;
}

export function preloadPlaceholders(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(urls)) {
    const name = path
      .split("/")
      .at(-1)!
      .replace(/\.png$/, "") as PlaceholderName;
    scene.load.image(placeholderKey(name), url);
  }
  for (const name of [
    "panel-metal",
    "panel-wood",
    "panel-bakelite",
    "panel-paper",
    "neon-frame",
    "room-sign",
  ] as const) {
    const url = shapeUrls[`./source/placeholders/${name}.svg`];
    if (url) scene.load.image(shapePlaceholderKey(name), url);
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
