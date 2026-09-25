import { expect, test } from "@playwright/test";

test("role atlases load within the documented client budget", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "Title");
  await page.evaluate(() => performance.clearResourceTimings());
  await page.keyboard.press("3");
  await expect(page.locator("canvas")).toHaveAttribute("data-role", "agent");
  const metrics = await page.locator("canvas").evaluate((canvas) => {
    const target = canvas as HTMLCanvasElement;
    const gl = target.getContext("webgl2") ?? target.getContext("webgl");
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const atlases = resources.filter((entry) =>
      /role-agent|shared/.test(entry.name),
    );
    return {
      maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) as
        number | undefined,
      atlasNames: atlases.map((entry) =>
        new URL(entry.name).pathname.split("/").at(-1),
      ),
      atlasTransferBytes: atlases.reduce(
        (sum, entry) => sum + entry.transferSize,
        0,
      ),
      atlasDurationMs: Math.round(
        Math.max(0, ...atlases.map((entry) => entry.responseEnd)) -
          Math.min(...atlases.map((entry) => entry.startTime)),
      ),
    };
  });
  expect(metrics.maxTextureSize).toBeGreaterThanOrEqual(2048);
  expect(metrics.atlasNames.some((name) => name?.includes("role-agent"))).toBe(
    true,
  );
  expect(metrics.atlasTransferBytes).toBeLessThan(2 * 1024 * 1024);
  console.log(`Asset profile: ${JSON.stringify(metrics)}`);
});
