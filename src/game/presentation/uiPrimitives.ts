import Phaser from "phaser";
import { placeholder, shapePlaceholderKey } from "../../assets/placeholders";
import { TOKENS } from "../../ui/tokens";
import { label, plate } from "./art";

const C = TOKENS.color;

export type PhysicalLabelMaterial = "metal" | "wood" | "bakelite" | "paper";
export type PaperVariant = "card" | "form" | "note" | "clipboard" | "dossier" | "continuous";

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
  const surface = plate(scene, x, y, width, height, C.metal, C.metalEdge);
  const details = scene.add.graphics();
  details.lineStyle(2, C.metalEdge, 0.55);
  details.lineBetween(x + 26, y + 12, x + width - 26, y + 12);
  details.lineBetween(x + 26, y + height - 13, x + width - 26, y + height - 13);
  for (const rivetX of [x + 18, x + width - 18]) {
    for (const rivetY of [y + 18, y + height - 18]) {
      details.fillStyle(0x171216).fillCircle(rivetX, rivetY, 5);
      details.fillStyle(0xa08a7c, 0.8).fillCircle(rivetX - 1, rivetY - 1, 2);
    }
  }
  return surface;
}

/** Paper reading surface. Text should be rendered separately and kept level. */
export function paperSurface(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: PaperVariant = "form",
): Phaser.GameObjects.Image {
  const surface = placeholder(scene, "paper-sheet", x, y, width, height);
  const detail = scene.add.graphics();
  if (variant === "clipboard") {
    detail.fillStyle(C.metal).fillRoundedRect(x + width / 2 - 35, y - 4, 70, 17, 4);
    detail.fillStyle(C.metalEdge).fillCircle(x + width / 2, y + 4, 4);
  } else if (variant === "continuous") {
    detail.lineStyle(2, 0x9d7155, 0.65);
    for (let lineY = y + 34; lineY < y + height - 18; lineY += 42)
      detail.lineBetween(x + 24, lineY, x + width - 24, lineY);
  } else if (variant === "dossier") {
    detail.fillStyle(0x9d7155).fillRect(x + 28, y - 5, 110, 16);
  } else if (variant === "note" || variant === "card") {
    detail.lineStyle(2, 0x9d7155, 0.6);
    detail.lineBetween(x + 16, y + height - 20, x + width - 16, y + height - 20);
  }
  return surface;
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
  scene.add.graphics()
    .lineStyle(2, C.metalEdge, 0.7)
    .lineBetween(x + 14, y + 8, x + width - 14, y + 8);
  if (accent !== undefined)
    neonIndicator(scene, x + 16, y + height - 15, Math.min(38, width - 32), 6, accent);
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
