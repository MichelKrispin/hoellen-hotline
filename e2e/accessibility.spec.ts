import { test, expect } from "@playwright/test";

test("display options remain usable at a small viewport and persist", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await page.keyboard.press("o");
  const dialog = page.getByRole("dialog", { name: "Darstellungsoptionen" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Farbpalette").selectOption("contrast");
  await dialog.getByLabel("Textgröße").selectOption("1.3");
  await dialog.getByLabel("Bewegung reduzieren").check();
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-palette",
    "contrast",
  );
  await page.reload();
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await expect(page.locator("html")).toHaveAttribute(
    "data-palette",
    "contrast",
  );
  await page
    .getByRole("button", { name: "Darstellungsoptionen öffnen" })
    .click();
  await expect(dialog.getByLabel("Textgröße")).toHaveValue("1.3");
  await expect(dialog.getByLabel("Bewegung reduzieren")).toBeChecked();
});

test("canvas context restoration and fatal diagnostics remain accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("canvas").evaluate((canvas) => {
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
  });
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.evaluate(() =>
    window.dispatchEvent(
      new ErrorEvent("error", { error: new Error("diagnostic test") }),
    ),
  );
  const fatal = page.getByRole("alertdialog");
  await expect(fatal).toBeVisible();
  await expect(fatal.getByLabel("Fehlerdiagnose")).toHaveValue(
    /diagnostic test/,
  );
  await expect(
    fatal.getByRole("button", { name: "Diagnose kopieren" }),
  ).toBeVisible();
});
