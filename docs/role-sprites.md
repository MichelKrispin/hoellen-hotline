# Rollen-Requisiten aus dem Sprite-Paket

Das am 28.09.2026 bereitgestellte `hoellen-hotline-sprites.zip` enthält 30 neue Requisiten. Die vollständigen Originale mit Manifest, vier Referenzatlanten und Prüfsummen liegen in `src/assets/source/role-sprites/`. Das Paket ergänzt die bereits vorhandenen Kulissen und die Figurenporträts. Die Originaldateien werden unverändert archiviert; der Webbuild lädt nur die erzeugten Einzeltexturen.

`npm run assets:build` erzeugt über `tools/build-role-sprites.ts` die WebP-Dateien in `src/assets/generated/role-sprites/`. ImageMagick begrenzt jede Textur auf maximal 512 × 512 Pixel, erhält Seitenverhältnis und Alpha und verwendet Qualität 86. Die Dateien sind eingecheckt; der normale Produktionsbuild benötigt ImageMagick nicht. Die Pipeline begrenzt jede Gruppe auf 1 MiB Download und 8 MiB RGBA-Speicher.

`src/assets/roleSprites.ts` lädt beim Eintritt in die Game-Szene die jeweilige Rolle und die gemeinsamen Requisiten. Bestehende Texturen werden bei einem erneuten Rollenwechsel wiederverwendet. Die Schlüssel heißen `role-sprite:<Paket-ID>`. Die Anzeige passt das Motiv proportional in den vorgesehenen Bereich ein. Die ursprünglichen Atlasrechtecke werden nicht als Phaser-Atlas benutzt: Die zugeschnittenen Einzelbilder haben eigene Größen und Randbereiche.

Auch die bestehenden Porträt- und Reaktionsatlanten werden jetzt als WebP mit Alpha geladen. Ihre PNG-Fassungen bleiben erhalten. Dadurch bleibt der Download beim Agenten-Rollenwechsel einschließlich der neuen gemeinsamen und rolleneigenen Requisiten unter dem bestehenden 2-MiB-Budget; die Browserprüfung zählt alle diese Dateien mit.

| Gruppe      | Verwendung                                                                                                                       | Download  | RGBA-Speicher |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- |
| Agent       | Telefon, separater Hörer, Geistanrufer als Vorschau/Fallback, Mundreaktion, Anrufsignal, Unterbrechungsknopf                     | 329,2 KiB | 4,12 MiB      |
| Archiv      | Aktenschrank, Aktenstapel, Regelbuchmotiv, Stempel, Papierstapel, herausfliegender Zettel mit Fragmenten, Siegelpins             | 348,7 KiB | 4,45 MiB      |
| Disposition | Maschinenkulisse, Hebelbank, Übergabehebel, Vorbereitungsknopf, Störungsleuchte, Analogregler mit separatem Zeiger, Maschinen-FX | 358,3 KiB | 4,27 MiB      |
| Gemeinsam   | Notizzettel, Belegrolle, Pflanze, Augen, Sirene, Annahmeknopf, gehörntes Schild und cyanfarbener Anrufrahmen                     | 308,5 KiB | 4,09 MiB      |

Die vorhandenen flächigen Arbeitsmaterialien bleiben die Schreibflächen für Antworten, Dossiers, Regeln und Bedienbeschriftungen. Besonders das breite, flache Buchmotiv ersetzt keine hohe Lesefläche; es steht im Regelbuchkopf. Motivgrafiken sind keine 9-Slice-Materialien. Texte, Zustände, Klickbereiche und DOM-Bedienelemente werden weiterhin separat gezeichnet.

Der neue Gauge-Zeiger dreht um seinen Nabenpunkt bei 50 % der Breite und 75 % der Höhe, nicht um die Bildmitte. Hörerreaktionen, Papierauswurf und Maschinen-FX berücksichtigen die vorhandene Einstellung für reduzierte Bewegung; Funken berücksichtigen zusätzlich reduzierte Blitze.

Zur Prüfung dienen `e2e/workspaces.spec.ts` mit allen drei Vorschauen, die Ein-Fall-Spielprüfung und der Pages-Build. `CAPTURE_UI=1` erzeugt zusätzlich Screenshots der Vorschauen. Die Prüfsummen der Quellen lassen sich im Quellordner mit `sha256sum --check SHA256SUMS.txt` kontrollieren.
