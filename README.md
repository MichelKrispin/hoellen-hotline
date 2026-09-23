# Höllen-Hotline

Kooperatives Drei-Personen-Spiel im Aufbau. Die Spielregeln stehen in `gameplay.md`, technische Anforderungen in `hoellen-hotline-spezifikation.md` und die Batches in `TODO.md`.

## Lokal starten

```sh
npm ci
npm run dev
```

Debug-Navigation: 1 Titel, 2 Lobby, 3 Agent, 4 Archivar, 5 Disponent, 6 Ergebnis. Die Rollenpulte sind visuelle Stilproben; Spielmechanik folgt in späteren Batches. Die Gestaltungsregeln stehen in [docs/art-bible.md](docs/art-bible.md).

Content-Pakete, Validierung und Hash-Kompatibilität sind in [docs/content.md](docs/content.md) beschrieben.

Die Headless-Simulation aus Batch 3 ist in [docs/simulation.md](docs/simulation.md) beschrieben.

## Prüfen

```sh
npm run lint
npm test
npm run content:validate
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium npm run test:e2e
VITE_BASE=/hoellen_hotline/ npm run build
```

Für `test:e2e` muss ein Playwright-kompatibles Chromium verfügbar sein. Ohne `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` verwendet Playwright seine eigene Browserinstallation.

`VITE_BASE` ist der Pages-Unterpfad mit führendem und abschließendem Schrägstrich. Der Standard ist `/`. Die aktuelle CI erstellt ein Pages-Artefakt; die Veröffentlichung ist für den Release-Batch vorgesehen.
