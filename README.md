# Höllen-Hotline

Kooperatives Drei-Personen-Spiel im Aufbau. Die Spielregeln stehen in `gameplay.md`, technische Anforderungen in `hoellen-hotline-spezifikation.md` und die Batches in `TODO.md`.

Veröffentlichte Version: [Höllen-Hotline auf GitHub Pages](https://michelkrispin.github.io/hoellen-hotline/).

Der Host teilt einen Einladungslink mit beiden Gästen; die Verbindung wird über den öffentlichen PeerJS-Signalisierungsdienst automatisch aufgebaut. Falls dieser nicht erreichbar ist, kann der Host in der Lobby „Manuelle Verbindung (Fallback)“ öffnen. Spielzustände werden weiter direkt zwischen den Browsern ausgetauscht.

## Lokal starten

```sh
npm ci
npm run dev
```

Debug-Navigation: Mit `D` ein- und ausschalten; danach 1 Titel, 2 Lobby, 3 Agent, 4 Archivar, 5 Disponent, 6 Ergebnis, 7 Atlas-Prüfung. Alle drei Rollenpulte sind in einer verbundenen Partie bedienbar. Die Gestaltungsregeln stehen in [docs/art-bible.md](docs/art-bible.md), die Rollenbedienung in [docs/agent.md](docs/agent.md), [docs/archivist.md](docs/archivist.md) und [docs/dispatcher.md](docs/dispatcher.md).

### Tutorial zu dritt spielen

Der Host öffnet die Lobby, wählt **Tutorial · Übungsfall** und verbindet zwei Gäste per Einladungslink oder manuellem Offer/Answer-Verfahren. Jede Person wählt eine andere Rolle und meldet sich bereit. Nach **Schicht starten** beantwortet jeder die Frage an seinem Pult. Sobald alle drei Stationen abgeschlossen sind, beginnt der gemeinsame Übungsfall. Die offene Tutorialanzeige erklärt für jede Rolle den nächsten Schritt und zeigt Tags, Pins, Zielwahl und Freigaben. Der Fall endet nach der Zustellung mit einer gemeinsamen Abschlussakte. Die Druckwerte können den Übungsfall nicht beenden.

Content-Pakete, Validierung und Hash-Kompatibilität sind in [docs/content.md](docs/content.md) beschrieben.

Die Headless-Simulation aus Batch 3 ist in [docs/simulation.md](docs/simulation.md) beschrieben.

Die private Link-Lobby aus Batch 4 ist in [docs/private-lobby.md](docs/private-lobby.md) beschrieben. Das autoritative Netzwerk und der manuelle Reconnect aus Batch 5 stehen in [docs/network.md](docs/network.md).

Asset-Build und Lizenzquellen stehen in [src/assets/source/README.md](src/assets/source/README.md) und [CONTENT_ASSET_LICENSES.md](CONTENT_ASSET_LICENSES.md). Audio-Busse und Barrierefreiheit sind in [docs/audio.md](docs/audio.md) und [docs/accessibility.md](docs/accessibility.md) beschrieben. Der Stand der Release-Abnahme steht in [docs/release-evidence.md](docs/release-evidence.md).

## Prüfen

```sh
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium npm run test:e2e
```

Für `test:e2e` muss ein Playwright-kompatibles Chromium verfügbar sein. Ohne `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` verwendet Playwright seine eigene Browserinstallation.

`npm run check` prüft Lint, Unit-Tests, Content und Typen. `npm run test:e2e` führt neun kurze Browserprüfungen aus. Für Spielablaufänderungen gibt es `test:e2e:gameplay` mit einem Fall und Reconnect; `test:e2e:extended` enthält das Drei-Tab-Tutorial und die vollständige Acht-Fälle-Schicht. Weitere gezielte Skripte und die Auswahl nach Änderungsart stehen in [docs/testing.md](docs/testing.md). Während der Entwicklung ist `npm run test:watch` verfügbar.

`VITE_BASE` ist der Pages-Unterpfad mit führendem und abschließendem Schrägstrich. Der Standard ist `/`. Für den Veröffentlichungstest zuerst `VITE_BASE=/hoellen-hotline/ npm run build`, danach `npm run test:e2e:pages` ausführen. CI prüft den Unterpfad, kurze Chromium- und Firefox-Flows, Ein-Link-Beitritt und Netzwerkfehler und veröffentlicht erfolgreiche Pushes auf `main` über GitHub Pages. Die langen Drei-Tab-Spielprüfungen sind auf dem GitHub-Runner nicht Teil des Deploy-Gates. Die Simulation prüft den Tutorialfall bis zur Abschlussakte.
