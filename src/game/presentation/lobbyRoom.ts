import Phaser from "phaser";
import { prefersReducedFlash, prefersReducedMotion } from "../../app/options";
import { placeholderKey } from "../../assets/placeholders";
import { DESIGN, TOKENS } from "../../ui/tokens";

type ParallaxLayer = {
  container: Phaser.GameObjects.Container;
  xTravel: number;
  yTravel: number;
};

const C = TOKENS.color;

function layer(
  scene: Phaser.Scene,
  depth: number,
  xTravel: number,
  yTravel: number,
): ParallaxLayer {
  return {
    container: scene.add.container(0, 0).setDepth(depth),
    xTravel,
    yTravel,
  };
}

function image(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Image {
  const sprite = scene.add.image(x, y, key).setDisplaySize(width, height);
  parent.add(sprite);
  return sprite;
}

function placeholderImage(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  name: Parameters<typeof placeholderKey>[0],
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Image {
  return image(scene, parent, placeholderKey(name), x, y, width, height);
}

function ensureLavaTexture(scene: Phaser.Scene): string {
  const key = "lobby:lava-stream";
  if (scene.textures.exists(key)) return key;

  const texture = scene.textures.createCanvas(key, 112, 256);
  if (!texture) return key;
  const context = texture.context;
  context.clearRect(0, 0, 112, 256);

  const glow = context.createLinearGradient(0, 0, 112, 0);
  glow.addColorStop(0, "rgba(255, 63, 20, 0)");
  glow.addColorStop(0.23, "rgba(255, 77, 22, 0.55)");
  glow.addColorStop(0.5, "rgba(255, 221, 92, 0.95)");
  glow.addColorStop(0.77, "rgba(255, 77, 22, 0.55)");
  glow.addColorStop(1, "rgba(255, 63, 20, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 112, 256);

  for (let index = 0; index < 19; index++) {
    const y = index * 15 - 10;
    const x = 56 + Math.sin(index * 1.73) * 16;
    const radiusX = 15 + (index % 4) * 3;
    const radiusY = 7 + (index % 3) * 2;
    context.fillStyle = index % 3 === 0 ? "#fff0a2" : "#ff8a35";
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
  }

  texture.refresh();
  return key;
}

function edgeConduit(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
): void {
  const shaft = scene.add.graphics();
  shaft.lineStyle(94, 0x09070c, 0.78);
  shaft.lineBetween(x, 352, x, 1080);
  shaft.lineStyle(69, 0x21181b);
  shaft.lineBetween(x, 352, x, 1080);
  shaft.lineStyle(55, 0x49302d);
  shaft.lineBetween(x, 352, x, 1080);
  shaft.lineStyle(35, 0x261c20);
  shaft.lineBetween(x + 5, 352, x + 5, 1080);
  shaft.lineStyle(5, 0xa95032, 0.75);
  shaft.lineBetween(x - 22, 352, x - 22, 1080);
  for (const y of [490, 698, 906]) {
    shaft.fillStyle(0x140d13);
    shaft.fillRoundedRect(x - 46, y - 17, 92, 34, 7);
    shaft.fillStyle(0x50332e);
    shaft.fillRoundedRect(x - 40, y - 13, 80, 26, 5);
    shaft.lineStyle(3, 0xa95032, 0.7);
    shaft.lineBetween(x - 35, y - 10, x + 35, y - 10);
    shaft.fillStyle(0xb9673d);
    shaft.fillCircle(x - 28, y, 3);
    shaft.fillCircle(x + 28, y, 3);
  }
  parent.add(shaft);
}

function addLogo(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
): {
  root: Phaser.GameObjects.Container;
  waiting: Phaser.GameObjects.Container;
} {
  const root = scene.add.container(960, 174);
  const chains = [-306, 306].map((x) =>
    scene.add
      .image(x, -180, placeholderKey("chain"))
      .setDisplaySize(35, 140)
      .setOrigin(0.5, 0),
  );
  const sign = scene.add.image(0, 0, "lobby-sign").setDisplaySize(840, 360);
  const waiting = scene.add.container(221, 103);
  for (let index = 0; index < 9; index++) {
    const angle = (Math.PI * 2 * index) / 9;
    const dot = scene.add.circle(
      Math.cos(angle) * 13,
      Math.sin(angle) * 13,
      3.5,
      0xffd1a0,
      0.28 + index * 0.075,
    );
    waiting.add(dot);
  }

  root.add([...chains, sign, waiting]);
  parent.add(root);
  return { root, waiting };
}

/**
 * Layered lobby illustration assembled from the repository's semantic sprites.
 * No pixels are cut out of title-room.webp, so every moving object has clean
 * transparent edges and its own parallax/idle behavior.
 */
export function lobbyRoom(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(C.background);

  const far = layer(scene, 0, 5, 3);
  const city = layer(scene, 1, 10, 5);
  const architecture = layer(scene, 2, 16, 8);
  const actors = layer(scene, 3, 24, 12);
  const foreground = layer(scene, 4, 36, 18);
  const logoLayer = layer(scene, 5, 8, 4);
  const layers = [far, city, architecture, actors, foreground, logoLayer];

  const hell = placeholderImage(
    scene,
    far.container,
    "hellscape-backdrop",
    960,
    440,
    1900,
    1110,
  ).setAlpha(0.94);
  hell.setTint(0xffe7df);

  const leftSoul = placeholderImage(
    scene,
    far.container,
    "soul",
    92,
    474,
    300,
    350,
  ).setAlpha(0.5);
  leftSoul.setFlipX(true);
  const rightSoul = placeholderImage(
    scene,
    far.container,
    "soul",
    1838,
    575,
    240,
    286,
  ).setAlpha(0.43);

  const lavaKey = ensureLavaTexture(scene);
  const lavaA = scene.add
    .tileSprite(1193, 335, 78, 452, lavaKey)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.62);
  const lavaB = scene.add
    .tileSprite(730, 400, 48, 332, lavaKey)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.36)
    .setScale(0.82, 1);
  far.container.add([lavaA, lavaB]);

  const citySprite = placeholderImage(
    scene,
    city.container,
    "hellscape-city",
    1035,
    415,
    1590,
    950,
  ).setAlpha(0.89);
  citySprite.setTint(0xffefdf);

  const bridge = placeholderImage(
    scene,
    architecture.container,
    "bridge",
    960,
    420,
    1500,
    640,
  ).setAlpha(0.83);
  bridge.setTint(0xffe8df);

  edgeConduit(scene, architecture.container, 136);
  edgeConduit(scene, architecture.container, 1784);
  const leftPipe = placeholderImage(
    scene,
    architecture.container,
    "pipe",
    82,
    215,
    330,
    430,
  );
  leftPipe.setAlpha(0.92);
  const rightPipe = placeholderImage(
    scene,
    architecture.container,
    "pipe",
    1838,
    215,
    330,
    430,
  );
  rightPipe.setFlipX(true).setAlpha(0.92);

  const warningLights = [
    placeholderImage(
      scene,
      architecture.container,
      "warning-light",
      190,
      170,
      112,
      112,
    ),
    placeholderImage(
      scene,
      architecture.container,
      "warning-light",
      1740,
      182,
      112,
      112,
    ),
  ];

  const eyes = placeholderImage(
    scene,
    architecture.container,
    "demon-eyes",
    1570,
    345,
    210,
    90,
  ).setAlpha(0.54);

  const agent = image(
    scene,
    actors.container,
    "role-figure-agent",
    415,
    703,
    445,
    556,
  );
  const archivist = image(
    scene,
    actors.container,
    "role-figure-archivist",
    947,
    600,
    424,
    530,
  );
  const dispatcher = image(
    scene,
    actors.container,
    "role-figure-dispatcher",
    1500,
    699,
    455,
    568,
  );
  const actorBases = [
    { sprite: agent, y: agent.y, phase: 0.4 },
    { sprite: archivist, y: archivist.y, phase: 2.1 },
    { sprite: dispatcher, y: dispatcher.y, phase: 4.2 },
  ];

  const phone = placeholderImage(
    scene,
    foreground.container,
    "telephone",
    390,
    876,
    350,
    276,
  );
  const archive = placeholderImage(
    scene,
    foreground.container,
    "archive-stack",
    930,
    872,
    355,
    370,
  );
  archive.setRotation(-0.025);
  const consoleSprite = placeholderImage(
    scene,
    foreground.container,
    "lever-console",
    1504,
    860,
    410,
    410,
  );

  [284, 940, 1596].forEach((x, index) => {
    const desk = placeholderImage(
      scene,
      foreground.container,
      "desk-wood",
      x,
      1017,
      735,
      250,
    );
    desk.setRotation(index === 1 ? 0.005 : index === 0 ? -0.008 : 0.008);
  });

  const paper = placeholderImage(
    scene,
    foreground.container,
    "paper-sheet",
    718,
    960,
    215,
    300,
  ).setRotation(-0.11);
  const plant = placeholderImage(
    scene,
    foreground.container,
    "plant",
    108,
    922,
    238,
    305,
  ).setRotation(-0.055);
  const deskEyes = placeholderImage(
    scene,
    foreground.container,
    "demon-eyes",
    1770,
    1008,
    148,
    62,
  ).setAlpha(0.62);

  const phoneGlow = scene.add
    .ellipse(390, 874, 108, 48, C.fire, 0.1)
    .setBlendMode(Phaser.BlendModes.ADD);
  foreground.container.add(phoneGlow);

  const embers = Array.from({ length: 22 }, (_, index) => {
    const ember = placeholderImage(
      scene,
      architecture.container,
      "ember",
      105 + ((index * 307) % 1710),
      250 + ((index * 149) % 610),
      8 + (index % 3) * 2,
      8 + (index % 3) * 2,
    );
    ember.setAlpha(0.28 + (index % 4) * 0.07);
    return {
      sprite: ember,
      baseX: ember.x,
      baseY: ember.y,
      phase: index * 0.73,
    };
  });

  const { root: logo, waiting } = addLogo(scene, logoLayer.container);

  const vignette = scene.add.graphics().setDepth(8);
  vignette.fillStyle(0x100910, 0.28);
  vignette.fillRect(0, 0, DESIGN.width, 80);
  vignette.fillRect(0, DESIGN.height - 72, DESIGN.width, 72);
  vignette.fillRect(0, 0, 54, DESIGN.height);
  vignette.fillRect(DESIGN.width - 54, 0, 54, DESIGN.height);

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let elapsed = 0;
  const eyeBases = [eyes, deskEyes].map((sprite) => ({
    sprite,
    scaleY: sprite.scaleY,
  }));

  // The form covers the canvas, so observe pointer movement over both surfaces.
  const pointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const bounds = scene.game.canvas.getBoundingClientRect();
    targetX = Phaser.Math.Clamp(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      -1,
      1,
    );
    targetY = Phaser.Math.Clamp(
      ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
      -1,
      1,
    );
  };

  const reset = (): void => {
    targetX = targetY = currentX = currentY = elapsed = 0;
    layers.forEach(({ container }) => container.setPosition(0, 0));
    actorBases.forEach(({ sprite, y }) => sprite.setY(y));
    eyeBases.forEach(({ sprite, scaleY }) =>
      sprite.setScale(sprite.scaleX, scaleY),
    );
    warningLights.forEach((light) => light.setAlpha(0.86));
    lavaA.tilePositionY = lavaB.tilePositionY = 0;
    waiting.rotation = logo.rotation = 0;
    leftSoul.setY(474);
    rightSoul.setY(575);
    paper.setRotation(-0.11);
    plant.setRotation(-0.055);
    phoneGlow.setAlpha(0.1);
    consoleSprite.setRotation(0);
    phone.setRotation(0);
    embers.forEach(({ sprite, baseX, baseY }) =>
      sprite.setPosition(baseX, baseY).setAlpha(0.25),
    );
  };

  const update = (_time: number, frameDelta: number): void => {
    if (prefersReducedMotion()) return;
    const delta = Math.min(frameDelta, 50);
    elapsed += delta;
    const ease = 1 - Math.exp(-delta / 180);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    for (const item of layers) {
      item.container.setPosition(
        currentX * item.xTravel,
        currentY * item.yTravel,
      );
    }

    const seconds = elapsed / 1000;
    lavaA.tilePositionY -= delta * 0.035;
    lavaB.tilePositionY -= delta * 0.02;
    waiting.rotation += delta * 0.00165;
    logo.rotation = Math.sin(seconds * 0.42) * 0.0025;

    const reducedFlash = prefersReducedFlash();
    warningLights.forEach((light, index) =>
      light.setAlpha(
        reducedFlash
          ? 0.86
          : 0.86 + Math.sin(seconds * 1.6 + index * 1.8) * 0.08,
      ),
    );
    // Scale relative to each sprite's display size and keep blinking out of
    // Phaser's tween queue so motion and flash settings take effect immediately.
    const blinkPhase = elapsed % 4200;
    const blinkScale =
      reducedFlash || blinkPhase < 4060
        ? 1
        : 1 - Math.sin(((blinkPhase - 4060) / 140) * Math.PI) * 0.92;
    eyeBases.forEach(({ sprite, scaleY }) =>
      sprite.setScale(sprite.scaleX, scaleY * blinkScale),
    );
    actorBases.forEach(({ sprite, y, phase }) =>
      sprite.setY(y + Math.sin(seconds * 0.72 + phase) * 5.5),
    );
    leftSoul.setY(474 + Math.sin(seconds * 0.54) * 9);
    rightSoul.setY(575 + Math.sin(seconds * 0.61 + 1.8) * 8);
    paper.setRotation(-0.11 + Math.sin(seconds * 0.8) * 0.015);
    plant.setRotation(-0.055 + Math.sin(seconds * 0.34) * 0.012);
    phoneGlow.setAlpha(
      reducedFlash ? 0.1 : 0.1 + Math.sin(seconds * 1.8) * 0.035,
    );
    consoleSprite.setRotation(Math.sin(seconds * 0.38 + 0.6) * 0.004);
    phone.setRotation(Math.sin(seconds * 0.31) * 0.003);

    embers.forEach(({ sprite, baseX, baseY, phase }) => {
      const rise = (seconds * 15 + phase * 41) % 96;
      sprite.setPosition(
        baseX + Math.sin(seconds * 0.7 + phase) * 7,
        baseY - rise,
      );
      sprite.setAlpha(
        reducedFlash ? 0.25 : 0.22 + Math.sin(seconds * 1.3 + phase) * 0.08,
      );
    });
  };

  reset();
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("display-options-changed", reset);
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener("pointermove", pointerMove);
    window.removeEventListener("display-options-changed", reset);
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  });
}
