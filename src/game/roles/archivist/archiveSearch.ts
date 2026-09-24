import type { ArchiveRecordView } from "../../state/contracts";

const fold = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .toLocaleLowerCase("de");

export function searchArchive(
  records: readonly ArchiveRecordView[],
  query: string,
  tagFilter: string | null,
  sharedTags: readonly string[],
  tagLabels: Readonly<Record<string, string>>,
): ArchiveRecordView[] {
  const words = fold(query).trim().split(/\s+/).filter(Boolean);
  return records
    .filter((record) => !tagFilter || record.tags.includes(tagFilter))
    .map((record) => {
      const name = fold(record.name);
      const aliases = record.aliases.map(fold);
      const fields = [
        name,
        ...aliases,
        fold(record.occupation),
        ...record.events.map(fold),
        ...record.warnings.map(fold),
        fold(record.dossier),
        ...record.complaints.map(fold),
        ...record.tags.map((tag) => fold(tagLabels[tag] ?? tag)),
      ];
      if (!words.every((word) => fields.some((field) => field.includes(word))))
        return null;
      const score =
        words.reduce(
          (sum, word) =>
            sum +
            (name.startsWith(word) ? 5 : 0) +
            (aliases.some((alias) => alias.startsWith(word)) ? 3 : 0),
          0,
        ) + record.tags.filter((tag) => sharedTags.includes(tag)).length;
      return { record, score };
    })
    .filter(
      (item): item is { record: ArchiveRecordView; score: number } =>
        item !== null,
    )
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
    .map((item) => item.record);
}
