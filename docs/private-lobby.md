# Private Link-Lobby

Ein Host erstellt in der Lobby für Gast 1 und Gast 2 je eine eigene Einladung. Jeder Gast öffnet seinen Offer-Link, prüft das sechsstellige Sitzungskürzel, erzeugt einen Answer-Link und sendet ihn dem Host. Der Host fügt jeden Answer im passenden Slot seines bestehenden Tabs ein. Ein geöffnetes Answer-Fragment zeigt nur eine Kopierhilfe; es kann keine laufende Host-Verbindung rekonstruieren.

Offer und Answer sind komprimierte JSON-Payloads im URL-Fragment. Vor und während der Dekompression greifen 32 KiB für den kodierten und 128 KiB für den dekodierten Inhalt. Der Host akzeptiert Antworten nur für die aktuelle Session, den aktuellen Slot und die aktuelle Nonce. Ein neuer Link ersetzt den alten Slot. Einmaligkeit gilt nur innerhalb der laufenden Lobby. Links sollen vertraulich geteilt werden.

Die Verbindung verwendet zwei getrennte WebRTC PeerConnections mit geordneten DataChannels. Ein Link erscheint erst nach vollständigem ICE-Gathering. Nach 15 Sekunden ohne Abschluss wird kein Link ausgegeben. Die anschließende Verbindung hat ein 20-Sekunden-Fenster; bei Fehlschlag kann der Host einen neuen Slot-Link erzeugen. Ohne TURN-Relay sind manche Netzwerke nicht direkt erreichbar.

`VITE_STUN_URL` setzt den STUN-Server; Standard ist `stun:stun.l.google.com:19302`. Ein leerer Wert deaktiviert STUN, etwa für lokale Tests. Die Links verwenden `import.meta.env.BASE_URL` und damit den konfigurierten Pages-Unterpfad. Der Playwright-Test verwendet absichtlich lokale ICE-Kandidaten.

Die Lobby zeigt Namen, Rolle, Verbindung, Ping und Ready. Jeder wählt selbst eine freie Rolle. Der Host kann erst mit drei verbundenen, eindeutigen Rollen und drei Ready-Zuständen starten. Beim Szenenwechsel schließt dieser Batch die Lobby-Verbindungen; das dauerhafte Spielprotokoll und Reconnect folgen in Batch 5. Öffentliche Raumsuche bleibt ein deaktivierter Adaptervertrag.
