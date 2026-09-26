import { expect, test } from "@playwright/test";

test("host configures free play and sees registered campaign scenarios", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await page.keyboard.press("d");
  await page.keyboard.press("2");
  await page.getByRole("button", { name: "Lobby erstellen" }).click();
  const mode = page.getByLabel("Spielmodus");
  await expect(
    mode.locator('option[value="core.scenario.first"]'),
  ).toBeEnabled();
  await expect(
    mode.locator('option[value="core.scenario.forms"]'),
  ).toHaveAttribute("disabled", "");
  await expect(
    mode.locator('option[value="campaign.audit.scenario.first"]'),
  ).toHaveCount(1);
  await mode.selectOption("free-standard");
  await expect(page.locator("#free-case-count")).toHaveValue("10");
  await page.locator("#free-case-count").fill("11");
  await page.locator("#free-difficulty").selectOption("infernal");
  await page.locator("#free-incidents").selectOption("high");
  await page.locator("#free-layout-policy").selectOption("random");
  await expect(page.locator('input[name="free-layout"]:checked')).toHaveCount(
    2,
  );
  await page.getByText("Content-Pakete").click();
  await page
    .locator('input[name="free-campaign"][value="campaign.audit"]')
    .check();
  await page.locator("#game-seed").fill("repeatable-shift");
  await page.getByRole("button", { name: "Freies Spiel übernehmen" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Freies Spiel übernommen",
  );
  await expect(page.locator("#free-case-count")).toHaveValue("11");
  await expect(page.locator("#game-seed")).toHaveValue("repeatable-shift");
});

test("tutorial guides three connected roles into one shared practice case", async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/");
  await expect(host.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await host.keyboard.press("d");
  await host.keyboard.press("2");
  await host.getByRole("button", { name: "Lobby erstellen" }).click();
  await host
    .getByRole("button", { name: "Manuelle Verbindung (Fallback)" })
    .click();
  await host.getByLabel("Spielmodus").selectOption("tutorial");
  const guests = [];
  for (const slot of [1, 2]) {
    await host
      .getByRole("button", { name: "Einladung erzeugen" })
      .first()
      .click();
    const offer = await host
      .getByRole("textbox", { name: `Einladungslink Gast ${slot}` })
      .inputValue();
    const guest = await context.newPage();
    guests.push(guest);
    await guest.goto(offer);
    await guest
      .getByRole("button", { name: "Beitreten und Antwort erzeugen" })
      .click();
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
    await page.getByRole("button", { name: "Bereit melden" }).click();
  }
  await host.getByRole("button", { name: "Schicht starten" }).click();
  for (const [index, page] of pages.entries()) {
    const panel = page.getByRole("region", { name: "Netzwerkstatus" });
    await expect(panel).toContainText("Station");
    await panel
      .getByLabel("Stationsfrage")
      .selectOption(["tag", "pin", "approvals"][index]!);
    await panel.getByRole("button", { name: "Station abschließen" }).click();
  }
  for (const page of pages)
    await expect(page.getByLabel("Tutorialschritt")).toContainText(
      "Übungsfall",
    );
  const accept = host
    .getByRole("region", { name: "Agentenpult und Tastatursteuerung" })
    .getByRole("button", { name: "Anruf annehmen" });
  await accept.focus();
  await accept.click();
  for (const page of pages)
    await expect(page.getByLabel("Tutorialschritt")).not.toContainText(
      "Station abgeschlossen",
    );
  await context.close();
});
