import Phaser from "phaser";
import { prefersReducedMotion } from "../../app/options";
import { DESIGN } from "../../ui/tokens";

// Coordinates follow the 1672 × 941 illustration. Each outline keeps the
// surrounding desk and city out of the moving texture.
const pieces = [
  {
    name: "caller",
    points: [
      [0, 143],
      [52, 158],
      [97, 172],
      [147, 189],
      [177, 240],
      [189, 298],
      [247, 277],
      [276, 302],
      [239, 342],
      [222, 390],
      [251, 431],
      [222, 466],
      [166, 441],
      [103, 414],
      [0, 392],
    ],
    travel: 5,
    sway: 1.5,
    phase: 0,
  },
  {
    name: "agent",
    points: [
      [199, 568],
      [223, 508],
      [263, 492],
      [269, 421],
      [289, 363],
      [339, 327],
      [362, 264],
      [392, 302],
      [424, 284],
      [459, 243],
      [476, 318],
      [520, 345],
      [559, 401],
      [544, 467],
      [561, 538],
      [587, 580],
      [616, 686],
      [584, 741],
      [469, 735],
      [368, 716],
      [275, 714],
      [210, 650],
    ],
    travel: 7,
    sway: 1.2,
    phase: 1.1,
  },
  {
    name: "archivist",
    points: [
      [711, 561],
      [749, 511],
      [756, 450],
      [781, 406],
      [805, 343],
      [837, 424],
      [864, 392],
      [904, 385],
      [948, 412],
      [981, 478],
      [1014, 492],
      [1014, 558],
      [963, 631],
      [889, 667],
      [786, 652],
      [734, 619],
    ],
    travel: 5,
    sway: 1.8,
    phase: 2.4,
  },
  {
    name: "dispatcher",
    points: [
      [1081, 422],
      [1130, 370],
      [1184, 348],
      [1193, 282],
      [1236, 229],
      [1302, 250],
      [1338, 278],
      [1371, 281],
      [1435, 308],
      [1470, 369],
      [1479, 432],
      [1541, 453],
      [1560, 528],
      [1536, 600],
      [1476, 625],
      [1368, 611],
      [1288, 637],
      [1175, 625],
      [1108, 571],
    ],
    travel: 6,
    sway: 1.1,
    phase: 3.5,
  },
  {
    name: "papers",
    points: [
      [969, 662],
      [1019, 655],
      [1070, 691],
      [1114, 689],
      [1168, 738],
      [1204, 811],
      [1275, 846],
      [1291, 941],
      [1001, 941],
      [981, 853],
    ],
    travel: 9,
    sway: 1.6,
    phase: 4.7,
  },
] as const;

const scaleX = DESIGN.width / 1672;
const scaleY = DESIGN.height / 941;

function pieceTexture(
  scene: Phaser.Scene,
  name: string,
  points: readonly (readonly [number, number])[],
): string {
  const key = `title-room-${name}`;
  if (scene.textures.exists(key)) return key;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.drawImage(
    scene.textures.get("title-room").getSourceImage() as HTMLImageElement,
    -left,
    -top,
  );
  context.globalCompositeOperation = "destination-in";
  context.filter = "blur(5px)";
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x - left, y - top);
    else context.lineTo(x - left, y - top);
  });
  context.closePath();
  context.fill();
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function titleRoom(scene: Phaser.Scene): void {
  scene.add
    .image(960, 540, "title-room")
    .setDisplaySize(DESIGN.width, DESIGN.height);
  if (prefersReducedMotion()) return;

  const sprites = pieces.map((piece) => {
    const xs = piece.points.map(([x]) => x);
    const ys = piece.points.map(([, y]) => y);
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const sprite = scene.add.image(
      x * scaleX,
      y * scaleY,
      pieceTexture(scene, piece.name, piece.points),
    );
    sprite.setScale(scaleX, scaleY);
    return { ...piece, sprite, x: x * scaleX, y: y * scaleY };
  });

  const glow = scene.add
    .ellipse(1111 * scaleX, 191 * scaleY, 96, 62, 0xff7a23, 0.07)
    .setBlendMode(Phaser.BlendModes.ADD);
  const embers = Array.from({ length: 12 }, (_, index) => {
    const x = (170 + ((index * 317) % 1320)) * scaleX;
    const y = (310 + ((index * 149) % 400)) * scaleY;
    const dot = scene.add
      .circle(x, y, index % 3 === 0 ? 2.5 : 1.5, 0xffad52, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    return { dot, x, y, phase: index * 1.7 };
  });

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  const pointerMove = (pointer: Phaser.Input.Pointer): void => {
    targetX = Phaser.Math.Clamp(pointer.x / DESIGN.width - 0.5, -0.5, 0.5) * 2;
    targetY = Phaser.Math.Clamp(pointer.y / DESIGN.height - 0.5, -0.5, 0.5) * 2;
  };
  const update = (time: number, delta: number): void => {
    if (prefersReducedMotion()) {
      sprites.forEach(({ sprite, x, y }) => sprite.setPosition(x, y));
      glow.setAlpha(0);
      embers.forEach(({ dot }) => dot.setAlpha(0));
      return;
    }
    const ease = 1 - Math.exp(-delta / 180);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    const seconds = time / 1000;
    sprites.forEach(({ sprite, x, y, travel, sway, phase }) => {
      sprite.setPosition(
        x + currentX * travel + Math.sin(seconds * 0.43 + phase) * sway,
        y + currentY * travel * 0.5 + Math.sin(seconds * 0.67 + phase) * sway,
      );
    });
    glow.setAlpha(0.055 + Math.sin(seconds * 2.1) * 0.018);
    embers.forEach(({ dot, x, y, phase }) => {
      dot.setPosition(
        x + Math.sin(seconds * 0.8 + phase) * 5,
        y - ((seconds * 9 + phase * 17) % 48),
      );
      dot.setAlpha(0.14 + (Math.sin(seconds * 1.2 + phase) + 1) * 0.12);
    });
  };
  scene.input.on("pointermove", pointerMove);
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off("pointermove", pointerMove);
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  });
}
