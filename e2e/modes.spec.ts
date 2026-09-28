import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

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
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-role",
      ["agent", "archivist", "dispatcher"][index]!,
    );
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await expect(
    host.getByRole("region", { name: "Agentenpult und Tastatursteuerung" }),
  ).toBeVisible();
  await expect(
    guests[0]!.getByRole("textbox", { name: "Akten durchsuchen" }),
  ).toBeVisible();
  await expect(
    guests[1]!.getByRole("region", {
      name: "Disponentenpult und Tastatursteuerung",
    }),
  ).toBeVisible();
  const touchTarget = await host
    .getByRole("button", { name: "Anruf annehmen" })
    .boundingBox();
  expect(touchTarget?.height).toBeGreaterThanOrEqual(44);
  const stationTasks = host.getByRole("list", { name: "Tutorialaufgaben" });
  await expect(stationTasks.getByRole("listitem")).toHaveCount(3);
  await expect(
    stationTasks.getByText("Agent · geteilten Tag erkennen"),
  ).toBeVisible();
  for (const [index, page] of pages.entries()) {
    const panel = page.getByRole("region", { name: "Netzwerkstatus" });
    await expect(panel).toContainText("Station");
    await panel
      .getByLabel("Stationsfrage")
      .selectOption(["tag", "pin", "approvals"][index]!);
    await panel.getByRole("button", { name: "Station abschließen" }).click();
  }
  for (const page of pages) {
    await expect(page.getByLabel("Tutorialschritt")).toContainText(
      "Übungsfall",
    );
    await expect(
      page
        .getByRole("list", { name: "Tutorialaufgaben" })
        .getByRole("listitem"),
    ).toHaveCount(6);
  }
  const accept = host
    .getByRole("region", { name: "Agentenpult und Tastatursteuerung" })
    .getByRole("button", { name: "Anruf annehmen" });
  // Exercise the relocated canvas controls as well as the mobile DOM controls.
  for (const page of pages) {
    await page.setViewportSize({ width: 1672, height: 941 });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document
        .querySelectorAll<HTMLElement>("[data-open]")
        .forEach((element) => delete element.dataset.open);
      const networkPanel =
        document.querySelector<HTMLDetailsElement>(".network-panel");
      if (networkPanel) networkPanel.open = false;
    });
  }
  const clickDesk = async (page: Page, x: number, y: number): Promise<void> => {
    await page.bringToFront();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const bounds = await page.locator("canvas").boundingBox();
    if (!bounds) throw new Error("Canvas fehlt");
    const target = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
      {
        x: bounds.x + (x / 1920) * bounds.width,
        y: bounds.y + (y / 1080) * bounds.height,
      },
    );
    expect(target).toBe("CANVAS");
    await page.mouse.click(
      bounds.x + (x / 1920) * bounds.width,
      bounds.y + (y / 1080) * bounds.height,
    );
  };
  await clickDesk(host, 292, 810);
  await expect(accept).toBeDisabled();
  await expect(
    host
      .getByRole("list", { name: "Tutorialaufgaben", includeHidden: true })
      .getByRole("listitem", { includeHidden: true })
      .filter({ hasText: "Anruf · Agent" }),
  ).toHaveClass(/is-done/);
  const archive = guests[0]!;
  const firstRecord = archive
    .locator(".archivist-mirror")
    .getByRole("button", { name: /Der Formularbeamte/ })
    .first();
  await clickDesk(archive, 280, 430);
  await expect(firstRecord).toHaveAttribute("aria-pressed", "true");
  await clickDesk(archive, 650, 885);
  await expect(
    archive
      .locator(".archivist-mirror")
      .getByRole("button", { name: "✓ VERIFIZIERT", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const dispatcher = guests[1]!;
  const archiveTarget = dispatcher
    .locator(".dispatcher-targets")
    .getByRole("button", { name: /Ziel: Archiv\./ });
  const targetIndex = await archiveTarget.evaluate((element) =>
    Array.from(element.parentElement!.children).indexOf(element),
  );
  await clickDesk(dispatcher, 1680, 254 + targetIndex * 38);
  await expect(archiveTarget).toHaveAttribute("aria-pressed", "true");
  const firstControl = dispatcher
    .locator(".dispatcher-controls button")
    .first();
  const previousValue = await firstControl.textContent();
  await clickDesk(dispatcher, 260, 480);
  await expect(firstControl).not.toHaveText(previousValue!);
  if (process.env.CAPTURE_UI === "1") {
    await mkdir("docs/ui-acceptance/screenshots", { recursive: true });
    for (const [index, page] of pages.entries()) {
      const role = ["agent", "archivist", "dispatcher"][index]!;
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        for (const mirror of Array.from(
          document.querySelectorAll<HTMLElement>(
            ".agent-accessible-controls, .archivist-mirror, .dispatcher-accessible-controls",
          ),
        ))
          delete mirror.dataset.open;
        const panel =
          document.querySelector<HTMLDetailsElement>(".network-panel");
        if (panel) panel.open = false;
      });
      for (const [width, height] of [
        [1280, 720],
        [1672, 941],
        [2560, 1440],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.screenshot({
          path: `docs/ui-acceptance/screenshots/${role}-${width}x${height}.jpg`,
          type: "jpeg",
          quality: 82,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: `docs/ui-acceptance/screenshots/${role}-390x844.jpg`,
        type: "jpeg",
        quality: 82,
        fullPage: true,
      });
    }
  }
  for (const page of pages)
    await expect(page.getByLabel("Tutorialschritt")).not.toContainText(
      "Station abgeschlossen",
    );
  await context.close();
});
