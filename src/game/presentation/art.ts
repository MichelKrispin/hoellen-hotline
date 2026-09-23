import Phaser from "phaser";
import { DESIGN, TOKENS } from "../../ui/tokens";
import type { Role } from "../state/contracts";

const C = TOKENS.color;

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 28,
  color: string = C.text,
  width?: number,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily: "Arial, sans-serif",
    fontSize: `${size}px`,
    fontStyle: "bold",
    color,
    wordWrap: width ? { width } : undefined,
    lineSpacing: 10,
  });
}

export function plate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number = C.metal,
  edge: number = C.metalEdge,
  radius = 18,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x09080d, 0.55).fillRoundedRect(x + 9, y + 12, w, h, radius);
  g.fillStyle(fill).fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(5, edge).strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, radius);
  g.lineStyle(2, 0xb5806b, 0.22).lineBetween(
    x + 26,
    y + 12,
    x + w - 26,
    y + 12,
  );
  const screws: [number, number][] = [
    [x + 21, y + 21],
    [x + w - 21, y + 21],
    [x + 21, y + h - 21],
    [x + w - 21, y + h - 21],
  ];
  for (const [sx, sy] of screws) {
    g.fillStyle(0x150f19).fillCircle(sx, sy, 6);
    g.lineStyle(2, 0x9f7964).strokeCircle(sx, sy, 6);
  }
  return g;
}

export function paper(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const g = plate(scene, x, y, w, h, C.paper, 0x9d7155, 9);
  g.fillStyle(0xb17459, 0.14).fillTriangle(
    x + w - 62,
    y + 5,
    x + w - 5,
    y + 5,
    x + w - 5,
    y + 62,
  );
  g.lineStyle(2, 0x8f5b4b, 0.28);
  for (let yy = y + 84; yy < y + h - 32; yy += 54)
    g.lineBetween(x + 36, yy, x + w - 32, yy);
  g.fillStyle(0x76514a).fillRoundedRect(x + w / 2 - 50, y - 12, 100, 25, 6);
  g.fillStyle(0xc09b75).fillRoundedRect(x + w / 2 - 38, y - 8, 76, 11, 4);
}

export function neon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  const g = scene.add.graphics();
  g.fillStyle(color, 0.11).fillRoundedRect(x - 15, y - 15, w + 30, h + 30, 21);
  g.fillStyle(C.bakelite).fillRoundedRect(x, y, w, h, 15);
  g.lineStyle(14, color, 0.14).strokeRoundedRect(
    x + 5,
    y + 5,
    w - 10,
    h - 10,
    13,
  );
  g.lineStyle(5, color).strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 13);
  g.fillStyle(color, 0.12).fillRoundedRect(x + 12, y + 12, w - 24, h - 24, 9);
}

export function gauge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  value: number,
): void {
  const g = scene.add.graphics();
  g.fillStyle(0x110d17).fillCircle(x, y, radius + 11);
  g.lineStyle(8, C.metalEdge).strokeCircle(x, y, radius + 6);
  g.fillStyle(0xead3a9).fillCircle(x, y, radius);
  g.lineStyle(3, 0x8c6858).strokeCircle(x, y, radius - 5);
  for (let i = -3; i <= 3; i++) {
    const a = Math.PI * (1.05 + (i + 3) * 0.15);
    g.lineStyle(3, 0x56363a).lineBetween(
      x + Math.cos(a) * radius * 0.68,
      y + Math.sin(a) * radius * 0.68,
      x + Math.cos(a) * radius * 0.84,
      y + Math.sin(a) * radius * 0.84,
    );
  }
  const angle = Math.PI * (1.05 + value * 0.9);
  g.lineStyle(6, C.error).lineBetween(
    x,
    y,
    x + Math.cos(angle) * radius * 0.67,
    y + Math.sin(angle) * radius * 0.67,
  );
  g.fillStyle(0x51323a).fillCircle(x, y, 9);
}

