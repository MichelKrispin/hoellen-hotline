import { expect, test } from "@playwright/test";

test("malformed invitation is rejected without retaining its fragment", async ({
  page,
}) => {
  await page.goto("/#offer=broken");
  await expect(
    page.getByRole("region", { name: "Private Lobby" }),
  ).toContainText(/beschädigt|Ungültige Linkdaten/);
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Lobby erstellen" }),
  ).toBeVisible();
});

test("direct local candidates connect even when STUN is unavailable", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/");
  await expect(host.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await host.keyboard.press("d");
  await host.keyboard.press("2");
  await host.getByRole("button", { name: "Lobby erstellen" }).click();
  await host
    .getByRole("button", { name: "Einladung erzeugen" })
    .first()
    .click();
  const offer = await host
    .getByRole("textbox", { name: "Einladungslink Gast 1" })
    .inputValue();
  const guest = await context.newPage();
  await guest.goto(offer);
  await guest
    .getByRole("button", { name: "Beitreten und Antwort erzeugen" })
    .click();
  const answer = await guest
    .getByRole("textbox", { name: "Antwortlink", exact: true })
    .inputValue();
  await host.getByRole("textbox", { name: "Antwortlink Gast 1" }).fill(answer);
  await host.getByRole("button", { name: "Antwort importieren" }).click();
  await expect(host.getByText("Gast 1 · Verbunden")).toBeVisible();
  await context.close();
});
