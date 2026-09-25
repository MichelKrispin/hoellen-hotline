import { expect, test, type Page } from "@playwright/test";

// Keep automated link transfers inside the product's 60-second reconnect window.
async function clickAndReadLink(
  page: Page,
  action: string,
  selector: string,
): Promise<string> {
  return page.evaluate(
    ({ action, selector }) =>
      new Promise<string>((resolve, reject) => {
        const button = document.querySelector<HTMLButtonElement>(
          `[data-action="${action}"]`,
        );
        if (!button) return reject(new Error(`Missing ${action} button`));
        const poll = window.setInterval(() => {
          const value =
            document.querySelector<HTMLTextAreaElement>(selector)?.value ?? "";
          if (!value.includes("#")) return;
          window.clearInterval(poll);
          window.clearTimeout(timeout);
          resolve(value);
        }, 50);
        const timeout = window.setTimeout(() => {
          window.clearInterval(poll);
          reject(new Error(`No link after ${action}`));
        }, 30_000);
        button.click();
      }),
    { action, selector },
  );
}

async function pasteAndClick(
  page: Page,
  selector: string,
  link: string,
  action: string,
): Promise<void> {
  await page.evaluate(
    ({ selector, link, action }) => {
      const field = document.querySelector<HTMLTextAreaElement>(selector);
      const button = document.querySelector<HTMLButtonElement>(
        `[data-action="${action}"]`,
      );
      if (!field || !button) throw new Error(`Missing ${action} controls`);
      field.value = link;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      button.click();
    },
    { selector, link, action },
  );
}

