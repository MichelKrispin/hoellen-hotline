# Art Bible – Batch 1

Stand: 2026-09-23. Quellen: `titlescreen_mockup.png` und `gameplay_mockup.png`. Die Bilder geben Stimmung und Formen vor, keine verbindlichen Pixelpositionen. Jeder Spieler sieht einen Arbeitsplatz desselben Kontrollraums.

## Formensprache und Komik

- Silhouetten: gezackte Stadt und Brücken hinten; dicke Hörner, Rohrbögen und Ketten in der Mitte; schwere Pultkanten und übergroße Werkzeuge vorne. Die drei Rollen bleiben ohne Beschriftung an Telefon, Aktenschrank/Regelbuch und Hebelbank erkennbar.
- Material: geschwärztes Metall mit hellen Kanten und Nieten; schiefes, dunkles Holz; warmes Papier mit Faltkante und Clip; Bakelit für Telefon, Schalter und Gehäuse. Leichte Asymmetrie gehört zum Motiv, der Text bleibt gerade und lesbar.
- Licht: Orange/Rot aus Hölle und Warnlampen, Cyan nur für Seelen/Anrufkanal. Lokale Neonränder beleuchten wichtige Entscheidungen. Hintergründe bleiben dunkler als Arbeitsflächen.
- Kontur: dunkle, kräftige Außenkante um Figur, Objekt und Pult; feinere Linien für Kratzer, Papier und Holz. Hell leuchtende Ränder werden sparsam eingesetzt.
- Komik: bürokratischer Ernst neben absurden Umständen. Zettel, gestresste Figuren und viel zu große Maschinen liefern Reaktionen; die eigentliche Entscheidung bleibt immer lesbar. Humor darf Status oder Fehler nicht verdecken.

## Farbrollen

| Zweck       | Farbe                | Zusätzliche Kennzeichnung    |
| ----------- | -------------------- | ---------------------------- |
| Gefahr/Glut | `#ff542d`, `#ff9a45` | Flamme, Warndreieck, Puls    |
| Seele/Anruf | `#68d8dc`            | Geistsilhouette, Wellenlinie |
| Agent       | `#d34b49`            | Telefon                      |
| Archiv      | `#9d70c8`            | Akte/Stempel                 |
| Disposition | `#e9a84c`            | Hebel/Zielpfeil              |
| Erfolg      | `#8bc98f`            | Haken                        |
| Warnung     | `#ffc46a`            | Fragezeichen                 |
| Fehler      | `#ff6755`            | Kreuz                        |

Text auf dunklen Flächen ist cremefarben (`#f4e1bd`), auf Papier dunkle Tinte (`#30232a`). Die Farbsignale haben immer Wort und Symbol; insbesondere die Zielbank verlässt sich nicht auf Neonfarbe allein.

## Wiederverwendbare Materialien

Die Phaser-Stilprobe setzt diese Oberflächen in `src/game/presentation/art.ts` aus austauschbaren SVG-Platzhaltern zusammen. Die aktuellen `panel-*`-Texturen verwenden 32 px Rand auf allen Seiten; für spätere Textur-Atlanten sind folgende Materialziele geplant:

| Material            | Rand                                   | Mitte                                          | Einsatz                  |
| ------------------- | -------------------------------------- | ---------------------------------------------- | ------------------------ |
| Geschwärztes Metall | 24 px, Nieten außerhalb der Streckzone | dunkle, leicht körnige Fläche                  | Pulte, Statusrahmen      |
| Schiefes Holz       | 30 px                                  | waagerechte Maserung, wiederholbar             | Tisch, Aktenschrank      |
| Vergilbtes Papier   | 18 px                                  | freie, kontrastreiche Schreibfläche            | Karten, Regeln, Dossiers |
| Neonröhre           | 22 px                                  | dunkle Fläche, separat gezeichneter Glühschein | Knöpfe, Logo, Ziele      |
| Bakelit             | 20 px                                  | fast schwarze Fläche                           | Telefon, Hebelgehäuse    |

Ecken, Nieten, Clips und Lichtreflexe liegen in festen Randsegmenten. Text und Hitbox bleiben innen mit mindestens 20 px Abstand. Texturen bekommen stabile Asset-IDs; Spiellogik referenziert keine Dateien.

## Ebenen und Ansichten

Von hinten nach vorn: 1 Hintergrundhölle mit Stadt und Lava, 2 Brücken und kleine Silhouetten, 3 Raumrohre/Ketten/Warnlichter, 4 rolleneigenes Pult und Figur, 5 Vordergrund mit Papier, Werkzeug und Gags. Die Kulisse besteht aus getrennten Sprite-Ebenen. Brücken und Raumarmaturen reagieren leicht unterschiedlich auf Zeigerbewegung; bei reduzierter Bewegung bleiben sie stehen. Auf dem Titelbild kennzeichnen Telefon, Aktenstapel und Hebelbank die drei Figuren auch ohne Rollenlabels.

```text
Gemeinsam:  [ROLLE] [QUEUE] [ZEIT] [STRESS] [FALL-ID] [FREIGABE]
            [nur grobe Präsenz der zwei Kollegen]

Agent:      [Figur + Telefon] [cyan Anruf / Antworten] [veröffentlichte Hinweise]
Archiv:     [Aktenschrank]   [Regelbuch]          [Dossier / Stempel]
Disposition:[Figur]          [Zielbank + Hebel]  [Route / Druck]
```

Die gemeinsame Leiste zeigt nur `PublicShiftView`: Queue, Schichtzeit, Teamstress, Fall-ID, Freigabe und grobe Kollegenaktivität. Sie enthält weder fremde Dialogantworten noch Regeltexte, Akten oder genaue Maschinenwerte. Ohne laufende Schicht zeigt die Stilprobe Striche und „WARTET“, keine erfundenen Falldaten. Die Rollenpulte sind in Batch 1 Ansichten und noch keine Spielmechanik.

## Bedien- und Lesbarkeitsregeln

- Referenzauflösung 1920×1080, Safe Area 96 px horizontal und 72 px vertikal. Phaser skaliert mit `FIT`; Abnahme bei 1280×720, 1672×941 und 2560×1440.
- UI-Zoom: künftig 100 %, 125 % und 150 % für Pultinhalte; Kulisse und Statusleiste bleiben im Bild. Scrollbare Inhaltsflächen statt Abschneiden.
- Tooltip: kurze Papierkarte am fokussierten oder berührten Element, mindestens 28 px Text in Designkoordinaten; nie nur bei Hover, nie auf verdeckten geheimen Daten.
- Fokus: heller, mindestens 4 px breiter Doppelrahmen mit rollenunabhängigem Symbol, Tastaturreihenfolge entlang der sichtbaren Arbeitsrichtung. DOM-Dialoge bekommen semantischen Fokus.
- Reduzierte Bewegung: Systempräferenz `prefers-reduced-motion` stoppt bereits das Figuren-Idle; spätere Druck- und Fehlerreaktionen wechseln dann zu statischen Zuständen ohne Kamerawackeln.
- Kontrastmodus: helle Textflächen und dickere Trennlinien, keine transparenten Textträger; Neon bleibt dekorativ. Statussymbole und Wörter sind dauerhaft sichtbar.

Die Zoom- und Kontrastschalter, Tooltips und Fokussteuerung werden mit den bedienbaren Rollenmechaniken umgesetzt. Die Stilprobe bietet bereits die visuelle Grundlage und respektiert reduzierte Bewegung.
