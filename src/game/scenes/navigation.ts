import Phaser from "phaser";
import { DESIGN, TOKENS } from "../../ui/tokens";

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
  scene.add.rectangle(
    DESIGN.width / 2,
    140,
    DESIGN.width - 2 * DESIGN.safeX,
    2,
    TOKENS.color.agent,
  );
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
): void {
  const rect = scene.add
    .rectangle(x, y, width, height, color)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(x, y, label, {
      fontFamily: "Arial, sans-serif",
      fontSize: "31px",
      color: "#1b111b",
    })
    .setOrigin(0.5);
  rect.on("pointerover", () => {
    rect.setAlpha(0.8);
    text.setScale(1.02);
  });
  rect.on("pointerout", () => {
    rect.setAlpha(1);
    text.setScale(1);
  });
  rect.on("pointerdown", action);
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
