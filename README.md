# Höllen-Hotline

Kooperatives Drei-Personen-Spiel im Aufbau. Die Spielregeln stehen in `gameplay.md`, technische Anforderungen in `hoellen-hotline-spezifikation.md` und die Batches in `TODO.md`.

## Lokal starten

```sh
npm ci
npm run dev
```

Debug-Navigation: 1 Titel, 2 Lobby, 3 Agent, 4 Archivar, 5 Disponent, 6 Ergebnis, 7 Atlas-Prüfung. Alle drei Rollenpulte sind in einer verbundenen Partie bedienbar. Die Gestaltungsregeln stehen in [docs/art-bible.md](docs/art-bible.md), die Rollenbedienung in [docs/agent.md](docs/agent.md), [docs/archivist.md](docs/archivist.md) und [docs/dispatcher.md](docs/dispatcher.md).

Content-Pakete, Validierung und Hash-Kompatibilität sind in [docs/content.md](docs/content.md) beschrieben.

Die Headless-Simulation aus Batch 3 ist in [docs/simulation.md](docs/simulation.md) beschrieben.

Die private Link-Lobby aus Batch 4 ist in [docs/private-lobby.md](docs/private-lobby.md) beschrieben. Das autoritative Netzwerk und der manuelle Reconnect aus Batch 5 stehen in [docs/network.md](docs/network.md).

Asset-Build und Lizenzquellen stehen in [src/assets/source/README.md](src/assets/source/README.md) und [CONTENT_ASSET_LICENSES.md](CONTENT_ASSET_LICENSES.md). Audio-Busse und Barrierefreiheit sind in [docs/audio.md](docs/audio.md) und [docs/accessibility.md](docs/accessibility.md) beschrieben. Der Stand der Release-Abnahme steht in [docs/release-evidence.md](docs/release-evidence.md).

## Prüfen

```sh
npm run lint
npm test
npm run content:validate
npm run content:analyze
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium npm run test:e2e
VITE_BASE=/hoellen-hotline/ npm run build
```

Für `test:e2e` muss ein Playwright-kompatibles Chromium verfügbar sein. Ohne `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` verwendet Playwright seine eigene Browserinstallation.

`VITE_BASE` ist der Pages-Unterpfad mit führendem und abschließendem Schrägstrich. Der Standard ist `/`. CI prüft den Unterpfad sowie kurze Chromium- und Firefox-Flows und veröffentlicht erfolgreiche Pushes auf `main` über GitHub Pages. `npm run test:e2e` enthält zusätzlich das vollständige Drei-Tab-Tutorial und die Acht-Fälle-Schicht; diese ressourcenintensiven Läufe sind auf dem GitHub-Runner nicht Teil des Deploy-Gates.
