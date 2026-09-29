# Lobby-Illustration

Die Lobby integriert `hoellen-hotline-lobby-sprites.zip`. Der darin enthaltene Entwurf wurde an die aktuelle Lobby angepasst: `src/game/presentation/lobbyRoom.ts` setzt vorhandene Raum-, Requisiten- und Figurenbilder als separate Phaser-Objekte zusammen. `src/lobby-art.css` ergänzt die bestehende Gestaltung; die Startkarte behält ihre Papieroberfläche und die Einrichtung ihre Personaltafel.

Sechs Ebenen trennen Hintergrund, Stadt, Architektur, Figuren, Vordergrund und Logo. Lava und Wartesymbol bewegen sich langsam, Figuren und Seelen schweben leicht, Augen blinzeln. Die Mausparallaxe reagiert auch über den DOM-Bedienelementen; Touchbewegungen verschieben die Illustration nicht. Alle Listener werden beim Verlassen der Szene entfernt, die pro Spiel erzeugte Lavatextur wird wiederverwendet. Es sind keine neuen Bilddateien oder Abhängigkeiten nötig.

Die Systempräferenz und die Spieloption für reduzierte Bewegung setzen die Szene sofort auf ein ruhiges Standbild zurück. Beim Ausschalten laufen die Animationen wieder an, auch wenn die Lobby zunächst mit reduzierter Bewegung geöffnet wurde. Blitzreduktion unterbindet Blinzeln und Lichtpulse unabhängig von der übrigen Bewegung.

Auf dem Desktop sitzt die kompakte Startkarte unten. Im mobilen Hochformat stehen Illustration und Karte untereinander; im niedrigen Querformat erhält die Bedienung die verfügbare Höhe. Die aktive Lobby bleibt scrollbar, Textvergrößerung und Kontrastpalette gelten auch für die ergänzten Oberflächen.

`e2e/lobby-art.spec.ts` prüft den tatsächlichen Stillstand und Wiederanlauf des Canvas bei geänderten Präferenzen, einen erneuten Szeneneintritt sowie Bedienung und Platzangebot auf Desktop, Handy und im Querformat. `CAPTURE_UI=1` speichert die Ansichten im jeweiligen Testausgabeverzeichnis. Für die vollständige Testauswahl gilt [testing.md](testing.md).
