import { expect, test } from "@playwright/test";

test("one invite link connects two guests and starts a shift", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/");
  await host.keyboard.press("d");
  await host.keyboard.press("2");
  await host.getByRole("button", { name: "Lobby erstellen" }).click();
  const inviteField = host.getByRole("textbox", { name: "Einladungslink" });
  await expect(inviteField).toHaveValue(/#join=[0-9a-f]{32}$/);
  const invite = await inviteField.inputValue();
  const guests = [await context.newPage(), await context.newPage()];
  for (const [index, guest] of guests.entries()) {
    await guest.goto(invite);
    await expect(guest.locator(".member").nth(index + 1)).toContainText(
      "Verbunden",
      {
        timeout: 30_000,
      },
    );
    await expect(host.locator(".member").nth(index + 1)).toContainText(
      "Verbunden",
    );
    await expect(
      guest.getByRole("textbox", { name: "Antwortlink" }),
    ).toHaveCount(0);
  }
  for (const [index, page] of [host, ...guests].entries()) {
    await page
      .getByRole("button", { name: ["Agent", "Archivar", "Disponent"][index]! })
      .click();
    await page.getByRole("button", { name: "Bereit melden" }).click();
  }
  await host.getByRole("button", { name: "Schicht starten" }).click();
  for (const page of [host, ...guests])
    await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Game");
  await guests[0]!.evaluate(() =>
    (
      window as typeof window & {
        __closeGameChannel?: (slot: 0 | 1 | 2) => void;
      }
    ).__closeGameChannel?.(0),
  );
  await expect(
    host.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("Gast getrennt");
  await host
    .getByRole("button", { name: "Neuen Link für Gast 1 erzeugen" })
    .click();
  await expect(
    host.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("Verbunden", { timeout: 30_000 });
  await expect(
    guests[0]!.getByRole("region", { name: "Netzwerkstatus" }),
  ).toContainText("Verbunden", { timeout: 30_000 });
  await context.close();
});
