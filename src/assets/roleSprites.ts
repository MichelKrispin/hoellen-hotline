import Phaser from "phaser";
import manifest from "./source/role-sprites/manifest.json";
import type { Role } from "../game/state/contracts";

const sources = import.meta.glob("./generated/role-sprites/*/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type RoleSpriteId =
  | "phone_base"
  | "handset"
  | "caller_ghost"
  | "spectral_mouth"
  | "ring_energy"
  | "alarm_button"
  | "filing_cabinet"
  | "case_file_stack"
  | "rulebook_open"
  | "infernal_stamp"
  | "paper_stack"
  | "torn_record_slip"
  | "wax_seal_pin"
  | "paper_fragments"
  | "routing_console"
  | "lever_bank"
  | "single_lever"
  | "red_push_button"
  | "warning_beacon"
  | "analog_gauge"
  | "gauge_needle"
  | "machine_fx"
  | "paper_note"
  | "receipt_roll"
  | "demonic_plant"
  | "watching_eyes"
  | "red_siren"
  | "push_button"
  | "horned_signplate"
  | "cyan_neon_frame";

const definitions = new Map(
  Object.entries(manifest.roles).flatMap(([group, { sprites }]) =>
    sprites.map((sprite) => [sprite.id, { ...sprite, group }] as const),
  ),
);

export function preloadRoleSprites(scene: Phaser.Scene, role: Role): void {
  for (const [id, sprite] of definitions) {
    if (sprite.group !== "shared" && sprite.group !== role) continue;
    const key = `role-sprite:${id}`;
    if (scene.textures.exists(key)) continue;
    const path = `./generated/role-sprites/${sprite.group}/${id}.webp`;
    if (!sources[path]) throw new Error(`Missing role sprite: ${id}`);
    scene.load.image(key, sources[path]);
  }
}

/** Fit a prop inside its layout box without stretching its illustration. */
export function roleSprite(
  scene: Phaser.Scene,
  id: RoleSpriteId,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Image {
  const sprite = definitions.get(id)!;
  const [w, h] = sprite.size;
  const scale = Math.min(width / w!, height / h!);
  const image = scene.add
    .image(x + width / 2, y + height / 2, `role-sprite:${id}`)
    .setOrigin(0.5)
    .setDisplaySize(w! * scale, h! * scale)
    .setName(`role-sprite:${id}`);
  // The supplied gauge crop includes a sliver of the neighbouring beacon.
  if (id === "analog_gauge") image.setCrop(8, 0, image.width - 8, image.height);
  return image;
}
