import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import manifest from "../src/assets/source/role-sprites/manifest.json";

/** Keep the supplied originals; ship smaller, alpha-preserving role textures. */
export function buildRoleSprites(): void {
  for (const [group, { sprites }] of Object.entries(manifest.roles)) {
    let bytes = 0;
    let vram = 0;
    for (const sprite of sprites) {
      const source = join("src/assets/source/role-sprites", sprite.file);
      const target = join(
        "src/assets/generated/role-sprites",
        group,
        `${sprite.id}.webp`,
      );
      mkdirSync(dirname(target), { recursive: true });
      execFileSync("magick", [
        source,
        "-resize",
        "512x512>",
        "-strip",
        "-quality",
        "86",
        target,
      ]);
      const size = execFileSync(
        "magick",
        ["identify", "-format", "%w %h", target],
        { encoding: "utf8" },
      )
        .trim()
        .split(" ")
        .map(Number);
      bytes += readFileSync(target).byteLength;
      vram += size[0]! * size[1]! * 4;
    }
    if (bytes > 1024 * 1024 || vram > 8 * 1024 * 1024)
      throw new Error(`Role sprites ${group} exceed download or VRAM budget`);
    console.log(
      `Role sprites ${group}: ${sprites.length} textures, ${(bytes / 1024).toFixed(1)} KiB, ${(vram / 1048576).toFixed(2)} MiB VRAM`,
    );
  }
}
