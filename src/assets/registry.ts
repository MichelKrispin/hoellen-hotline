import Phaser from "phaser";

const images = import.meta.glob("./generated/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const data = import.meta.glob("./generated/*.json", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type AssetGroup =
  | "boot"
  | "shared"
  | "role-agent"
  | "role-archivist"
  | "role-dispatcher"
  | `campaign-${string}`;
export type TextureRef = { key: string; frame?: string; missing: boolean };

const groups = [
  "shared",
  "role-agent",
  "role-archivist",
  "role-dispatcher",
] as const;

export function preloadAssetGroups(
  scene: Phaser.Scene,
  requested: AssetGroup[],
): void {
  for (const group of requested) {
    const image = images[`./generated/${group}.png`];
    const json = data[`./generated/${group}.json`];
    if (image && json && !scene.textures.exists(group))
      scene.load.atlas(group, image, json);
  }
  if (!scene.textures.exists("asset.placeholder")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x30232a).fillRect(0, 0, 160, 200);
    g.lineStyle(7, 0xff6755).strokeRect(3, 3, 154, 194);
    g.lineStyle(10, 0xff6755).lineBetween(28, 36, 132, 164);
    g.lineBetween(132, 36, 28, 164);
    g.generateTexture("asset.placeholder", 160, 200);
    g.destroy();
  }
}

export function textureFor(scene: Phaser.Scene, assetId: string): TextureRef {
  const portrait = /^asset\.core\.portrait\.([a-z0-9-]+)$/.exec(assetId);
  if (
    portrait &&
    scene.textures.exists("role-agent") &&
    scene.textures.get("role-agent").has(portrait[1]!)
  )
    return { key: "role-agent", frame: portrait[1], missing: false };
  return { key: "asset.placeholder", missing: true };
}

export function atlasGroups(): readonly AssetGroup[] {
  return groups;
}
