import { test, expect } from "@playwright/test";

test("scene navigation covers lobby, three roles and results", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  for (const [key, scene] of [
    ["2", "Lobby"],
    ["3", "Game"],
    ["4", "Game"],
    ["5", "Game"],
    ["6", "Results"],
    ["1", "Title"],
  ] as const) {
    await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute("data-scene", scene);
    if (key === "3") await expect(canvas).toHaveAttribute("data-role", "agent");
    if (key === "4")
      await expect(canvas).toHaveAttribute("data-role", "archivist");
    if (key === "5")
      await expect(canvas).toHaveAttribute("data-role", "dispatcher");
  }
  await expect(page).toHaveURL("/");
});
