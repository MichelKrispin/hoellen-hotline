import { expect, test, type Page } from "@playwright/test";

// A technical spike for the transport. The product handshake UI belongs to Batch 4.
test("one host exchanges complete offers and answers with two guests", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const guests = [await context.newPage(), await context.newPage()];
  await Promise.all([host, ...guests].map((page) => page.goto("/")));

  const waitForIce = async (page: Page, slot: number): Promise<void> => {
    await page.waitForFunction((key) => {
      const peers = (
        window as typeof window & {
          spikePeers: Record<number, RTCPeerConnection>;
        }
      ).spikePeers;
      return peers[key]?.iceGatheringState === "complete";
    }, slot);
  };

  const links: number[] = [];
  for (const [index, guest] of guests.entries()) {
    const slot = index + 1;
    await host.evaluate((key) => {
      const w = window as typeof window & {
        spikePeers: Record<number, RTCPeerConnection>;
        spikeChannels: Record<number, RTCDataChannel>;
        spikeReplies: Record<number, string>;
      };
      w.spikePeers ??= {};
      w.spikeChannels ??= {};
      w.spikeReplies ??= {};
      const peer = new RTCPeerConnection({ iceServers: [] });
      const channel = peer.createDataChannel("game", { ordered: true });
      channel.onmessage = (event) => {
        w.spikeReplies[key] = String(event.data);
      };
      w.spikePeers[key] = peer;
      w.spikeChannels[key] = channel;
    }, slot);
    await host.evaluate(async (key) => {
      const peer = (
        window as typeof window & {
          spikePeers: Record<number, RTCPeerConnection>;
        }
      ).spikePeers[key];
      await peer!.setLocalDescription(await peer!.createOffer());
    }, slot);
    await waitForIce(host, slot);
    const offer = await host.evaluate((key) => {
      const peer = (
        window as typeof window & {
          spikePeers: Record<number, RTCPeerConnection>;
        }
      ).spikePeers[key];
      return peer!.localDescription?.toJSON();
    }, slot);
    expect(offer?.sdp).toContain("candidate:");
    const offerLink = new URL(
      `#offer=${Buffer.from(JSON.stringify({ slot, offer })).toString("base64url")}`,
      "https://example.github.io/hoellen-hotline/",
    ).href;
    links.push(offerLink.length);

    await guest.evaluate(
      async ({ key, remote }) => {
        const w = window as typeof window & {
          spikePeers: Record<number, RTCPeerConnection>;
          spikeMessages: Record<number, string>;
        };
        w.spikePeers ??= {};
        w.spikeMessages ??= {};
        const peer = new RTCPeerConnection({ iceServers: [] });
        peer.ondatachannel = (event) => {
          event.channel.onmessage = (message) => {
            w.spikeMessages[key] = String(message.data);
            event.channel.send(`reply-${key}`);
          };
        };
        w.spikePeers[key] = peer;
        await peer.setRemoteDescription(remote!);
        await peer.setLocalDescription(await peer.createAnswer());
      },
      { key: slot, remote: offer },
    );
    await waitForIce(guest, slot);
    const answer = await guest.evaluate((key) => {
      const peer = (
        window as typeof window & {
          spikePeers: Record<number, RTCPeerConnection>;
        }
      ).spikePeers[key];
      return peer!.localDescription?.toJSON();
    }, slot);
    expect(answer?.sdp).toContain("candidate:");
    const answerLink = new URL(
      `#answer=${Buffer.from(JSON.stringify({ slot, answer })).toString("base64url")}`,
      "https://example.github.io/hoellen-hotline/",
    ).href;
    links.push(answerLink.length);
    await host.evaluate(
      async ({ key, remote }) => {
        const peer = (
          window as typeof window & {
            spikePeers: Record<number, RTCPeerConnection>;
          }
        ).spikePeers[key];
        await peer!.setRemoteDescription(remote!);
      },
      { key: slot, remote: answer },
    );
    await host.waitForFunction(
      (key) =>
        (
          window as typeof window & {
            spikeChannels: Record<number, RTCDataChannel>;
          }
        ).spikeChannels[key]?.readyState === "open",
      slot,
    );
  }

  await guests[1]!.bringToFront();
  await host.evaluate(() => {
    const channels = (
      window as typeof window & {
        spikeChannels: Record<number, RTCDataChannel>;
      }
    ).spikeChannels;
    channels[1]!.send("after-background-1");
    channels[2]!.send("after-background-2");
  });
  for (const [index, guest] of guests.entries()) {
    const slot = index + 1;
    await guest.waitForFunction(
      (key) =>
        (window as typeof window & { spikeMessages: Record<number, string> })
          .spikeMessages[key] === `after-background-${key}`,
      slot,
    );
    await host.waitForFunction(
      (key) =>
        (window as typeof window & { spikeReplies: Record<number, string> })
          .spikeReplies[key] === `reply-${key}`,
      slot,
    );
  }
  console.log(
    `Uncompressed local offer/answer link lengths: ${links.join(", ")} characters`,
  );
  expect(links.every((length) => length < 10_000)).toBe(true);
  await context.close();
});
