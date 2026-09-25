# Content-Review – MVP

Stand: 2026-09-25. Geprüft: `src/content/core/fixture.json`, Porträts und Reaktionsgrafiken unter `src/assets/source/`.

## Umfang und Lesbarkeit

- 30 Anrufer-Archetypen mit eigenen Dossiers, Ereignissen, Warnhinweisen, Dialoganfängen und Vektorporträts.
- 40 Lebens- und Verhaltens-Tags, 20 Beschwerden, 18 Ausnahmen und 24 Regelklauseln.
- Neun Standardziele, drei vorübergehend verfügbare Sonderziele und zwölf Störungen. Das Ersatzlayout kann alle Ziele bedienen; jede Störung benennt genau einen passenden Reglerwert als Gegenaktion.
- 20 Reaktionsgrafiken: zwölf für korrekte Zustellungen, fünf für Störungen und drei allgemeine Ergebnisstempel. Die Grafiken ergänzen sichtbare Texte und Symbole.

Die Anrufer sprechen in kurzen, voneinander verschiedenen Sätzen. Fragen nennen den konkreten Tag, den sie aufdecken können; sechs Formulierungen vermeiden eine durchgehend gleiche Frageform. Der einheitliche Gesprächsabschluss bleibt als wiedererkennbare Bedienhandlung erhalten. Aktenhinweise und Dialogantworten ergänzen einander, statt dieselbe Information wörtlich zu wiederholen.

## Safety-Review

Die Pointen richten sich gegen erfundene Verwaltungsabläufe, Eitelkeit und kleine Alltagssünden. Es gibt keine Bezüge auf reale Tragödien, geschützte Gruppen oder detaillierte Gewalt. Bestehende rote Tinte wurde sprachlich von einer realistischen Verletzung getrennt. Figuren tragen Berufs- oder Fantasietitel ohne Zuschreibung an Herkunft, Religion, Geschlecht oder Behinderung. Die Hölle bleibt eine abstrakte Komödienkulisse.

## Generator und Balance

`node --import tsx tools/analyze-content.ts` prüft alle 6.744 Kombinationen aus erlaubten Archetyp-Tag-Paaren, aktivierten Regeln, Fallpositionen und Layouts ohne helfende Ausnahme. Ergebnis: keine Sackgasse. In 100 simulierten Standard-Schichten mit zufälligem Maschinenpool entstanden 1.000 Fälle, darunter alle 30 Archetypen, 20 Beschwerden, 18 Ausnahmen, zwölf Ziele und zwölf Störungstypen. Es gab 439 unterschiedliche Gesamtfälle; die ersten fünf vollständigen Schichten waren verschieden.

Die drei Sonderziele sind absichtlich selten und werden später in der Schicht durch Mutatoren geschlossen. Zorn erscheint unter der anfänglichen Tintenregel seltener als andere Standardziele. Diese Schieflage ist spielmechanisch beabsichtigt; weitere Spieldaten sollen prüfen, ob sie sich für Spieler trotzdem gut anfühlt.
