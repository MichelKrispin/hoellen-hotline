# Austauschbare Platzhalter-Sprites

Diese SVG-Dateien sind bewusst einfache, projektinterne Platzhalter für die bislang prozedural gezeichnete Umgebung. Jede Datei ist eine eigenständige Textur mit festem `viewBox` und stabilem Namen. Figurenporträts und Reaktionen aus dem bereitgestellten Mockup-Paket liegen getrennt in `portraits/` und `reactions/`.

`src/assets/placeholders.ts` lädt alle Dateien in der Boot-Szene unter `placeholder:<Dateiname>`; `art.ts`, die Rollenpulte und die Präsentation verwenden diese Schlüssel. Eine spätere Illustration kann eine einzelne SVG-Datei bei gleichem `viewBox` und transparentem Hintergrund ersetzen, ohne Spielregeln oder Asset-IDs zu ändern. Die vier `panel-*`-Dateien werden als 9-Slice mit 32 Pixel Rand verwendet; die Mitte darf wiederholt oder gestreckt werden. `pipe`, `chain`, `bridge` und `desk-wood` sind wiederholbare bzw. geschichtete Umgebungselemente. `gauge-needle`, `lever-arm`, `handset`, `spark` und `smoke` bleiben separate Texturen, damit Bewegung und Zustandswechsel erhalten bleiben.

`node tools/build-placeholder-sprites.mjs` legt nur fehlende Platzhalter an und überschreibt keine ersetzten Dateien. Neue Namen müssen in `PlaceholderName` ergänzt werden. Mit `npm run build` und den Browser-Smoketests lässt sich prüfen, ob die Austauschtextur geladen wird und Texte sowie Bedienfelder lesbar bleiben.
