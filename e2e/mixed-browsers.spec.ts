import { chromium, expect, test } from "@playwright/test";

test("Chromium host and guest connect with a Firefox guest", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const chromiumBrowser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  try {
    const host = await chromiumBrowser.newPage();
    const guests = [await browser.newPage(), await chromiumBrowser.newPage()];
    await host.goto("http://127.0.0.1:5173/");
    await expect(host.locator("canvas")).toHaveAttribute("data-scene", "Title");
    await host.keyboard.press("2");
    await host.getByRole("button", { name: "Lobby erstellen" }).click();
    for (const [index, guest] of guests.entries()) {
      const slot = index + 1;
      await host
        .getByRole("button", { name: "Einladung erzeugen" })
        .first()
        .click();
      const offer = await host
        .getByRole("textbox", { name: `Einladungslink Gast ${slot}` })
        .inputValue();
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
    for (const [index, page] of [host, ...guests].entries()) {
      await page
        .getByRole("button", {
          name: ["Agent", "Archivar", "Disponent"][index]!,
        })
        .click();
      await page.getByRole("button", { name: "Bereit melden" }).click();
    }
    await host.getByRole("button", { name: "Schicht starten" }).click();
    for (const page of [host, ...guests]) {
      await expect(page.locator("canvas")).toHaveAttribute(
        "data-scene",
        "Game",
      );
      await expect(
        page.getByRole("region", { name: "Netzwerkstatus" }),
      ).toContainText("Verbunden");
    }
  } finally {
    await chromiumBrowser.close();
  }
});
