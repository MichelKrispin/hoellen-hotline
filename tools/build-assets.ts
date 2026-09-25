import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve("src/assets");
const source = join(root, "source");
const output = join(root, "generated");
const atlasLimit = 2048;

type Frame = {
  filename: string;
  assetName: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: false;
  trimmed: false;
  spriteSourceSize: { x: 0; y: 0; w: number; h: number };
  sourceSize: { w: number; h: number };
  pivot: { x: number; y: number };
  animation: {
    fps: number;
    loop: boolean;
    hitbox: { x: number; y: number; w: number; h: number };
    allowedCropping: false;
    reducedMotionFrame: string;
  };
};

function run(program: string, args: string[]): void {
  try {
    execFileSync(program, args, { stdio: "pipe" });
  } catch (error) {
    throw new Error(
      `${program} failed. Install librsvg and ImageMagick. ${String(error)}`,
    );
  }
}

function dimensions(svg: string): [number, number] {
  const match = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!match) throw new Error("SVG needs a numeric viewBox");
  return [Number(match[1]), Number(match[2])];
}

function buildGroup(name: string, files: string[], folder: string): void {
  const groupDir = join(output, name);
  mkdirSync(groupDir, { recursive: true });
  if (!files.length) throw new Error(`Empty atlas ${name}`);
  const [width, height] = dimensions(
    readFileSync(join(folder, files[0]!), "utf8"),
  );
  const columns = Math.min(6, Math.floor(atlasLimit / width), files.length);
  const rows = Math.ceil(files.length / columns);
  if (columns < 1 || rows * height > atlasLimit)
    throw new Error(`${name} exceeds ${atlasLimit}×${atlasLimit}`);
  const frames: Record<string, Frame> = {};
  const rasterFiles: string[] = [];
  for (const [index, file] of files.entries()) {
    const [w, h] = dimensions(readFileSync(join(folder, file), "utf8"));
    if (w !== width || h !== height)
      throw new Error(`${file} differs from atlas cell size`);
    const stem = file.replace(/\.svg$/, "");
    const source2x = join(groupDir, `${stem}@2x.png`);
    const png = join(groupDir, `${stem}.png`);
    run("rsvg-convert", [
      "-w",
      String(w * 2),
      "-h",
      String(h * 2),
      "-o",
      source2x,
      join(folder, file),
    ]);
    run("magick", [
      source2x,
      "-filter",
      "Lanczos",
      "-resize",
      `${w}x${h}!`,
      png,
    ]);
    run("magick", [png, "-quality", "86", join(groupDir, `${stem}.webp`)]);
    rasterFiles.push(png);
    frames[stem] = {
      filename: stem,
      assetName: `core.${name}.${stem}.still.0`,
      frame: {
        x: (index % columns) * width,
        y: Math.floor(index / columns) * height,
        w,
        h,
      },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      pivot: { x: 0.5, y: 0.5 },
      animation: {
        fps: 1,
        loop: false,
        hitbox: { x: 0, y: 0, w, h },
        allowedCropping: false,
        reducedMotionFrame: stem,
      },
    };
  }
  const atlas = join(output, `${name}.png`);
  run("magick", [
    "montage",
    ...rasterFiles,
    "-tile",
    `${columns}x${rows}`,
    "-geometry",
    `${width}x${height}+0+0`,
    "-background",
    "none",
    atlas,
  ]);
  const actualBytes = readFileSync(atlas).byteLength;
  const vramBytes = columns * width * rows * height * 4;
  if (actualBytes > 2 * 1024 * 1024 || vramBytes > 16 * 1024 * 1024)
    throw new Error(`${name} exceeds download or VRAM budget`);
  const meta = {
    app: "hoellen-hotline-asset-pipeline",
    image: `${name}.png`,
    size: { w: columns * width, h: rows * height },
    scale: "1",
    assetGroup: name,
    vramBytes,
    preloadBytes: actualBytes,
    animation: {
      fps: 1,
      loop: false,
      hitbox: { x: 0, y: 0, w: width, h: height },
      allowedCropping: false,
    },
    material: "non-scalable-detail",
  };
  writeFileSync(
    join(output, `${name}.json`),
    `${JSON.stringify({ frames, meta }, null, 2)}\n`,
  );
  console.log(
    `${name}: ${files.length} frames, ${meta.size.w}×${meta.size.h}, ${(actualBytes / 1024).toFixed(1)} KiB, ${(vramBytes / 1048576).toFixed(2)} MiB VRAM`,
  );
}

mkdirSync(output, { recursive: true });
const portraits = readdirSync(join(source, "portraits"))
  .filter((name) => name.endsWith(".svg"))
  .sort();
const reactions = readdirSync(join(source, "reactions"))
  .filter((name) => name.endsWith(".svg"))
  .sort();
buildGroup("role-agent", portraits, join(source, "portraits"));
buildGroup("shared", reactions, join(source, "reactions"));
buildGroup("role-archivist", ["clerk-copy.svg"], join(source, "portraits"));
buildGroup("role-dispatcher", ["clerk-retired.svg"], join(source, "portraits"));
