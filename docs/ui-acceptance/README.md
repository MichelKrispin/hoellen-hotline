# UI-Abnahme der drei Arbeitsplätze

Die Aufnahmen zeigen den ersten Umbau nach `mockups/agent.png`, `mockups/archivist.png` und `mockups/dispatch.png` mit austauschbaren Placeholder-Sprites in einem verbundenen Tutorialfall nach dem Annehmen des Anrufs. Im Archiv ist eine Akte geöffnet und verifiziert, in der Disposition ein Ziel gewählt und der erste Regler bedient. Die mobile Aufnahme zeigt zusätzlich die gestapelten DOM-Steuerelemente in voller Länge.

| Rolle     | 1280 × 720                                     | 1672 × 941                                     | 2560 × 1440                                     | 390 × 844                                   |
| --------- | ---------------------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Agent     | [Ansicht](screenshots/agent-1280x720.jpg)      | [Ansicht](screenshots/agent-1672x941.jpg)      | [Ansicht](screenshots/agent-2560x1440.jpg)      | [Mobil](screenshots/agent-390x844.jpg)      |
| Archivar  | [Ansicht](screenshots/archivist-1280x720.jpg)  | [Ansicht](screenshots/archivist-1672x941.jpg)  | [Ansicht](screenshots/archivist-2560x1440.jpg)  | [Mobil](screenshots/archivist-390x844.jpg)  |
| Disponent | [Ansicht](screenshots/dispatcher-1280x720.jpg) | [Ansicht](screenshots/dispatcher-1672x941.jpg) | [Ansicht](screenshots/dispatcher-2560x1440.jpg) | [Mobil](screenshots/dispatcher-390x844.jpg) |

## Visuelle Bewertung

| Kriterium             | Abnahmebefund                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Komposition           | Agent: Telefon links, Gespräch mittig, Hinweise rechts. Archiv: Suche, Dossier, zweispaltiges Buch und Stempel. Disposition: 3×2-Reglerbank, Anforderungen, vertikale Zielbank und Hebel. |
| Warm-/Kalt-Kontrast   | Warme Höllenkulisse und Papierflächen stehen dunklen Metallgehäusen gegenüber. Cyan kennzeichnet den Seelenkanal.                                                                         |
| Materialmix           | Metall, Holz, Bakelit, Papierstreifen und Karten sind in allen drei Rollen vorhanden.                                                                                                     |
| Silhouettenlesbarkeit | Figuren, Telefon, Aktenschrank und Hebel bleiben bei den drei Desktopgrößen erkennbar. Mobil steht die semantische DOM-Bedienung unter der Illustration.                                  |
| Visuelle Dichte       | Requisiten sitzen an Rändern und zwischen den Arbeitsflächen. Texte stehen auf ruhigen, kontrastreichen Flächen.                                                                          |
| Comedy-Reaktion       | Zustandsabhängige Reaktionen betreffen Hörer, Aktenauswurf und Stempel sowie Hebel, Störlampe und Rohrrauch. Die Aufnahmen zeigen jeweils nur einen statischen Moment.                    |

Screenshots neu erstellen:

```sh
CAPTURE_UI=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium npm run test:e2e:extended -- e2e/modes.spec.ts --grep tutorial
```

Die Aufnahmen dokumentieren den Layout- und Sprite-Umbau; die detaillierte Illustration aus den Mockups ist noch offen. Der [Sprite-Katalog](../../src/assets/source/workspaces/README.md) beschreibt Austauschformate und 9-Slice-Ränder.

Die Abnahme verwendet keine Pixelgleichheit. Die Gameplay- und Accessibility-Prüfung erfolgt über die bestehenden Unit- und Playwright-Tests.

## Verifikation

- `npm run build`: erfolgreich
- `npm run lint`: erfolgreich
- `npm test`: 48 Tests erfolgreich
- Browser-Prüfungen: 12 Tests im vollständigen Lauf erfolgreich, einschließlich Sprite-Laden aller Rollen, Accessibility und privater Lobby mit acht Fällen. Der Tutorialtest mit Canvas-Klickflächen und Screenshot-Aufnahmen bestand anschließend in der gezielten Wiederholung. Damit sind alle 13 Prüfungen verifiziert.
