import { z } from "zod";
import type { CampaignPackage } from "../../content/schemas";

const ProgressSchema = z.object({
  version: z.literal(1),
  completed: z.record(z.string(), z.array(z.string())),
  guestHistory: z
    .array(
      z.object({
        sessionId: z.string().regex(/^[0-9a-f]{32}$/),
        campaignId: z.string(),
        scenarioId: z.string(),
        result: z.enum(["completed", "time", "pressure"]),
      }),
    )
    .default([]),
});

export type CampaignProgress = z.infer<typeof ProgressSchema>;
const STORAGE_KEY = "hoellen-hotline.campaign-progress.v1";

export function emptyProgress(): CampaignProgress {
  return { version: 1, completed: {}, guestHistory: [] };
}

export function parseProgress(input: unknown): CampaignProgress {
  return ProgressSchema.parse(input);
}

export function completeScenario(
  progress: CampaignProgress,
  campaignId: string,
  scenarioId: string,
): CampaignProgress {
  const copy = structuredClone(progress);
  const completed = copy.completed[campaignId] ?? [];
  if (!completed.includes(scenarioId)) completed.push(scenarioId);
  copy.completed[campaignId] = completed;
  return copy;
}

export function scenarioOrder(pkg: CampaignPackage): string[] {
  return pkg.manifest.chapters.flatMap((chapterId) => {
    const chapter = pkg.chapters.find((item) => item.id === chapterId);
    if (!chapter) throw new Error(`Kapitel fehlt: ${chapterId}`);
    return chapter.scenarios;
  });
}

export function isScenarioUnlocked(
  progress: CampaignProgress,
  pkg: CampaignPackage,
  scenarioId: string,
): boolean {
  const order = scenarioOrder(pkg);
  const index = order.indexOf(scenarioId);
  if (index < 0) return false;
  return (
    index === 0 ||
    (progress.completed[pkg.manifest.id] ?? []).includes(order[index - 1]!)
  );
}

export function nextScenario(
  progress: CampaignProgress,
  pkg: CampaignPackage,
): string | null {
  return (
    scenarioOrder(pkg).find(
      (id) =>
        !(progress.completed[pkg.manifest.id] ?? []).includes(id) &&
        isScenarioUnlocked(progress, pkg, id),
    ) ?? null
  );
}

export function addGuestCompletion(
  progress: CampaignProgress,
  entry: CampaignProgress["guestHistory"][number],
): CampaignProgress {
  const copy = structuredClone(progress);
  if (!copy.guestHistory.some((item) => item.sessionId === entry.sessionId))
    copy.guestHistory.push(entry);
  return copy;
}

export function exportProgress(progress: CampaignProgress): string {
  return JSON.stringify(parseProgress(progress));
}

export function importProgress(raw: string): CampaignProgress {
  if (raw.length > 64_000) throw new Error("Fortschrittsdatei ist zu groß.");
  return parseProgress(JSON.parse(raw) as unknown);
}

export function readLocalProgress(): CampaignProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? importProgress(raw) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function writeLocalProgress(progress: CampaignProgress): void {
  localStorage.setItem(STORAGE_KEY, exportProgress(progress));
}
