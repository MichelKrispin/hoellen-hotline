import { test, expect } from "@playwright/test";

test("title action opens the lobby", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(
    box!.x + (960 / 1920) * box!.width,
    box!.y + (430 / 1080) * box!.height,
  );
  await expect(canvas).toHaveAttribute("data-scene", "Lobby");
  await expect(
    page.getByRole("button", { name: /Lobby erstellen/ }),
  ).toBeVisible();
});

test("phone title action opens the lobby", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const action = page.getByRole("button", { name: "Zur Lobby →" });
  await expect(action).toBeVisible();
  await action.click();
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Lobby");
  await expect(
    page.getByRole("button", { name: /Lobby erstellen/ }),
  ).toBeVisible();
});

test("scene navigation covers lobby, three roles and results", async ({
  page,
}) => {
  const pressNavigationKey = async (key: string): Promise<void> => {
    await page.keyboard.press(key);
    // Phaser handles keyboard events and queued scene changes on game frames.
    // This also lets assertions about an unchanged scene observe the input.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
  };
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  await pressNavigationKey("4");
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  await pressNavigationKey("d");
  for (const [key, scene] of [
    ["2", "Lobby"],
    ["3", "Game"],
    ["4", "Game"],
    ["5", "Game"],
    ["6", "Results"],
    ["7", "AtlasReview"],
    ["1", "Title"],
  ] as const) {
    await pressNavigationKey(key);
    await expect(canvas).toHaveAttribute("data-scene", scene);
    if (key === "3") await expect(canvas).toHaveAttribute("data-role", "agent");
    if (key === "4")
      await expect(canvas).toHaveAttribute("data-role", "archivist");
    if (key === "5")
      await expect(canvas).toHaveAttribute("data-role", "dispatcher");
  }
  await pressNavigationKey("d");
  await pressNavigationKey("4");
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  await expect(page).toHaveURL("/");
});