export function room(scene: Phaser.Scene, offset = 0): void {
  const backdrop = scene.add.graphics();
  const bridge = scene.add.graphics();
  const fixtures = scene.add.graphics();
  const foreground = scene.add.graphics();
  let g = backdrop;
  g.fillGradientStyle(0x271927, 0x271927, 0x9b392f, 0xb94325).fillRect(
    0,
    0,
    DESIGN.width,
    780,
  );
  g.fillStyle(0xff6b2d, 0.17).fillEllipse(970, 500, 1350, 550);
  for (let i = 0; i < 5; i++) {
    const x = 145 + i * 410 + (offset % 80);
    g.fillStyle(C.fire, 0.32).fillTriangle(
      x - 44,
      634,
      x + 16,
      316 + (i % 2) * 75,
      x + 70,
      634,
    );
    g.fillStyle(C.ember, 0.4).fillRect(x + 3, 415 + (i % 2) * 75, 10, 195);
  }
  for (let i = 0; i < 29; i++) {
    const x = ((i * 113 + offset) % 2100) - 80;
    const h = 110 + ((i * 67) % 190);
    g.fillStyle(i % 3 === 0 ? 0x291a25 : 0x35202a).fillRect(
      x,
      555 - h,
      62 + (i % 4) * 12,
      h + 220,
    );
    g.fillTriangle(x - 9, 555 - h, x + 35, 530 - h, x + 75, 555 - h);
    g.fillStyle(C.fire, 0.55).fillRect(x + 14, 600 - h, 7, 12);
  }
  g = bridge;
  g.fillStyle(0x130f1a).fillRect(-20, 615, DESIGN.width + 40, 200);
  g.lineStyle(17, 0x201722).lineBetween(0, 494, DESIGN.width, 577);
  g.lineStyle(4, 0x8e4636, 0.55).lineBetween(0, 481, DESIGN.width, 564);
  for (let i = 0; i < 23; i++) {
    const x = i * 91;
    g.fillStyle(0x17121b).fillTriangle(
      x,
      533 + i * 4,
      x + 12,
      507 + i * 4,
      x + 32,
      535 + i * 4,
    );
    g.fillStyle(C.fire, 0.8).fillCircle(x + 16, 519 + i * 4, 3);
  }
  g = fixtures;
  for (let i = 0; i < 7; i++) {
    const x = i * 320 - 60;
    g.fillStyle(0x281c24).fillRoundedRect(x, 260, 32, 600, 12);
    g.lineStyle(5, 0x6c3c36).lineBetween(x + 12, 280, x + 12, 790);
    g.fillStyle(0x44262d).fillRoundedRect(x - 15, 270, 95, 30, 12);
  }
  for (let i = 0; i < 11; i++) {
    const x = i * 199 + (offset % 45);
    g.lineStyle(3, 0x211720).lineBetween(x, 0, x + 18, 195 + (i % 3) * 20);
    g.fillStyle(C.fire, 0.6).fillCircle(x + 18, 196 + (i % 3) * 20, 5);
  }
  for (let i = 0; i < 30; i++) {
    const x = (i * 271 + 93 + offset) % DESIGN.width;
    const y = 145 + ((i * 139) % 610);
    g.fillStyle(i % 3 ? C.ember : C.fire, 0.35).fillCircle(x, y, 2 + (i % 3));
  }
  g = foreground;
  g.fillStyle(C.wood).fillRect(0, 870, DESIGN.width, 210);
  g.lineStyle(12, C.woodEdge).lineBetween(0, 875, DESIGN.width, 875);
  g.lineStyle(4, 0x241622).lineBetween(0, 1018, DESIGN.width, 1018);
  for (let i = 0; i < 15; i++)
    g.lineStyle(2, 0x9b6249, 0.25).lineBetween(
      i * 157,
      888,
      i * 157 + 76,
      1060,
    );
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const shift = pointer.x / DESIGN.width - 0.5;
      bridge.x = -shift * 10;
      fixtures.x = -shift * 22;
    });
  }
}

