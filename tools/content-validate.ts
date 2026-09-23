import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadContent } from "../src/content/registry";
import { CampaignPackageSchema } from "../src/content/schemas";

async function discover(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await discover(path)));
    else if (entry.name === "fixture.json") paths.push(path);
  }
  return paths;
}

async function main(): Promise<void> {
  const paths = await discover("src/content");
  const pending = await Promise.all(
    paths.map(async (path) => {
      const raw: unknown = JSON.parse(await readFile(path, "utf8"));
      return { path, package: CampaignPackageSchema.parse(raw) };
    }),
  );
  const ordered: typeof pending = [];
  const loaded = new Set<string>();
  while (pending.length) {
    const index = pending.findIndex(({ package: pkg }) =>
      pkg.manifest.dependencies.every(({ id }) => loaded.has(id)),
    );
    if (index < 0)
      throw new Error(
        `Unresolved or cyclic dependencies: ${pending.map(({ package: pkg }) => pkg.manifest.id).join(", ")}`,
      );
    const [entry] = pending.splice(index, 1);
    if (!entry) throw new Error("Internal content ordering error");
    ordered.push(entry);
    loaded.add(entry.package.manifest.id);
  }
  const registry = await loadContent(ordered.map((entry) => entry.package));
  for (const entry of ordered)
    process.stdout.write(`✓ ${entry.package.manifest.id} (${entry.path})\n`);
  process.stdout.write(`Content hash v1: ${registry.gameplayHash}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
