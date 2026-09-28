# Lokale Prüfungen

Tests nach der Änderung auswählen. Ein bestandener Lauf braucht keine Wiederholung, solange weder der geprüfte Code noch seine Testkonfiguration geändert wurde. Nach einem Fehler zunächst nur den betroffenen Test wiederholen. Die langen Browserläufe sind gezielte Integrationsprüfungen, kein Pflichtprogramm nach jeder Änderung.

## Schneller Entwicklungsablauf

`npm run check` prüft Formatierung/Lint, alle Unit-Tests, Content-Validierung und TypeScript ohne Produktionsbundle. Während der Arbeit hält `npm run test:watch` die Unit-Tests im Watch-Modus bereit. Für einzelne Änderungen lassen sich Testdateien oder Testnamen auswählen:

```sh
npm test -- src/net/gameNetwork.test.ts
npm test -- src/game/state/simulation.test.ts -t 'tutorial'
npm run test:e2e -- e2e/workspaces.spec.ts
npm run test:e2e -- e2e/navigation.spec.ts -g 'phone'
```

Vitest findet die Unit-Tests über `vitest.config.ts`. Der bisherige feste CLI-Filter `src` wurde entfernt, weil er zusätzlich angegebene Testdateien wieder auf alle Tests unter `src` erweitert hat. Eine konkrete Dateiangabe wählt jetzt tatsächlich nur diese Datei aus.

Alle 48 Unit-Tests bleiben im Standard: lokal wurden 1,3–1,4 Sekunden gemessen, einschließlich der 10.000 generierten Fälle, der Acht-Fälle-Schicht, des vollständigen Tutorials und der simulierten Netzwerkkanäle. Eine kleinere Stichprobe würde hier kaum Entwicklungszeit sparen, aber Abdeckung verlieren. `content:analyze` prüft zusätzlich 6.744 Kombinationen und 1.000 Fälle; dieser Lauf bleibt sinnvoll bei Änderungen an Regeln, Generator und Content.

Beim Umbau am 28.09.2026 bestanden der kurze Browserstandard mit neun Tests in rund 52 Sekunden, der Ein-Fall-Spielablauf in 51,8 Sekunden, Ein-Link-Beitritt mit Reconnect in 28,8 Sekunden und die Netzwerkprüfung in 29,3 Sekunden. Die reine Transportprobe sank dabei von 6,1 Sekunden mit drei Spielseiten auf 0,8 Sekunden mit minimalen Seiten. Laufzeiten hängen von Browser, Last und Rechner ab. Die unveränderten sieben weiteren Fallzustellungen und das Tutorial müssen für diese Testauswahländerung nicht erneut minutenlang durchlaufen werden; sie bleiben gezielt auswählbar und wurden über die Testauflistung kontrolliert.

## Browserprüfungen nach Bedarf

Bei einer vorhandenen Systeminstallation einmal `export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium` setzen. Ohne die Variable nutzt Playwright seine installierte Chromium-Version. Die Firefox-Prüfung benötigt zusätzlich Playwright-Firefox.

| Änderung / Anlass                                                            | Prüfung                                                                            | Umfang                                                                                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Allgemeine UI, Navigation, Optionen, Assets                                  | `npm run test:e2e` oder die betreffende Datei                                      | Neun kurze Tests; keine Drei-Tab-Spielschicht.                                                                |
| Agent, Archiv, Disposition, Freigaben, manueller Reconnect                   | `npm run test:e2e:gameplay`                                                        | Drei Rollen, ein vollständiger Fall, Tastaturbedienung, Reconnect und Übergang zum zweiten Fall.              |
| Automatische Einladung, PeerJS, automatischer Reconnect                      | `npm run test:e2e:one-link`                                                        | Ein lokaler PeerServer, zwei Gäste, Spielstart und Reconnect; kein öffentlicher Dienst.                       |
| ICE, WebRTC, STUN-Ausfall                                                    | `npm run test:e2e:network`                                                         | Echter STUN-Ausfall mit überprüfter ICE-Konfiguration und separate Transportprobe.                            |
| Browserkompatibilität, Canvas, transportbezogene Änderungen                  | `npm run test:e2e:firefox`                                                         | Acht kurze Firefox-/Mischbrowserprüfungen.                                                                    |
| Tutorial, vollständige Schicht, Abschlussakte; vor einer Spielablauf-Abnahme | `npm run test:e2e:extended`                                                        | Drei-Tab-Tutorial und vollständige Acht-Fälle-Schicht. Historisch dauerte die Schicht allein 4,4–6,7 Minuten. |
| Produktionsassets, Basispfad, Veröffentlichung                               | `VITE_BASE=/hoellen-hotline/ npm run build`, anschließend `npm run test:e2e:pages` | Gebauter Pages-Unterpfad, Assets, rechtliche Seiten und Einladungslinks.                                      |
| Nur Dokumentation                                                            | Formatprüfung der geänderten Dateien                                               | Kein Browserlauf erforderlich.                                                                                |

`npm run test:e2e` ist bewusst kein Volltest. Die Tags `@gameplay`, `@extended`, `@transport` und `@stun-failure` werden über die passenden Skripte ausgewählt. Auch die Firefox-Konfiguration beschränkt einen Aufruf ohne Dateiangabe auf die kurze Browsermatrix. Der lange Tutorialtest prüft Stationsfragen, mobile Bedienelemente und Canvas-Klickflächen; den Tutorialabschluss prüft die Simulation.

Die Tests nutzen einen eigenen manuellen Vite-Server auf Port 5174 und einen Server für den automatischen Beitritt auf Port 5175; die normale Entwicklung auf 5173 kann weiterlaufen. Der lokale PeerServer nutzt Port 9000, Pages-Preview Port 4173. Testserver werden frisch mit festen Einstellungen gestartet und nicht wiederverwendet. Browserläufe nacheinander ausführen: Sie teilen Ports und das Ausgabeverzeichnis `test-results`.

Screenshots der Arbeitsplatz-Vorschauen entstehen nur bei `CAPTURE_UI=1`. Die eigentlichen Lade- und Fehlerprüfungen laufen immer. Die Browser-Transportprobe verwendet eine minimale Seite und echte WebRTC-Kanäle, ohne drei Spielrenderer zu laden. Ein kleineres Zeitlimit macht erfolgreiche Tests nicht schneller; deshalb bleiben die großzügigen Limits für die gezielten Langläufe erhalten. Lokal gibt es keine automatischen Wiederholungen.

Für die Diagnose eines konkreten fehlgeschlagenen Tests kann einmalig eine Trace aufgezeichnet werden:

```sh
npm run test:e2e:gameplay -- --trace retain-on-failure
```

## CI

CI führt Unit-Tests, Lint, Content-Validierung, Produktionsbuild, Pages, den kurzen Browserstandard, automatischen Ein-Link-Beitritt, Netzwerkfehler und die kurze Firefox-Matrix aus. Die Ein-Link-Prüfung ist damit ebenfalls im Deploy-Gate enthalten. Testnamen müssen nicht mehr in einer Ausschlussliste gepflegt werden. Der STUN-Test läuft genau einmal mit der Ausfalleinstellung; der Transport wird zusätzlich in Firefox geprüft. Nur die Firefox-Matrix behält in CI die bisherigen maximal zwei Wiederholungen bei Fehlern; lokal bleiben Wiederholungen ausgeschaltet. Die langen Drei-Tab-Spielprüfungen bleiben außerhalb des Deploy-Gates, weil sie auf dem gehosteten Runner unter Last instabil waren.
