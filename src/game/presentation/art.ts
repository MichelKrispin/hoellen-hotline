import Phaser from "phaser";
import { DESIGN, TOKENS } from "../../ui/tokens";
import type { PublicShiftView, Role } from "../state/contracts";
import { prefersReducedMotion } from "../../app/options";
import { placeholder, placeholderKey } from "../../assets/placeholders";

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
  _edge: number = C.metalEdge,
  _radius = 18,
): Phaser.GameObjects.NineSlice {
  void _edge;
  void _radius;
  const material =
    fill === C.paper
      ? "panel-paper"
      : fill === C.wood || fill === 0x33212b
        ? "panel-wood"
        : fill === C.bakelite
          ? "panel-bakelite"
          : "panel-metal";
  return scene.add
    .nineslice(x, y, placeholderKey(material), undefined, w, h, 32, 32, 32, 32)
    .setOrigin(0);
}

export function paper(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  placeholder(scene, "paper-sheet", x, y, w, h);
}

export function neon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  placeholder(scene, "neon-frame", x, y, w, h).setTint(color);
}

export function gauge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  value: number,
): void {
  placeholder(
    scene,
    "gauge-face",
    x - radius,
    y - radius,
    radius * 2,
    radius * 2,
  );
  placeholder(
    scene,
    "gauge-needle",
    x - radius,
    y - radius,
    radius * 2,
    radius * 2,
  )
    .setOrigin(0.5)
    .setPosition(x, y)
    .setRotation((Math.max(0, Math.min(1, value)) - 0.5) * Math.PI * 1.5);
}

export function room(scene: Phaser.Scene, offset = 0): void {
  placeholder(scene, "hellscape-backdrop", 0, 0, DESIGN.width, 780);
  placeholder(
    scene,
    "hellscape-city",
    -(offset % 80),
    310,
    DESIGN.width + 80,
    470,
  );
  const bridge = placeholder(scene, "bridge", 0, 480, DESIGN.width, 320);
  const fixtures = scene.add.container(0, 0);
  for (let i = 0; i < 7; i++)
    fixtures.add(placeholder(scene, "pipe", i * 320 - 65, 260, 96, 600));
  for (let i = 0; i < 11; i++)
    fixtures.add(
      placeholder(scene, "chain", i * 199 + (offset % 45), 0, 50, 220),
    );
  for (let i = 0; i < 30; i++)
    fixtures.add(
      placeholder(
        scene,
        "ember",
        (i * 271 + 93 + offset) % DESIGN.width,
        145 + ((i * 139) % 610),
        9,
        9,
      ),
    );
  placeholder(scene, "desk-wood", 0, 870, DESIGN.width, 210);
  if (!prefersReducedMotion())
    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const shift = pointer.x / DESIGN.width - 0.5;
      bridge.x = -shift * 10;
      fixtures.x = -shift * 22;
    });
}

export function telephone(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): void {
  placeholder(
    scene,
    "telephone",
    x - 160 * scale,
    y - 120 * scale,
    320 * scale,
    150 * scale,
  );
}

export function archiveStack(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): void {
  placeholder(
    scene,
    "archive-stack",
    x - 140 * scale,
    y - 270 * scale,
    280 * scale,
    280 * scale,
  );
}

export function leverConsole(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): void {
  placeholder(
    scene,
    "lever-console",
    x - 160 * scale,
    y - 155 * scale,
    320 * scale,
    200 * scale,
  );
}

export function devil(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale: number,
  color: number,
  idle = true,
): void {
  const role =
    color === 0x70517b
      ? "archivist"
      : color === 0xa64131
        ? "dispatcher"
        : "agent";
  const figure = scene.add
    .image(x, y, `role-figure-${role}`)
    .setDisplaySize(320 * scale, 400 * scale);
  if (idle && !prefersReducedMotion())
    scene.tweens.add({
      targets: figure,
      y: y - 8,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
}

export function statusBar(
  scene: Phaser.Scene,
  role: Role,
): { update: (view: PublicShiftView) => void } {
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
  const values = items.map(([title, value], i) => {
    const x = 447 + i * 272;
    label(scene, x, 53, title ?? "", 21, C.muted);
    return label(scene, x, 87, value ?? "", 31);
  });
  const others = (Object.keys(names) as Role[]).filter((item) => item !== role);
  const colleagues = label(
    scene,
    106,
    172,
    others.map((item) => `${names[item]}  ○`).join("     "),
    22,
    C.muted,
  );
  return {
    update(view) {
      values[0]!.setText(String(view.queueLength));
      const seconds = Math.floor(view.elapsedMs / 1000);
      values[1]!.setText(
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
      );
      values[2]!
        .setText(
          `W${view.queuePressure} K${view.boilerPressure} A${view.auditRisk}`,
        )
        .setFontSize(25);
      values[3]!.setText(view.activeCaseId?.split(".").at(-1) ?? "—");
      const approved = Object.values(view.approvals).filter(Boolean).length;
      values[4]!.setText(
        view.phase === "results"
          ? "ENDE"
          : approved === 3
            ? "3/3 BEREIT"
            : `${approved}/3 FREIGABEN`,
      );
      colleagues.setText(
        others
          .map((other) => {
            const player = view.colleagues.find(
              (entry) => entry.role === other,
            );
            return `${names[other]}  ${player?.activity ?? "getrennt"}`;
          })
          .join("     "),
      );
    },
  };
}

export function roomSign(
  scene: Phaser.Scene,
  title: string,
  accent: number,
): void {
  placeholder(scene, "room-sign", 520, 193, 880, 85).setTint(accent);
  label(scene, 560, 210, title, 40);
}
