import { expect, test } from "@playwright/test";

test("lobby motion follows live display preferences across scene changes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "Lobby");
  await page.keyboard.press("d");
  await page.keyboard.press("2");
  await expect(page.locator(".lobby-card--welcome")).toBeVisible();

  const still = await canvas.screenshot();
  await page.mouse.move(40, 40);
  expect((await canvas.screenshot()).equals(still)).toBe(true);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "false",
  );
  await page.mouse.move(1200, 600);
  await expect
    .poll(async () => (await canvas.screenshot()).equals(still), {
      timeout: 15_000,
    })
    .toBe(false);

  await page.keyboard.press("o");
  const dialog = page.getByRole("dialog", { name: "Darstellungsoptionen" });
  await dialog.getByLabel("Bewegung reduzieren").check();
  await dialog.getByLabel("Blitzreduktion").check();
  await dialog.getByRole("button", { name: "Schließen" }).click();
  const paused = await canvas.screenshot();
  await page.mouse.move(1200, 600);
  expect((await canvas.screenshot()).equals(paused)).toBe(true);

  await page.keyboard.press("1");
  await expect(canvas).toHaveAttribute("data-scene", "Title");
  await page.keyboard.press("2");
  await expect(page.locator(".lobby-card--welcome")).toBeVisible();
  expect((await canvas.screenshot()).equals(still)).toBe(true);

  await page.keyboard.press("o");
  await dialog.getByLabel("Bewegung reduzieren").uncheck();
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(still), {
      timeout: 15_000,
    })
    .toBe(false);
  expect(errors).toEqual([]);
});

test("lobby illustration and controls fit desktop, phone and landscape", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Lobby");
  await page.keyboard.press("d");
  await page.keyboard.press("2");
  const create = page.getByRole("button", { name: /Lobby erstellen/ });
  await expect(create).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 640, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    // Phaser's scale manager applies FIT after observing the parent bounds.
    await expect
      .poll(
        async () =>
          page.locator("canvas").evaluate((canvas) => {
            const bounds = canvas.getBoundingClientRect();
            const parent = canvas.parentElement!.getBoundingClientRect();
            return (
              bounds.left >= -1 &&
              bounds.right <= innerWidth + 1 &&
              bounds.top >= -1 &&
              bounds.bottom <= parent.bottom + 1 &&
              Math.abs(bounds.x + bounds.width / 2 - innerWidth / 2) < 2
            );
          }),
        { timeout: 10_000 },
      )
      .toBe(true);
    await create.scrollIntoViewIfNeeded();
    const bounds = await create.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await create.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        return button.contains(
          document.elementFromPoint(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
          ),
        );
      }),
    ).toBe(true);
    if (process.env.CAPTURE_UI === "1")
      await page.screenshot({
        path: testInfo.outputPath(
          `lobby-${viewport.width}x${viewport.height}.png`,
        ),
      });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await create.click();
  await expect(page.locator(".lobby-card--active")).toBeVisible();
  await page.keyboard.press("o");
  const dialog = page.getByRole("dialog", { name: "Darstellungsoptionen" });
  await dialog.getByLabel("Textgröße").selectOption("1.3");
  await dialog.getByLabel("Farbpalette").selectOption("contrast");
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await page.getByLabel("Dein Name").fill("Nachtschicht");
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Archivar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Schicht starten" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Schicht starten" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
