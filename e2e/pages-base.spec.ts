import { expect, test } from "@playwright/test";

test("built Pages subpath loads assets, legal pages and invite links", async ({
  page,
  request,
}) => {
  const base = "/hoellen-hotline/";
  await page.goto(base);
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await page.keyboard.press("2");
  await expect(
    page.getByRole("link", { name: "Datenschutz und Verbindungsdaten" }),
  ).toHaveAttribute("href", `${base}privacy.html`);
  expect((await request.get(`${base}privacy.html`)).ok()).toBe(true);
  expect((await request.get(`${base}credits.html`)).ok()).toBe(true);
  await page.getByRole("button", { name: "Lobby erstellen" }).click();
  await page
    .getByRole("button", { name: "Einladung erzeugen" })
    .first()
    .click();
  const offer = await page
    .getByRole("textbox", { name: "Einladungslink Gast 1" })
    .inputValue();
  expect(new URL(offer).pathname).toBe(base);
  expect(new URL(offer).hash).toMatch(/^#offer=/);
});
