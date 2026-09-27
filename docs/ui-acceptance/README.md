# UI-Abnahme der drei Arbeitsplätze

Die Aufnahmen zeigen einen verbundenen Tutorialfall nach dem Annehmen des Anrufs. Im Archiv ist eine Akte geöffnet, in der Disposition ein Ziel gewählt. Die mobile Aufnahme zeigt zusätzlich die gestapelten DOM-Steuerelemente in voller Länge.

| Rolle     | 1280 × 720                                     | 1672 × 941                                     | 2560 × 1440                                     | 390 × 844                                   |
| --------- | ---------------------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Agent     | [Ansicht](screenshots/agent-1280x720.jpg)      | [Ansicht](screenshots/agent-1672x941.jpg)      | [Ansicht](screenshots/agent-2560x1440.jpg)      | [Mobil](screenshots/agent-390x844.jpg)      |
| Archivar  | [Ansicht](screenshots/archivist-1280x720.jpg)  | [Ansicht](screenshots/archivist-1672x941.jpg)  | [Ansicht](screenshots/archivist-2560x1440.jpg)  | [Mobil](screenshots/archivist-390x844.jpg)  |
| Disponent | [Ansicht](screenshots/dispatcher-1280x720.jpg) | [Ansicht](screenshots/dispatcher-1672x941.jpg) | [Ansicht](screenshots/dispatcher-2560x1440.jpg) | [Mobil](screenshots/dispatcher-390x844.jpg) |

## Visuelle Bewertung

| Kriterium             | Abnahmebefund                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Komposition           | Telefon und Seelenmonitor, Akten und Regelbuch sowie Maschine und Zielbank bilden drei verschiedene Silhouetten. Die Hauptaktion steht jeweils im Vordergrund.         |
| Warm-/Kalt-Kontrast   | Warme Höllenkulisse und Papierflächen stehen dunklen Metallgehäusen gegenüber. Cyan kennzeichnet den Seelenkanal.                                                      |
| Materialmix           | Metall, Holz, Bakelit, Papierstreifen und Karten sind in allen drei Rollen vorhanden.                                                                                  |
| Silhouettenlesbarkeit | Figuren, Telefon, Aktenschrank und Hebel bleiben bei den drei Desktopgrößen erkennbar. Mobil steht die semantische DOM-Bedienung unter der Illustration.               |
| Visuelle Dichte       | Requisiten sitzen an Rändern und zwischen den Arbeitsflächen. Texte stehen auf ruhigen, kontrastreichen Flächen.                                                       |
| Comedy-Reaktion       | Zustandsabhängige Reaktionen betreffen Hörer, Aktenauswurf und Stempel sowie Hebel, Störlampe und Rohrrauch. Die Aufnahmen zeigen jeweils nur einen statischen Moment. |

Screenshots neu erstellen:

```sh
CAPTURE_UI=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium npx playwright test e2e/modes.spec.ts --grep tutorial --workers=1
```

Die Abnahme verwendet keine Pixelgleichheit. Die Gameplay- und Accessibility-Prüfung erfolgt über die bestehenden Unit- und Playwright-Tests.

## Verifikation

- `npm run build`: erfolgreich
- `npm run lint`: erfolgreich
- `npm test`: 48 Tests erfolgreich
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/sbin/chromium npm run test:e2e`: 12 Tests erfolgreich, einschließlich Tutorial, Accessibility und privater Lobby mit acht Fällen
