import Phaser from "phaser";

// One semantic asset per replaceable part; PNG/WebP artwork wins over the draft.
const sources = import.meta.glob("./source/workspaces/*.{svg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const WORKSPACE_SPRITES = {
  "iron-frame": { slice: 20 },
  "cyan-monitor": { slice: 20 },
  "control-housing": { slice: 20 },
  "paper-card": { slice: 20 },
  "dossier-paper": { slice: 20 },
  "hint-slip": { slice: 20 },
  "clipboard-clip": {},
  "book-spread": {},
  "book-tab": {},
  "stamp-base": {},
  "stamp-cap": {},
  "dial-face": {},
  "dial-pointer": {},
  "switch-track": {},
  "switch-handle": {},
  "slider-track": {},
  "slider-thumb": {},
  "lever-housing": { slice: 32 },
} as const;
export type WorkspaceSpriteId = keyof typeof WORKSPACE_SPRITES;

export function preloadWorkspaceSprites(scene: Phaser.Scene): void {
  for (const id of Object.keys(WORKSPACE_SPRITES) as WorkspaceSpriteId[]) {
    const path = ["webp", "png", "svg"]
      .map((extension) => `./source/workspaces/${id}.${extension}`)
      .find((candidate) => sources[candidate]);
    if (!path) throw new Error(`Missing workspace sprite: ${id}`);
    scene.load.image(`workspace:${id}`, sources[path]!);
  }
}

export function workspaceSprite(
  scene: Phaser.Scene,
  id: WorkspaceSpriteId,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice {
  const definition = WORKSPACE_SPRITES[id];
  const key = `workspace:${id}`;
  const sprite =
    "slice" in definition
      ? scene.add.nineslice(
          x,
          y,
          key,
          undefined,
          width,
          height,
          definition.slice,
          definition.slice,
          definition.slice,
          definition.slice,
        )
      : scene.add.image(x, y, key).setDisplaySize(width, height);
  return sprite.setOrigin(0).setName(`sprite:${id}`);
}
