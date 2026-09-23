import { expect, test } from "@playwright/test";

test("three browsers join the private lobby and choose distinct roles", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/");
  await host.keyboard.press("2");
  await host.getByRole("button", { name: "Lobby erstellen" }).click();
  const guests = [];
  for (const slot of [1, 2]) {
    await host
      .getByRole("button", { name: "Einladung erzeugen" })
      .first()
      .click();
    const offer = await host
      .getByRole("textbox", { name: `Einladungslink Gast ${slot}` })
      .inputValue();
    expect(new URL(offer).pathname).toBe("/");
    const guest = await context.newPage();
    guests.push(guest);
    await guest.goto(offer);
    await expect(guest).toHaveURL(/#offer=/);
    await guest
      .getByRole("button", { name: "Beitreten und Antwort erzeugen" })
      .click();
    await expect(guest).toHaveURL(/\/$/);
    const answer = await guest
      .getByRole("textbox", { name: "Antwortlink", exact: true })
      .inputValue();
    await host
      .getByRole("textbox", { name: `Antwortlink Gast ${slot}` })
      .fill(answer);
    await host
      .getByRole("button", { name: "Antwort importieren" })
      .last()
      .click();
    await expect(host.getByText(`Gast ${slot} · Verbunden`)).toBeVisible();
  }
  const pages = [host, ...guests];
  for (const [index, page] of pages.entries()) {
    await page
      .getByRole("button", { name: ["Agent", "Archivar", "Disponent"][index]! })
      .click();
    await expect(
      page.getByRole("button", {
        name: ["Agent", "Archivar", "Disponent"][index]!,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Bereit melden" }).click();
    await expect(
      page.getByRole("button", { name: "Bereits bereit ✓" }),
    ).toBeVisible();
  }
  await expect(
    host.getByRole("button", { name: "Schicht starten" }),
  ).toBeEnabled();
  await host.getByRole("button", { name: "Schicht starten" }).click();
  for (const page of pages)
    await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Game");
  await context.close();
});
