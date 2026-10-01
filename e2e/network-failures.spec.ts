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

test(
  "direct local candidates connect even when STUN is unavailable",
  { tag: "@stun-failure" },
  async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const configurations: RTCConfiguration[] = [];
      (
        window as typeof window & {
          __testIceConfigurations: RTCConfiguration[];
        }
      ).__testIceConfigurations = configurations;
      const NativePeer = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends NativePeer {
        constructor(configuration?: RTCConfiguration) {
          super(configuration);
          configurations.push(this.getConfiguration());
        }
      };
    });
    const host = await context.newPage();
    await host.goto("/");
    await expect(host.locator("canvas")).toHaveAttribute("data-scene", "Lobby");
    await host.keyboard.press("d");
    await host.keyboard.press("2");
    await host.getByRole("button", { name: "Lobby erstellen" }).click();
    await host
      .getByRole("button", { name: "Manuelle Verbindung (Fallback)" })
      .click();
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
    await host
      .getByRole("textbox", { name: "Antwortlink Gast 1" })
      .fill(answer);
    await host.getByRole("button", { name: "Antwort importieren" }).click();
    await expect(host.getByText("Gast 1 · Verbunden")).toBeVisible();
    for (const page of [host, guest]) {
      const stunUrls = await page.evaluate(() =>
        (
          window as typeof window & {
            __testIceConfigurations: RTCConfiguration[];
          }
        ).__testIceConfigurations.flatMap((configuration) =>
          (configuration.iceServers ?? []).flatMap((server) => server.urls),
        ),
      );
      // Prevent a green result from a server accidentally started without STUN.
      expect(stunUrls).toContain("stun:127.0.0.1:9");
    }
    await context.close();
  },
);
