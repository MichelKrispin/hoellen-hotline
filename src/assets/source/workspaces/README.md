# Arbeitsplatz-Sprites (Mockup-Aufbau)

Die SVGs sind projektinterne Placeholder für die lokalen Referenzen `mockups/agent.png`, `mockups/archivist.png` und `mockups/dispatch.png`. Sie bilden austauschbare Bauteile, keine fertige Illustration. Text, Falldaten und Hitboxen werden separat in Phaser beziehungsweise im barrierefreien DOM gerendert.

## Später ersetzen

Eine Grafik mit identischem Dateinamen als `.webp` oder `.png` in diesen Ordner legen. `src/assets/workspaceSprites.ts` bevorzugt WebP, dann PNG, dann den SVG-Placeholder. Beispiel: `dial-face.webp` ersetzt `dial-face.svg`; die Zeigertextur bleibt unabhängig. Der Sprite-Schlüssel `workspace:dial-face` und die Bedienlogik bleiben gleich. Nach dem Austausch neu bauen beziehungsweise die Seite neu laden.

- Transparenter Hintergrund bei Werkzeugen, Buch, Tabs, Clip und beweglichen Teilen.
- Keine Texte, Zahlen, Zustandsanzeigen oder Falldaten in die Grafik einbacken.
- Gleiche Proportionen, Außenkontur und freie Schreibflächen wie im SVG beibehalten.
- Gerahmte Flächen verwenden 9-Slice. Der Rand steht in `WORKSPACE_SPRITES` in **Quellpixeln** (20 px, Hebelgehäuse 32 px). Bei höher aufgelöster Ersatzgrafik diesen Wert proportional anpassen; Ecken und Beschläge bleiben vollständig im Rand. Die Mitte muss streckbar sein.
- `dial-pointer` rotiert um die Bildmitte; `switch-handle` und `slider-thumb` verschieben sich unabhängig von ihrem Gehäuse. Diese Teile dürfen keine unbewegliche Gehäusegrafik enthalten.

## Bauteile

| IDs                                        | Aufgabe                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `iron-frame`, `control-housing`            | HUD, Maschinenmodule und Pultgehäuse                                      |
| `cyan-monitor`                             | Seelenkanal mit freier Text-/Porträtfläche                                |
| `paper-card`, `dossier-paper`, `hint-slip` | Antwortstreifen, Suchtreffer, Dossiers und öffentliche Hinweise           |
| `clipboard-clip`                           | Separater Metallclip über Dossier und Hinweisbrett                        |
| `book-spread`, `book-tab`                  | Offenes Regelbuch und Register                                            |
| `stamp-base`, `stamp-cap`                  | Stempelkörper und separat eingefärbter Statuskopf                         |
| `dial-face`, `dial-pointer`                | Drehregler und beweglicher Zeiger                                         |
| `switch-track`, `switch-handle`            | Schaltergehäuse und beweglicher Griff                                     |
| `slider-track`, `slider-thumb`             | Schieberegler und beweglicher Schieber                                    |
| `lever-housing`                            | Hebelgehäuse; Arm kommt weiterhin aus den bestehenden Placeholder-Sprites |

Kulisse, Tisch und Figurenporträts verwenden weiterhin die vorhandenen, separat geladenen Assets. Telefon, Hörer, Analogregler, Stempel und weitere Requisiten kommen aus dem [Rollen-Requisitenpaket](../../../../docs/role-sprites.md). `src/assets/roleSprites.ts` lädt dessen WebP-Dateien rollenweise und erhält die Motivproportionen. Die flächigen SVG-Materialien hier bleiben als separate Schreib- und Bedienflächen erhalten.

`src/game/presentation/roleWorkspaces.ts` setzt die drei Arbeitsplätze zusammen. `workspaceLayout.ts` teilt die Positionen wiederholter Karten und Regler mit den laufenden Rollenpanels, sodass Sprites und Klickflächen übereinstimmen. Referenzraum: 1920 × 1080. Die SVGs sind absichtlich schlicht; die vorhandene Höllenkulisse und Figuren werden weiterverwendet.
