import type Phaser from "phaser";

const sources = import.meta.glob("./source/portraits/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function preloadPortraits(scene: Phaser.Scene): void {
  for (const [file, url] of Object.entries(sources)) {
    const slug = file
      .split("/")
      .at(-1)!
      .replace(/\.svg$/, "");
    const assetId = `asset.core.portrait.${slug}`;
    if (!scene.textures.exists(assetId))
      scene.load.svg(assetId, url, { width: 160, height: 200 });
  }
}
