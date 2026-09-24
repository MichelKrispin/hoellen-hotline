import { expect, test } from "@playwright/test";

test("three browsers join the private lobby and choose distinct roles", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/");
  await host.keyboard.press("2");
  await host.getByRole("button", { name: "Lobby erstellen" }).click();
  const guests = [];
  const initialAnswers: string[] = [];
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
    initialAnswers.push(answer);
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
  for (const [index, page] of pages.entries()) {
    await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Game");
    await expect(
      page.getByRole("region", { name: "Netzwerkstatus" }),
    ).toContainText(`Rolle: ${["agent", "archivist", "dispatcher"][index]}`);
    await expect(
      page.getByRole("region", { name: "Netzwerkstatus" }),
    ).toContainText(/Revision: [0-9]+/);
  }
  const agentControls = host.getByRole("region", {
    name: "Agentenpult und Tastatursteuerung",
  });
  await agentControls.getByRole("button", { name: "Anruf annehmen" }).focus();
  await agentControls.getByRole("button", { name: "Anruf annehmen" }).click();
  await expect(agentControls.getByRole("status")).toContainText(
    "Wo ist mein Antrag?",
  );
  const dialogueChoice = agentControls.getByRole("button", {
    name: /Warteten Sie lange/,
  });
  await dialogueChoice.click();
  await expect(agentControls.getByRole("status")).toContainText(
    "Eine Ewigkeit.",
  );
  await expect(
    agentControls.getByRole("button", { name: /Welche Schlange war es/ }),
  ).toBeDisabled();
  await agentControls
    .getByLabel("Entdeckten Hinweis wählen")
    .selectOption("core.tag.ink");
  await agentControls
    .getByRole("button", { name: /Hinweis veröffentlichen, Slot 1/ })
    .click();
  await expect(
    agentControls.getByRole("button", { name: /Hinweis ersetzen, Slot 1/ }),
  ).toBeVisible();
  await agentControls
    .getByLabel("Zielbereich für Bitte wählen")
    .selectOption("core.destination.archive");
  await agentControls
    .getByRole("button", { name: "Zielbitte an Disponent senden" })
    .click();
  await expect(
    agentControls.getByRole("button", {
      name: "Zielbitte an Disponent senden",
    }),
  ).toBeDisabled();
  if (process.env.CAPTURE_AGENT === "1") {
    await host.locator("canvas").click({ position: { x: 700, y: 100 } });
    await host.screenshot({ path: testInfo.outputPath("agent-desk.png") });
  }
  const archivist = guests[0]!;
  const archive = archivist.getByRole("region", { name: "Archivarbeitsplatz" });
  await archive
    .getByRole("textbox", { name: "Akten durchsuchen" })
    .fill("Formularbeamte");
  await archive
    .getByRole("combobox", { name: "Akten nach Tag filtern" })
    .selectOption("core.tag.ink");
  const correctRecord = archive.getByRole("button", {
    name: /F. Beamter, Schalter 13/,
  });
  await correctRecord.focus();
  await correctRecord.click();
  await expect(archive.getByRole("status")).toContainText(
    "Aktiver Sachbearbeiter",
  );
  await archive.getByRole("button", { name: /Pin 1: frei/ }).click();
  await expect(
    archive.getByRole("button", { name: /Pin 1: F. Beamter, Schalter 13/ }),
  ).toBeVisible();
  await archive.getByRole("button", { name: /FRAGWÜRDIG/ }).click();
  await expect(archive.getByText("Stempel: ? FRAGWÜRDIG")).toBeVisible();
  if (process.env.CAPTURE_AGENT === "1") {
    await archivist.locator("canvas").click({ position: { x: 700, y: 100 } });
    await archivist.screenshot({
      path: testInfo.outputPath("archive-desk.png"),
    });
  }
  await host.evaluate(() =>
    (
      window as typeof window & { __closeGameChannel: (slot: 1 | 2) => void }
    ).__closeGameChannel(1),
  );
  await expect(
    host.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("Gast getrennt");
  await host
    .getByRole("button", { name: "Neuen Link für Gast 1 erzeugen" })
    .click();
  const reconnectOffer = await host
    .getByRole("textbox", { name: "Einladung Gast 1" })
    .inputValue();
  const reconnectGuest = guests[0]!;
  await reconnectGuest
    .getByRole("textbox", { name: "Neuer Reconnect-Link vom Host" })
    .fill(reconnectOffer);
  await reconnectGuest.getByRole("button", { name: "Neu verbinden" }).click();
  const reconnectAnswerField = reconnectGuest.getByRole("textbox", {
    name: "Neue Antwort für den Host",
  });
  await expect(reconnectAnswerField).not.toHaveValue(initialAnswers[0]!);
  const reconnectAnswer = await reconnectAnswerField.inputValue();
  await host
    .getByRole("textbox", { name: "Antwort Gast 1" })
    .fill(reconnectAnswer);
  await host.getByRole("button", { name: "Antwort importieren" }).click();
  await expect(
    host.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("● Verbunden");
  await expect(
    reconnectGuest.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("● Verbunden");
  await context.close();
});