export function telephone(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): void {
  const g = scene.add.graphics();
  g.setPosition(x, y).setScale(scale);
  g.fillStyle(0x100d15, 0.6).fillEllipse(0, 14, 304, 53);
  g.fillStyle(C.bakelite).fillRoundedRect(-134, -66, 268, 96, 24);
  g.lineStyle(7, C.metalEdge).strokeRoundedRect(-134, -66, 268, 96, 24);
  g.fillStyle(0x130f19).fillRoundedRect(-124, -110, 248, 39, 17);
  g.lineStyle(7, C.agent).strokeRoundedRect(-124, -110, 248, 39, 17);
  g.fillStyle(C.fire).fillCircle(0, -20, 26);
  g.fillStyle(0x110e16).fillCircle(0, -20, 12);
  for (const side of [-1, 1]) {
    g.fillStyle(C.metalEdge).fillCircle(side * 90, -17, 13);
    g.fillStyle(0x100d15).fillCircle(side * 90, -17, 7);
  }
  g.lineStyle(8, C.bakelite).strokeEllipse(136, -18, 80, 89);
}

export function archiveStack(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): void {
  const g = scene.add.graphics();
  g.setPosition(x, y).setScale(scale);
  for (let i = 0; i < 7; i++) {
    const shift = (i % 3) * 8 - 8;
    const yy = -i * 27;
    g.fillStyle(0x33212a).fillRoundedRect(-120 + shift, yy - 28, 240, 31, 4);
    g.lineStyle(3, C.woodEdge).strokeRoundedRect(
      -120 + shift,
      yy - 28,
      240,
      31,
      4,
    );
    g.fillStyle(C.paper).fillRect(-94 + shift, yy - 24, 154, 22);
    g.lineStyle(2, 0x8c604b).lineBetween(
      -76 + shift,
      yy - 13,
      43 + shift,
      yy - 13,
    );
  }
  g.fillStyle(C.paper).fillRoundedRect(-100, -257, 194, 56, 4);
  g.lineStyle(4, 0x9d7155).strokeRoundedRect(-100, -257, 194, 56, 4);
  g.fillStyle(C.archivist).fillCircle(70, -230, 13);
}

export function leverConsole(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): void {
  const g = scene.add.graphics();
  g.setPosition(x, y).setScale(scale);
  g.fillStyle(C.metal).fillRoundedRect(-152, -108, 304, 145, 14);
  g.lineStyle(7, C.metalEdge).strokeRoundedRect(-152, -108, 304, 145, 14);
  for (let i = 0; i < 3; i++) {
    const xx = -92 + i * 92;
    g.fillStyle(0x110d17).fillRoundedRect(xx - 21, -48, 42, 66, 9);
    g.lineStyle(10, 0x8d7772).lineBetween(xx, -34, xx + (i - 1) * 14, -136);
    g.fillStyle(i === 1 ? C.error : C.dispatcher).fillCircle(
      xx + (i - 1) * 14,
      -141,
      22,
    );
  }
  g.fillStyle(C.error).fillCircle(123, -82, 10);
}

