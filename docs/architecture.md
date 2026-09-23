# Architekturentscheidungen für Batch 0

- Die Designfläche misst 1920 × 1080 Pixel. Phaser skaliert sie mit `FIT` und zentriert sie. Die Randbereiche von 96 Pixeln horizontal und 72 Pixeln vertikal sind Safe Areas; interaktive Elemente liegen innerhalb dieser Grenzen.
- Phaser zeichnet Szenen, Rollenpulte, Knöpfe, Animationen und Statusleisten. DOM-Overlays sind für Textfelder, Clipboard-Flows und semantische Accessibility-Dialoge zuständig. Diese Trennung hält die eigentliche Spieloberfläche im Canvas und ermöglicht normale Texteingabe und Assistenztechnik.
- `Boot -> Title -> Lobby -> Game -> Results` nutzt ausschließlich Phasers In-Memory-Szenenwechsel. Debug-Tasten 1 bis 6 öffnen Titel, Lobby, die drei Rollenansichten und Ergebnis. Das URL-Fragment bleibt vollständig für Signalisierungslinks frei.
- Der Host hält `GameState`. `projectView` erzeugt je Rolle einen neuen `PlayerViewState`. Gastclients bekommen nur diese Projektion. Die normale Host-UI soll ebenfalls die Projektion nutzen; der Host kann technisch den kanonischen Zustand einsehen.
- `SessionId`, `ClientId`, `ConnectionId`, `ActionId` und `Nonce` werden über Web Crypto als unabhängige 128-Bit-Werte erzeugt. Das sechsstellige Sitzungskürzel ist allein für den menschlichen Abgleich und kein Geheimnis.
- Content-Schemas, Netzprotokoll und Simulation folgen in den dafür vorgesehenen Batches. Die aktuellen Verträge sind Ausgangspunkte, keine implementierte Netzwerk- oder Spiellogik.
