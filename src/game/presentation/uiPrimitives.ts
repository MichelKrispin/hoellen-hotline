import Phaser from "phaser";
import { placeholder, shapePlaceholderKey } from "../../assets/placeholders";
import { TOKENS } from "../../ui/tokens";
import { label, plate } from "./art";

const C = TOKENS.color;

export type PhysicalLabelMaterial = "metal" | "wood" | "bakelite" | "paper";

export interface PhysicalLabelOptions {
  material?: PhysicalLabelMaterial;
  fontSize?: number;
  color?: string;
  paddingX?: number;
  paddingY?: number;
}

const MATERIAL_FILL: Record<PhysicalLabelMaterial, number> = {
  metal: C.metal,
  wood: C.wood,
  bakelite: C.bakelite,
  paper: C.paper,
};

/** Massive, reusable metal housing for machines, displays and HUD modules. */
export function metalHousing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.NineSlice {
  return plate(scene, x, y, width, height, C.metal, C.metalEdge);
}

/** Paper reading surface. Text should be rendered separately and kept level. */
export function paperSurface(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Image {
  return placeholder(scene, "paper-sheet", x, y, width, height);
}

/** Bakelite control housing. Accent is optional and never carries meaning alone. */
export function bakeliteControl(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent?: number,
): Phaser.GameObjects.NineSlice {
  const surface = plate(scene, x, y, width, height, C.bakelite);
  if (accent !== undefined)
    neonIndicator(scene, x + 8, y + 8, width - 16, height - 16, accent);
  return surface;
}

/** Restrained neon signal for active/warning states, not generic panel decoration. */
export function neonIndicator(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, shapePlaceholderKey("neon-frame"))
    .setOrigin(0)
    .setDisplaySize(width, height)
    .setTint(color);
}

/** Physical section label with a straight, readable text layer. */
export function physicalLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  options: PhysicalLabelOptions = {},
): { surface: Phaser.GameObjects.NineSlice; text: Phaser.GameObjects.Text } {
  const material = options.material ?? "metal";
  const fontSize = options.fontSize ?? 21;
  const paddingX = options.paddingX ?? 16;
  const paddingY =
    options.paddingY ?? Math.max(6, Math.floor((height - fontSize) / 2));
  const surface = plate(scene, x, y, width, height, MATERIAL_FILL[material]);
  const text = label(
    scene,
    x + paddingX,
    y + paddingY,
    value,
    fontSize,
    options.color ?? (material === "paper" ? C.ink : C.text),
    Math.max(1, width - paddingX * 2),
  );
  return { surface, text };
}