export function devil(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale: number,
  color: number,
  idle = true,
): void {
  const root = scene.add.container(x, y);
  const g = scene.add.graphics();
  root.add(g);
  g.fillStyle(0x140d17, 0.6).fillEllipse(
    0,
    178 * scale,
    300 * scale,
    55 * scale,
  );
  g.fillStyle(color).fillEllipse(0, 88 * scale, 255 * scale, 255 * scale);
  g.fillStyle(0x332530).fillTriangle(
    -94 * scale,
    15 * scale,
    0,
    153 * scale,
    94 * scale,
    15 * scale,
  );
  g.fillStyle(0xeee0c5).fillTriangle(
    -21 * scale,
    23 * scale,
    0,
    94 * scale,
    20 * scale,
    23 * scale,
  );
  g.fillStyle(0xa63838).fillTriangle(
    -8 * scale,
    45 * scale,
    0,
    109 * scale,
    13 * scale,
    45 * scale,
  );
  g.lineStyle(14 * scale, color).lineBetween(
    -92 * scale,
    54 * scale,
    -144 * scale,
    137 * scale,
  );
  g.lineStyle(14 * scale, color).lineBetween(
    92 * scale,
    54 * scale,
    144 * scale,
    137 * scale,
  );
  g.fillStyle(color).fillCircle(-144 * scale, 137 * scale, 15 * scale);
  g.fillCircle(144 * scale, 137 * scale, 15 * scale);
  g.fillStyle(color).fillEllipse(0, -58 * scale, 210 * scale, 225 * scale);
  g.fillTriangle(
    -82 * scale,
    -125 * scale,
    -125 * scale,
    -290 * scale,
    -24 * scale,
    -150 * scale,
  );
  g.fillTriangle(
    82 * scale,
    -125 * scale,
    125 * scale,
    -290 * scale,
    24 * scale,
    -150 * scale,
  );
  g.lineStyle(8 * scale, 0x21131d).strokeEllipse(
    0,
    -58 * scale,
    210 * scale,
    225 * scale,
  );
  g.fillStyle(0xffe4ba).fillEllipse(
    -38 * scale,
    -72 * scale,
    48 * scale,
    61 * scale,
  );
  g.fillEllipse(40 * scale, -72 * scale, 48 * scale, 61 * scale);
  g.fillStyle(0x1a1119)
    .fillCircle(-30 * scale, -67 * scale, 10 * scale)
    .fillCircle(31 * scale, -67 * scale, 10 * scale);
  g.lineStyle(7 * scale, 0x1b1118).lineBetween(
    -50 * scale,
    -7 * scale,
    48 * scale,
    5 * scale,
  );
  g.fillStyle(0xf3dbb4).fillTriangle(
    -25 * scale,
    0,
    -4 * scale,
    2 * scale,
    -15 * scale,
    30 * scale,
  );
  g.fillTriangle(
    18 * scale,
    4 * scale,
    38 * scale,
    5 * scale,
    27 * scale,
    29 * scale,
  );
  if (idle && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scene.tweens.add({
      targets: root,
      y: y - 8,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}

export function statusBar(scene: Phaser.Scene, role: Role): void {
  plate(scene, 82, 32, 1756, 126);
  const names: Record<Role, string> = {
    agent: "AGENT",
    archivist: "ARCHIV",
    dispatcher: "DISPOSITION",
  };
  const colors: Record<Role, number> = {
    agent: C.agent,
    archivist: C.archivist,
    dispatcher: C.dispatcher,
  };
  neon(scene, 105, 57, 300, 71, colors[role]);
  label(scene, 135, 73, names[role], 37);
  const items = [
    ["☰  WARTESCHLANGE", "—"],
    ["◷  SCHICHT", "—:—"],
    ["♨  TEAMSTRESS", "—"],
    ["◇  FALL-ID", "—"],
    ["✓  FREIGABE", "WARTET"],
  ];
  items.forEach(([title, value], i) => {
    const x = 447 + i * 272;
    label(scene, x, 53, title ?? "", 21, C.muted);
    label(scene, x, 87, value ?? "", 31);
  });
  const others = (Object.keys(names) as Role[]).filter((item) => item !== role);
  label(
    scene,
    106,
    172,
    others.map((item) => `${names[item]}  ○`).join("     "),
    22,
    C.muted,
  );
}

export function roomSign(
  scene: Phaser.Scene,
  title: string,
  accent: number,
): void {
  neon(scene, 520, 193, 880, 85, accent);
  label(scene, 560, 210, title, 40);
}
