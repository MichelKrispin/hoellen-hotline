import { expect, test } from "@playwright/test";

test("mockup workspaces load their separate sprites in all three role previews", async ({
  page,
}, testInfo) => {
  const failures: string[] = [];
  const sprites = new Set<string>();
  const roleSprites = new Set<string>();
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (
      /Texture.*not found|Missing (workspace|role) sprite/i.test(message.text())
    )
      failures.push(message.text());
  });
  page.on("response", (response) => {
    if (
      response.headers()["content-type"]?.startsWith("image/") &&
      /generated\/role-sprites\/.*\.webp/.test(response.url())
    ) {
      if (!response.ok())
        failures.push(
          `Role sprite HTTP ${response.status()}: ${response.url()}`,
        );
      roleSprites.add(
        new URL(response.url()).pathname
          .split("/")
          .at(-1)!
          .replace(/\.webp$/, ""),
      );
    }
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
  expect(roleSprites.size).toBe(0);
  await page.keyboard.press("d");
  for (const [key, role] of [
    ["3", "agent"],
    ["4", "archivist"],
    ["5", "dispatcher"],
  ] as const) {
    await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute("data-role", role);
    await expect
      .poll(() =>
        roleSprites.has(
          role === "agent"
            ? "phone_base"
            : role === "archivist"
              ? "rulebook_open"
              : "routing_console",
        ),
      )
      .toBe(true);
    await expect(page.getByRole("alertdialog")).toBeHidden();
    expect(roleSprites.size).toBe(
      role === "agent" ? 14 : role === "archivist" ? 22 : 30,
    );
    if (process.env.CAPTURE_UI === "1")
      await page.screenshot({
        path: testInfo.outputPath(`workspace-${role}.png`),
      });
  }
  expect(roleSprites.size).toBe(30);
  expect(roleSprites.has("gauge_needle")).toBe(true);
  expect(roleSprites.has("paper_fragments")).toBe(true);
  expect(failures).toEqual([]);
});
