import { describe, expect, it } from "vitest";
import type { ArchiveRecordView } from "../../state/contracts";
import { searchArchive } from "./archiveSearch";

const records: ArchiveRecordView[] = Array.from({ length: 30 }, (_, index) => ({
  id: `record.${index}`,
  name: index < 3 ? "Der Formularbeamte" : `Seele ${index}`,
  aliases: [`F. Beamter, ${index === 0 ? "Schalter" : "Archiv"} ${index}`],
  occupation: index === 0 ? "Aktiver Sachbearbeiter" : "Kopist",
  events: [index === 0 ? "Heute am Tintenschalter" : "Früher im Kopierraum"],
  warnings: [index === 0 ? "Hat eine Wartemarke" : "Keine Wartemarke"],
  dossier: `Dossier ${index}`,
  tags: index === 0 ? ["ink", "queue"] : index === 1 ? ["ink"] : ["queue"],
  complaints: ["Formular fehlt"],
}));

describe("archive search", () => {
  it("finds fair distinctions across names, aliases, work, events and tags in 30 records", () => {
    expect(
      searchArchive(records, "formularbeamte", null, ["ink", "queue"], {
        ink: "Rote Tinte",
        queue: "Warteschlange",
      })
        .slice(0, 3)
        .map((item) => item.id),
    ).toEqual(["record.0", "record.1", "record.2"]);
    expect(
      searchArchive(records, "Tintenschalter", "ink", [], {}).map(
        (item) => item.id,
      ),
    ).toEqual(["record.0"]);
    expect(
      searchArchive(records, "Schalter", null, [], {}).map((item) => item.id),
    ).toEqual(["record.0"]);
    expect(
      searchArchive(records, "kopist", "ink", [], {
        ink: "Rote Tinte",
        queue: "Warteschlange",
      }).map((item) => item.id),
    ).toEqual(["record.1"]);
  });
});
