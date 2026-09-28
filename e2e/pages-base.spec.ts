import { expect, test } from "@playwright/test";

test("built Pages subpath loads assets, legal pages and invite links", async ({
  page,
  request,
}) => {
  const base = "/hoellen-hotline/";
  const loadedProps = new Set<string>();
  const failedAssets: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      !/\/(phone_base|rulebook_open|routing_console)-.*\.webp$/.test(
        url.pathname,
      )
    )
      return;
    if (!response.ok() || !url.pathname.startsWith(`${base}assets/`))
      failedAssets.push(url.pathname);
    if (response.headers()["content-type"]?.startsWith("image/"))
      loadedProps.add(url.pathname.split("/").at(-1)!.split("-")[0]!);
  });
  await page.goto(base);
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await page.keyboard.press("d");
  await page.keyboard.press("2");
  await expect(
    page.getByRole("link", { name: "Datenschutz und Verbindungsdaten" }),
  ).toHaveAttribute("href", `${base}privacy.html`);
  expect((await request.get(`${base}privacy.html`)).ok()).toBe(true);
  expect((await request.get(`${base}credits.html`)).ok()).toBe(true);
  await page.getByRole("button", { name: "Lobby erstellen" }).click();
  await page
    .getByRole("button", { name: "Manuelle Verbindung (Fallback)" })
    .click();
  await page
    .getByRole("button", { name: "Einladung erzeugen" })
    .first()
    .click();
  const offer = await page
    .getByRole("textbox", { name: "Einladungslink Gast 1" })
    .inputValue();
  expect(new URL(offer).pathname).toBe(base);
  expect(new URL(offer).hash).toMatch(/^#offer=/);
  for (const [key, role, prop] of [
    ["3", "agent", "phone_base"],
    ["4", "archivist", "rulebook_open"],
    ["5", "dispatcher", "routing_console"],
  ] as const) {
    await page.keyboard.press(key);
    await expect(page.locator("canvas")).toHaveAttribute("data-role", role);
    await expect.poll(() => loadedProps.has(prop)).toBe(true);
  }
  expect(failedAssets).toEqual([]);
});
