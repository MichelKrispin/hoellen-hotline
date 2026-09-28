import { expect, test } from "@playwright/test";

test("mockup workspaces load their separate sprites in all three role previews", async ({
  page,
}) => {
  const failures: string[] = [];
  const sprites = new Set<string>();
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (/Texture.*not found|Missing workspace sprite/i.test(message.text()))
      failures.push(message.text());
  });
  page.on("response", (response) => {
    if (/source\/workspaces\/.*\.(svg|png|webp)/.test(response.url())) {
      if (!response.ok())
        failures.push(`Sprite HTTP ${response.status()}: ${response.url()}`);
      sprites.add(
        new URL(response.url()).pathname
          .split("/")
          .at(-1)!
          .replace(/\.(svg|png|webp)$/, ""),
      );
    }
  });
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  // The module imports and the texture loader may both request a source.
  expect(sprites.has("dial-pointer")).toBe(true);
  expect(sprites.has("switch-handle")).toBe(true);
  expect(sprites.has("slider-thumb")).toBe(true);
  expect(sprites.size).toBe(18);
  await page.keyboard.press("d");
  for (const [key, role] of [
    ["3", "agent"],
    ["4", "archivist"],
    ["5", "dispatcher"],
  ] as const) {
    await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute("data-role", role);
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await page.screenshot({ path: `test-results/workspace-${role}.png` });
  }
  expect(failures).toEqual([]);
});
