# Verifikation

Für die Testauswahl [docs/testing.md](docs/testing.md) verwenden.

- Prüfungen passend zur Änderung ausführen; bestandene unveränderte Prüfungen nicht wiederholen.
- Nach einem Fehler zunächst den betroffenen Test gezielt ausführen.
- `npm run check` prüft Lint, Unit-Tests, Content und Typen ohne Produktionsbundle.
- `npm run test:e2e` ist der kurze Browserstandard. Für Spielablaufänderungen zuerst `test:e2e:gameplay` verwenden; die vollständige Acht-Fälle-Schicht und das Drei-Tab-Tutorial in `test:e2e:extended` nur bei dafür relevanten Änderungen oder einer Abnahme ausführen.
- Browserläufe nacheinander starten, da sie Testserver-Ports und `test-results` teilen.
- Dokumentationsänderungen benötigen keine Spielschicht. Produktionsbuild und Pages-Prüfung sind bei Build-, Asset- oder Veröffentlichungsthemen sinnvoll.
