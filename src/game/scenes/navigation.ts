import Phaser from "phaser";
import { DESIGN, TOKENS } from "../../ui/tokens";
import { shapePlaceholderKey } from "../../assets/placeholders";

export const SCENES = [
  "Boot",
  "Title",
  "Lobby",
  "Game",
  "Results",
  "AtlasReview",
] as const;
export type SceneName = (typeof SCENES)[number];

let debugNavigationEnabled = false;

export function sceneHeader(
  scene: Phaser.Scene,
  title: string,
  subtitle: string,
): Phaser.GameObjects.Text {
  scene.game.canvas.dataset.scene = scene.scene.key;
  scene.cameras.main.setBackgroundColor(TOKENS.color.background);
  scene.add
    .image(DESIGN.safeX, 139, shapePlaceholderKey("neon-frame"))
    .setOrigin(0)
    .setDisplaySize(DESIGN.width - 2 * DESIGN.safeX, 2)
    .setTint(TOKENS.color.agent);
  scene.add.text(DESIGN.safeX, 100, "HÖLLEN-HOTLINE  /  PROTOTYP", {
    fontFamily: "Georgia, serif",
    fontSize: "28px",
    color: TOKENS.color.muted,
  });
  scene.add.text(DESIGN.safeX, 190, title, {
    fontFamily: "Georgia, serif",
    fontSize: `${TOKENS.typography.title}px`,
    color: TOKENS.color.text,
  });
  scene.add.text(DESIGN.safeX, 310, subtitle, {
    fontFamily: "Arial, sans-serif",
    fontSize: `${TOKENS.typography.body}px`,
    color: TOKENS.color.muted,
    wordWrap: { width: DESIGN.width - 2 * DESIGN.safeX },
  });
  return scene.add
    .text(
      DESIGN.safeX,
      DESIGN.height - 105,
      "DEBUG: 1 Titel · 2 Lobby · 3 Agent · 4 Archiv · 5 Disposition · 6 Ergebnis",
      {
        fontFamily: "Arial, sans-serif",
        fontSize: `${TOKENS.typography.small}px`,
        color: TOKENS.color.muted,
      },
    )
    .setVisible(debugNavigationEnabled);
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  action: () => void,
  color: number = TOKENS.color.agent,
  width = 430,
  height = 82,
): Phaser.GameObjects.Text {
  const rect = scene.add.graphics();
  const draw = (hovered: boolean): void => {
    rect.clear();
    rect.fillStyle(0x160e18, 0.85);
    rect.fillRoundedRect(
      x - width / 2 + 7,
      y - height / 2 + 8,
      width,
      height,
      12,
    );
    rect.fillStyle(hovered ? 0xffd18a : color);
    rect.fillRoundedRect(x - width / 2, y - height / 2, width, height, 12);
    rect.lineStyle(4, hovered ? 0xffffff : 0x30232a);
    rect.strokeRoundedRect(
      x - width / 2 + 2,
      y - height / 2 + 2,
      width - 4,
      height - 4,
      10,
    );
  };
  draw(false);
  rect.setInteractive(
    new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  rect.input!.cursor = "pointer";
  let fontSize = 31;
  const text = scene.add
    .text(x, y, label, {
      fontFamily: '"Trebuchet MS", "DejaVu Sans", sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color: "#1b111b",
    })
    .setOrigin(0.5);
  while (
    (text.width > width - 28 || text.height > height - 14) &&
    fontSize > 18
  ) {
    fontSize -= 1;
    text.setFontSize(fontSize);
  }
  rect.on("pointerover", () => {
    draw(true);
    text.setScale(1.02);
  });
  rect.on("pointerout", () => {
    draw(false);
    text.setScale(1);
  });
  rect.on("pointerdown", action);
  return text;
}

export function installDebugNavigation(
  scene: Phaser.Scene,
  hint?: Phaser.GameObjects.Text,
): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  hint?.setVisible(debugNavigationEnabled);
  const isEditing = (event: KeyboardEvent): boolean => {
    const target = event.target;
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement)
    );
  };
  const toggle = (event: KeyboardEvent): void => {
    if (
      isEditing(event) ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    debugNavigationEnabled = !debugNavigationEnabled;
    hint?.setVisible(debugNavigationEnabled);
  };
  keyboard.on("keydown-D", toggle);
  const bindings: [string, SceneName, object?][] = [
    ["ONE", "Title"],
    ["TWO", "Lobby"],
    ["THREE", "Game", { role: "agent" }],
    ["FOUR", "Game", { role: "archivist" }],
    ["FIVE", "Game", { role: "dispatcher" }],
    ["SIX", "Results"],
    ["SEVEN", "AtlasReview"],
  ];
  const handlers: [string, (event: KeyboardEvent) => void][] = [];
  for (const [key, target, data] of bindings) {
    const eventName = `keydown-${key}`;
    const handler = (event: KeyboardEvent): void => {
      if (debugNavigationEnabled && !isEditing(event))
        scene.scene.start(target, data);
    };
    keyboard.on(eventName, handler);
    handlers.push([eventName, handler]);
  }
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    keyboard.off("keydown-D", toggle);
    for (const [eventName, handler] of handlers)
      keyboard.off(eventName, handler);
  });
}