test("three browsers join the private lobby and choose distinct roles", async ({
  browser,
}, testInfo) => {
  test.setTimeout(900_000);
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/");
  await expect(host.locator("canvas")).toHaveAttribute("data-scene", "Title");
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
    ).toHaveAttribute("aria-pressed", "true", { timeout: 20_000 });
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
  await agentControls
    .getByRole("button", { name: "Anruf annehmen" })
    .press("Enter");
  await expect(
    host.getByRole("region", { name: "Gemeinsamer Schichtstatus" }),
  ).toContainText("Wartedruck");
  await expect(agentControls).toHaveAttribute("data-portrait-loaded", "true");
  await expect(agentControls.getByRole("status")).toContainText(
    "Wo ist mein Antrag?",
  );
  const dialogueChoice = agentControls.getByRole("button", {
    name: /Warteten Sie lange/,
  });
  await dialogueChoice.press("Enter");
  await expect(agentControls.getByRole("status")).toContainText(
    "Eine Ewigkeit.",
  );
  await agentControls
    .getByLabel("Entdeckten Hinweis wählen")
    .selectOption("core.tag.ink");
  await agentControls
    .getByRole("button", { name: /Hinweis veröffentlichen, Slot 1/ })
    .press("Enter");
  await expect(
    agentControls.getByRole("button", { name: /Hinweis ersetzen, Slot 1/ }),
  ).toBeVisible();
  await agentControls
    .getByLabel("Zielbereich für Bitte wählen")
    .selectOption("core.destination.archive");
  await agentControls
    .getByRole("button", { name: "Zielbitte an Disponent senden" })
    .press("Enter");
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
  await correctRecord.press("Enter");
  await expect(archive.getByRole("status")).toContainText(
    "Aktiver Sachbearbeiter",
  );
  await archive.getByRole("button", { name: /Pin 1: frei/ }).press("Enter");
  await expect(
    archive.getByRole("button", { name: /Pin 1: F. Beamter, Schalter 13/ }),
  ).toBeVisible();
  await archive.getByRole("button", { name: /FRAGWÜRDIG/ }).press("Enter");
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
  const reconnectOffer = await clickAndReadLink(
    host,
    "reconnect-slot-1",
    ".network-reconnect textarea[readonly]",
  );
  const reconnectGuest = guests[0]!;
  await pasteAndClick(
    reconnectGuest,
    "#reconnect-offer",
    reconnectOffer,
    "guest-rejoin",
  );
  const reconnectAnswer = await reconnectGuest.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const poll = window.setInterval(() => {
          const value = document.querySelector<HTMLTextAreaElement>(
            ".game-network-overlay textarea[readonly]",
          )?.value;
          if (!value?.includes("#answer=")) return;
          window.clearInterval(poll);
          window.clearTimeout(timeout);
          resolve(value);
        }, 50);
        const timeout = window.setTimeout(() => {
          window.clearInterval(poll);
          reject(new Error("Reconnect answer was not generated"));
        }, 30_000);
      }),
  );
  expect(reconnectAnswer).not.toBe(initialAnswers[0]!);
  await pasteAndClick(
    host,
    "#reconnect-answer-1",
    reconnectAnswer,
    "import-slot-1",
  );
  await expect(
    host.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("● Verbunden", { timeout: 20_000 });
  await expect(
    reconnectGuest.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("● Verbunden", { timeout: 20_000 });
  const dispatcher = guests[1]!;
  const machine = dispatcher.getByRole("region", {
    name: "Disponentenpult und Tastatursteuerung",
  });
  const archiveTarget = machine.getByRole("button", { name: /Ziel: Archiv\./ });
  await archiveTarget.focus();
  await archiveTarget.press("Enter");
  await expect(
    machine.getByRole("button", { name: /Hitze: 1\./ }),
  ).toBeVisible();
  await machine.getByRole("button", { name: /Hitze: 1\./ }).press("Enter");
  await machine
    .getByRole("button", { name: /Störung beheben:/ })
    .press("Enter");
  await machine.getByRole("button", { name: /Ventil: AUS/ }).press("Enter");
  await machine
    .getByRole("button", { name: "Anlage vorbereiten" })
    .press("Enter");
  await expect(machine.getByRole("status")).toContainText("Anlage vorbereitet");
  const agentApproval = agentControls.getByRole("button", {
    name: "Ausgewähltes Ziel freigeben",
  });
  await agentApproval.focus();
  await agentApproval.press("Enter");
  const archiveApproval = archive.getByRole("button", {
    name: "Vorbereitetes Ziel freigeben",
  });
  await archiveApproval.focus();
  await archiveApproval.press("Enter");
  await machine
    .getByRole("button", { name: "Bereitschaft melden" })
    .press("Enter");
  await expect(
    machine.getByRole("button", {
      name: "Hebel entsichern und Zusammenfassung prüfen",
    }),
  ).toBeEnabled();
  if (process.env.CAPTURE_AGENT === "1") {
    await dispatcher.locator("canvas").click({ position: { x: 700, y: 100 } });
    await dispatcher.screenshot({
      path: testInfo.outputPath("dispatcher-desk.png"),
    });
  }
  await machine
    .getByRole("button", {
      name: "Hebel entsichern und Zusammenfassung prüfen",
    })
    .focus();
  await machine
    .getByRole("button", {
      name: "Hebel entsichern und Zusammenfassung prüfen",
    })
    .press("Enter");
  await machine
    .getByRole("button", { name: "Zustellung endgültig auslösen" })
    .press("Enter");
  await expect(
    dispatcher
      .getByRole("region", { name: "Netzwerkstatus" })
      .locator(".network-reaction img"),
  ).toBeVisible();
  for (let caseNumber = 2; caseNumber <= 8; caseNumber++) {
    await agentControls.getByRole("button", { name: "Anruf annehmen" }).click();
    await archiveTarget.click();
    if (caseNumber % 2 === 1) {
      await machine.getByRole("button", { name: /Hitze: 1\./ }).click();
      await machine.getByRole("button", { name: /Störung beheben:/ }).click();
    }
    await machine.getByRole("button", { name: /Ventil: AUS/ }).click();
    await machine.getByRole("button", { name: "Anlage vorbereiten" }).click();
    await agentApproval.click();
    await archiveApproval.click();
    await machine.getByRole("button", { name: "Bereitschaft melden" }).click();
    await machine
      .getByRole("button", {
        name: "Hebel entsichern und Zusammenfassung prüfen",
      })
      .click();
    await machine
      .getByRole("button", { name: "Zustellung endgültig auslösen" })
      .click();
  }
  await expect(machine.getByRole("status")).toContainText("Ergebnis:");
  await expect(
    dispatcher.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("Schicht beendet");
  const report = dispatcher.getByRole("region", { name: "Abschlussakte" });
  await expect(report).toBeVisible();
  await expect(report).toContainText("Seed:");
  await expect(report).toContainText("Fallchronik");
  await expect(report.locator("li")).toHaveCount(8);
  await report.getByRole("button", { name: "Abschlussakte schließen" }).click();
  await expect(report).toBeHidden();
  await dispatcher
    .getByRole("region", { name: "Netzwerkstatus" })
    .getByRole("button", { name: "Abschlussakte öffnen" })
    .click();
  await expect(report).toBeVisible();
  await context.close();
});
