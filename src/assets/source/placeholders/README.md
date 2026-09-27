# Szenen-Sprites

Die 34 PNG-Dateien stammen aus `hoellen-hotline-sprites.zip` und ersetzen die einfachen, projektinternen SVG-Platzhalter. Sechs SVG-Dateien bleiben für besonders schmale Pultelemente und Beschriftungsrahmen im Einsatz, weil die detailreichen PNG-Motive dort nicht lesbar bleiben. Die Dateinamen sind die stabilen Texturschlüssel. Figurenporträts und Reaktionen liegen getrennt in `portraits/` und `reactions/`.

`src/assets/placeholders.ts` lädt die PNG-Dateien in der Boot-Szene unter `placeholder:<Dateiname>` und die schlichten Formen unter `placeholder:shape:<Dateiname>`. `art.ts`, die Rollenpulte und die Präsentation verwenden diese Schlüssel. Die vier `panel-*`-Dateien werden als 9-Slice mit 32 Pixel Rand verwendet; bei Höhen unter 160 Pixel kommen ihre SVG-Formen zum Einsatz. `pipe`, `chain`, `bridge` und `desk-wood` sind geschichtete Umgebungselemente. `gauge-needle`, `lever-arm`, `handset`, `spark` und `smoke` bleiben separate Texturen, damit Bewegung und Zustandswechsel erhalten bleiben.

`node tools/build-placeholder-sprites.mjs` legt nur fehlende SVG-Entwürfe an und überschreibt keine PNG-Dateien. Neue Namen müssen in `PlaceholderName` ergänzt werden. Mit `npm run build` und den Browser-Smoketests lässt sich prüfen, ob die Texturen geladen werden und Texte sowie Bedienfelder lesbar bleiben.
