# Batch 0: Technischer Risikospike

Stand: 2026-09-23. Lokal im verfügbaren Chromium, drei Seiten in einem Browserkontext.

## Durchgeführt

- `e2e/webrtc-spike.spec.ts` erzeugt beim Host zwei unabhängige `RTCPeerConnection`s und geordnete DataChannels. Die Offer-/Answer-Daten werden erst nach `iceGatheringState === "complete"` übergeben. Beide Gäste antworten über die übertragenen SDP-Daten; die beiden Verbindungen öffnen sich.
- Die unkomprimierten Base64URL-Links auf `https://example.github.io/hoellen_hotline/` lagen in den lokalen Läufen bei 937 bis 941 Zeichen. Das sind keine garantierten Höchstlängen: zusätzliche STUN-/Netzwerkkandidaten, Browser und spätere Protokollfelder können die Länge deutlich erhöhen. Der Produktionscodec wird in Batch 4 komprimieren und Größen begrenzen.
- Nach Wechsel zu einem Gasttab wurden Nachrichten über beide DataChannels erfolgreich hin und zurück übertragen. Der Test prüft eine kurze Hintergrundphase; längere Inaktivität und Gerätedrosselung sind damit nicht abgedeckt.
- Der Repository-Basispfad wird zusätzlich durch `VITE_BASE=/hoellen_hotline/ npm run build` geprüft. Der Build erzeugt `index.html` mit relativen Asset-URLs unter diesem Basispfad.

## Offen für Abnahme des vollständigen Risikospikes

- Echte manuelle Linkübergabe zwischen getrennten Geräten und Netzwerken.
- Linklängen und Tab-Wiederaufnahme in den Zielbrowsern Chrome, Edge und Firefox. Edge ist hier nicht installiert; ein einzelner lokaler Chromium-Lauf ersetzt den Browsermix nicht.
- GitHub-Pages-URL nach Veröffentlichung im tatsächlichen Repository-Unterpfad öffnen.

Der Spike verwendet absichtlich Testcode statt der künftigen Lobby-UI. Er belegt Transportgrundlagen, nicht den fertigen Signalisierungsfluss.
