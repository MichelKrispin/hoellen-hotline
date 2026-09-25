# Höllen-Hotline – Umsetzungsplan

Stand: 2026-09-25

Dieses Dokument zerlegt die Entwicklung in einzeln abnehmbare Batches. Jeder Batch soll einen testbaren, spielbaren oder sichtbar überprüfbaren Zwischenstand erzeugen. `gameplay.md` ist die fachliche Quelle für Regeln und Modi; `hoellen-hotline-spezifikation.md` bleibt die technische Produktgrundlage.

Der Plan ist nicht normativ: Er darf Anforderungen nur zerlegen, nicht still verändern oder ergänzen. Bei Abweichungen werden zuerst Spezifikation bzw. Gameplay-Dokument und danach die betroffenen Batches gemeinsam aktualisiert.

## Leitentscheidungen

- Das Spiel ist für exakt drei aktive Spieler ausgelegt: Agent, Archivar und Disponent.
- Jeder Spieler sieht primär sein eigenes Rollenpult. Fremde Bedienoptionen und geheime Informationen werden nicht übertragen oder angezeigt.
- Ein schmaler gemeinsamer Statusbereich zeigt nur absichtlich geteilte Informationen: Queue, Schichtzeit, Teamstress, Fall-ID, Freigabestatus und grobe Aktivität der Kollegen.
- Die Mockups sind Referenz für Stimmung, Dichte, Materialität, Figuren, Farbwelt und visuelle Gags. Sie sind kein pixelgenaues Layout für alle drei Rollen auf einem Bildschirm.
- Der Host simuliert autoritativ. Clients senden validierbare Absichten, keine Zustände.
- Der Host ist Teil des Vertrauensmodells: Seine normale UI ist rollengefiltert, technisch kann er den kanonischen Zustand jedoch einsehen und manipulieren. Schutz gegen einen böswilligen Host ist kein MVP-Ziel.
- Inhalte, Kampagnen und Maschinenlayouts sind datengetrieben. Spielregeln dürfen nicht hart an einzelne Fälle oder Illustrationen gekoppelt sein.
- Visuelles Feedback wird zusammen mit jeder Mechanik gebaut, nicht erst am Projektende.
- Der MVP bleibt vollständig statisch auf GitHub Pages. Privates Matchmaking erfolgt über Offer-/Answer-Links; öffentliches Zufalls-Matchmaking benötigt später einen optionalen Signalisierungsdienst.

## Zielarchitektur

```text
src/
  app/                 # Bootstrap, Routing, Einstellungen, Fehlergrenzen
  game/
    scenes/            # Boot, Titel, Lobby, Rollenpulte, Ergebnis
    core/              # Tick, Uhr, PRNG, IDs, Events
    state/             # GameState, Reducer, Commands, Selectors
    cases/             # Fallgenerator, Auflösung, Bewertung
    rules/             # Regelprüfung und Konfliktauflösung
    roles/
      agent/
      archivist/
      dispatcher/
    campaign/          # Kampagnenlauf, Freischaltungen innerhalb eines Laufs
    modes/             # campaign, freePlay, tutorial
    presentation/      # gemeinsame FX, Reaktionen, Kamerawackeln
  content/
    schemas/           # Zod-Schemas und Content-Versionierung
    core/              # Basiskampagne und gemeinsame Kataloge
    campaigns/<id>/    # Manifest, Kapitel, Fälle, Regeln, Assets
  net/                 # WebRTC, Codec, Protokoll, Reconnect
  ui/                  # wiederverwendbare Phaser-/DOM-Komponenten
  assets/
    source/            # nicht zur Laufzeit geladene Quelldateien
    generated/         # gepackte Atlanten und optimierte Dateien
  audio/
  tests/
tools/                 # Validierung und Asset-Pipeline
public/
```

Abhängigkeitsrichtung: `content -> schemas`, `modes/roles/cases -> core/state`, `scenes -> game modules`, `net -> protocol/state contracts`. Content darf keine Szenen importieren; Rollenmodule dürfen einander nicht direkt mutieren.

## Qualitätsregeln für jeden Batch

- TypeScript `strict`, kein ungeprüftes `any`.
- Alle Netzwerkdaten und Content-Dateien werden an der Grenze schema-validiert.
- Neue Mechanik enthält Logiktest, Fehlerzustand und sicht-/hörbares Feedback.
- UI bleibt bei 16:9 von 1280×720 bis 2560×1440 lesbar; 1672×941 dient als Referenzgröße.
- Keine Kerninteraktion hängt ausschließlich von Farbe oder Audio ab.
- Assets werden über stabile IDs angesprochen, nicht über Dateipfade in Spiellogik.
- Ab Einrichtung der Skripte in Batch 0 endet jeder Batch mit nicht-interaktiven Befehlen für Lint, Unit-Tests (`vitest run` hinter `npm test`), Content-Validierung (sobald vorhanden), `npm run build` und dem relevanten Playwright-Smoke-Test (sobald vorhanden).

## Batch 0 – Projektfundament und Entscheidungen

Ziel: reproduzierbares, leeres Spiel mit verbindlichen Verträgen.

- [x] Vite, TypeScript, Phaser 3, Vitest, Playwright und ESLint/Formatter einrichten.
- [x] `vite.config.ts` mit konfigurierbarem GitHub-Pages-`base` anlegen.
- [x] Szenenfolge `Boot -> Title -> Lobby -> Game -> Results` als In-Memory-Navigation ohne Hash-Router bauen; das URL-Fragment bleibt der Signalisierung vorbehalten.
- [x] Virtuelle Auflösung und Scale-Strategie festlegen: 1920×1080 Designfläche, `FIT`, zentriert, Safe Areas.
- [x] Zuständigkeit von Phaser und DOM dokumentieren: Spielpulte in Phaser; Textfelder, Clipboard und Accessibility-Dialoge im DOM.
- [x] zentrale Design-Tokens für Farben, Abstände, Typografie, Bewegung und Tiefenebenen anlegen.
- [x] `GameState`, `PlayerViewState`, `ClientAction`, `DomainEvent` und IDs als erste Verträge definieren.
- [x] interne 128-Bit-Session-ID vom sechsstelligen, nicht sicherheitsrelevanten Sitzungskürzel trennen; Nonces, Client- und Action-IDs kryptografisch zufällig erzeugen.
- [x] CI für Install, Lint, Unit-Test, Build und Pages-Artefakt anlegen.
- [x] Content- und Asset-Lizenzdatei vorbereiten.
- [ ] technischen Risikospike durchführen: je ein echter Host und zwei Gäste per manueller Non-Trickle-Offer/Answer-Kette, GitHub-Pages-Basispfad, typische Linklängen in den Zielbrowsern und Wiederaufnahme nach Hintergrundtab dokumentieren.

Abnahme:

- Titel, Lobby, drei verschiedenfarbige Rollen-Platzhalter und Ergebnisbild sind per Debug-Navigation erreichbar.
- Produktionsbuild funktioniert mit Root- und Repository-Unterpfad.
- `PlayerViewState` enthält nachweislich nur Daten, die eine Rolle sehen darf.

## Batch 1 – Art Bible und visuelles Gerüst

Ziel: Der Look ist früh verbindlich und bereits ohne Texte als Höllenbüro erkennbar.

- [x] Aus beiden Mockups eine interne Art Bible ableiten: Silhouetten, Materialien, Licht, Konturen, Farbkontraste und Comedy-Prinzipien.
- [x] Farbrollen definieren: glühendes Rot/Orange für Gefahr, kaltes Seelen-Cyan, Agent-Rot, Archiv-Violett, Dispatcher-Bernstein sowie Statusfarben mit Symbolunterstützung.
- [x] UI-Materialien als 9-Slice-Sets planen: geschwärztes Metall, schiefes Holz, vergilbtes Papier, Neonröhre, Bakelit.
- [x] gemeinsame Kontrollraum-Kulisse in Parallax-Ebenen zerlegen: Hintergrundhölle, Brücken/Silhouetten, Rohre/Ketten, Pult, Vordergrund-Requisiten.
- [x] pro Rolle eine eigene Bildkomposition als Wireframe erstellen; nur das eigene Pult ist interaktiv.
- [x] gemeinsame obere Statusleiste und reduzierte Kollegenanzeigen gestalten.
- [x] UI-Zoom, Tooltip-Stil, Fokusrahmen, reduzierte Bewegung und Kontrastmodus definieren.
- [x] erste Stilprobe im Spiel bauen: Pult-Rahmen, Papierkarte, Neonknopf, Druckanzeige und eine Figur mit Idle-Animation.

Abnahme:

- Screenshot jeder Rolle ähnelt in Material, Licht, schiefen Formen und visueller Dichte den Referenzen, ohne das Dreifach-Pult zu kopieren.
- Entfernt man alle Labels, bleiben Rolle, Höllenumgebung und wichtigste Bedienelemente an Silhouette/Farbe erkennbar.
- Der gemeinsame Statusbereich verrät keine fremden Antworten, Regeln oder exakten Maschineneinstellungen.

Konkrete Übertragung der Mockups:

- Titel: breite Ensemble-Komposition mit glühendem Logoschild, Agent links am Telefon, Archivar im Papierberg, Disponent rechts an der Maschine und einer tief gestaffelten Höllenstadt. Menübuttons liegen als echte UI über der Illustration; zufällige bzw. fehlerhafte Schrift aus dem Referenzbild wird nicht in Sprites eingebrannt.
- Agentenpult: Figur und übergroßes Telefon rahmen die Dialogfläche; kaltes Seelen-Cyan trennt den Anrufer klar vom warmen Arbeitsplatz. Queue und veröffentlichte Hinweise bleiben sichtbar, Archivsuche und Maschinenhebel nicht.
- Archivpult: Aktenschrank und Regelbuch bilden die Hauptsilhouetten, Karten liegen physisch übereinander, Stempel sitzen als große Werkzeuge am unteren Rand. Der Anrufer erscheint nur über geteilte Tags/Pins.
- Disponentenpult: Figur, Zielbank und wuchtige Hebelmaschine dominieren. Neonfarben werden mit Zielsymbolen kombiniert; exakte Regeln und Dialogantworten fehlen.
- Gemeinsamer Raum: dieselben Rohre, Ketten, Warnlampen, Hintergrunddämonen und Druckreaktionen verbinden die drei Screens. Der Unterschied zwischen den Rollenansichten wirkt wie der Blick auf einen anderen Arbeitsplatz desselben Raums, nicht wie der Wechsel zu einer fremden Web-App-Seite.
- Screenshot-Abgleich je Meilenstein: Komposition, Warm/Kalt-Kontrast, Materialmix, Silhouettenlesbarkeit, visuelle Dichte und Comedy-Reaktion werden separat bewertet. Pixelgleichheit ist kein Ziel.

## Batch 2 – Content-Schemas und Modulgrenzen

Ziel: Neue Kampagnen können als Content-Paket ergänzt werden.

- [x] versionierte Zod-Schemas für `CampaignManifest`, `Chapter`, `Scenario`, `CaseArchetype`, `Complaint`, `LifeTag`, `RuleClause`, `Exception`, `Destination`, `MachineLayout`, `Incident`, `DialogueTree` und `Reaction` definieren.
- [x] stabile, namespace-fähige IDs einführen, z. B. `core.destination.wrath` und `campaign.audit.rule.ink-red`.
- [x] Referenzprüfung, Duplikatprüfung, unerreichbare Dialogknoten und ungültige Zielbedingungen validieren.
- [x] Content Registry mit expliziter Lade-Reihenfolge und Konfliktfehlern implementieren.
- [x] Trennung von Daten und Code erzwingen: Bedingungen über begrenzte deklarative Prädikate statt frei ausführbarem Skript.
- [x] Content-Version und Save-/Replay-Kompatibilität festlegen; Gameplay-Hash über versionierte kanonische Serialisierung bilden, sodass Dateireihenfolge, Whitespace und rein kosmetische Assets ihn nicht unbeabsichtigt ändern.
- [x] CLI `content:validate` und kleine Fixture-Kampagne anlegen.
- [x] Übersetzbare Textschlüssel von Gameplay-IDs trennen.

Abnahme:

- Eine zweite Mini-Kampagne kann ohne Änderung an Szenen, Reducer oder Rollenmodulen registriert werden.
- Fehlerhafte Referenzen und unlösbare Beispielszenarien brechen CI mit verständlicher Meldung ab.
- Content darf weder JavaScript ausführen noch Netzwerkzugriff auslösen.
- Identischer validierter Gameplay-Content ergibt auf den unterstützten Plattformen denselben Hash; jede relevante Testmutation ändert ihn.

## Batch 3 – Deterministische Simulation

Ziel: Eine komplette Schicht kann headless simuliert werden.

- [x] 128-Bit-Seed, versionierte Normalisierung manueller Seed-Eingaben und deterministischen PRNG mit vollständig serialisierbarem Zustand implementieren.
- [x] PRNG-Algorithmus, Simulationsversion und festen ganzzahligen Tick festschreiben; Vollreplays enthalten Startkonfiguration, Seed, Versionen und Content-Hash, Snapshots/optionale Checkpoints zusätzlich den jeweils aktuellen PRNG-Zustand.
- [x] reinen Reducer und Commands für Lobby, Schicht, Fälle, Regeln, Maschine, Pause und Ergebnis bauen; monotone Netzwerk-Timeouts bleiben außerhalb des kanonischen Zustands und werden nur als geordnete Systemereignisse eingespeist.
- [x] Host-Tick und monotone Schichtuhr definieren; Timer, Cooldowns und Druckänderungen auf feste Ticks abbilden, Client-Uhren sind nur Darstellung.
- [x] angenommene Aktionen und zustandswirksame externe Systemereignisse am Host eindeutig nach Tick und monotoner Ordnungsnummer protokollieren; im deterministischen Kern weder Wanduhr noch unbeständige Objektiteration oder ungeklärte Gleitkommaarithmetik verwenden.
- [x] Fallzustandsautomat implementieren: `queued -> active -> investigating -> approved -> routing -> resolved` sowie Abbruchzustände.
- [x] Regel-Engine mit Priorität, Ausnahme, Konflikt und nachvollziehbarer Begründung bauen.
- [x] Generator so einschränken, dass mindestens ein gültiges Ziel existiert.
- [x] Druckwerte, Eskalationsstufen, Fehlergrade und Schichtende implementieren.
- [x] Domain-Events für Präsentation emittieren, z. B. `STAMP_APPLIED`, `CALLER_ANGERED`, `ROUTE_FAILED`.

Abnahme:

- Gleicher Seed, gleiche Startkonfiguration, PRNG-/Simulationsversion, Content-Hash und dasselbe nach Host-Tick und Ordnungsnummer sortierte Eingabelog erzeugen einschließlich Timer-/Cooldown- und Verbindungsabbruchereignissen dieselbe kanonisch serialisierte Simulation; reale Zeitstempel und kosmetische Events werden nicht verglichen.
- 10.000 generierte Fälle besitzen mindestens eine regelkonforme Lösung.
- Falsche Rolle, veraltete Fall-ID, abgelaufener Cooldown und doppelter Commit werden abgewiesen.

## Batch 4 – Private Link-Lobby und Matchmaking-Flow

Ziel: Drei Browser gelangen verständlich und ohne Backend in dieselbe Lobby.

- [x] Offer-/Answer-Codec mit Kompression, Base64URL und URL-Fragment implementieren.
- [x] Links aus der konfigurierten Vite-Basis ohne nicht deployte Unterroute erzeugen.
- [x] Non-Trickle-ICE inklusive Timeout bauen; bei Timeout keinen unvollständigen Link ausgeben, sondern einen verständlichen neuen Versuch anbieten.
- [x] Host verwaltet zwei getrennte Gastslots und zwei `RTCPeerConnection`s.
- [x] Einladungs- und Antwortlinks je Slot kopier-/einfügbar machen; Answers werden in die bestehende Host-Lobby importiert und nicht durch Navigation geöffnet.
- [x] Offer-Fragment nach erfolgreicher Übernahme sicher aus der Adresszeile entfernen; bei versehentlich geöffneten Answer-Links das Kopieren und die Rückkehr zum bestehenden Host-Tab ermöglichen, bevor das Fragment entfernt wird.
- [x] Clipboard-Fehler behandeln und immer markierbare Felder für manuelles Kopieren/Einfügen bereitstellen.
- [x] `HELLO/WELCOME`, Protokollversion, Session-ID, einmalige Nonce, Peer-Slot und gastseitig neu erzeugte `connectionId` prüfen; verbrauchte oder ersetzte Payloads innerhalb der laufenden Lobby gegen Wiederverwendung sperren und keine global garantierte Einmaligkeit vortäuschen.
- [x] harte Grenzen vor und nach Dekompression sowie verständliche Fehler für zu große Linkdaten implementieren.
- [x] Rollenwahl nach dem Prinzip „freie Rolle selbst wählen“ und Ready-Check implementieren.
- [x] Ping, Verbindungsqualität und „Verbindung testen“ anzeigen.
- [x] klare Erklärung für gescheiterte direkte Verbindung ohne TURN anbieten.
- [x] optionale Room-Service-Schnittstelle nur als deaktivierten Adaptervertrag definieren; keine öffentliche Suche im MVP vortäuschen.

Abnahme:

- Drei echte Browser verbinden sich ausschließlich per ausgetauschten Links.
- Start ist nur mit drei verbundenen, eindeutigen Rollen und drei Ready-Zuständen möglich.
- Manipulierte, zu große, fremde oder veraltete Payloads werden sicher abgewiesen.
- Import eines Answer-Links lässt die laufenden Host-Verbindungen und beide Slots intakt.

## Batch 5 – Autoritatives Netzwerk und Reconnect

Ziel: Host und zwei Gäste teilen einen konsistenten, rollengefilterten Zustand.

- [x] Envelope-Schemas, verbindungsspezifische Sequenznummern, Größenlimit, Dekompressionslimit und Rate-Limits umsetzen.
- [x] `ACTION`, `ACTION_REJECTED`, `STATE_PATCH`, `STATE_SNAPSHOT`, `SNAPSHOT_REQUEST`, `PING/PONG`, `PAUSE_STATE`, `GAME_OVER` implementieren.
- [x] hostseitige Rollenzuordnung bei jeder Aktion prüfen.
- [x] lokale Aktionen des Hostspielers durch denselben Command-Validator wie Gastaktionen führen.
- [x] rollenspezifische Projektionen aus kanonischem Hostzustand erzeugen.
- [x] Seed, PRNG-Zustand und Musterlösung bis zur Ergebnisphase aus allen Gastprojektionen und Startnachrichten ausschließen.
- [x] sicherstellen, dass geheime Felder nie in Snapshots oder Devtool-lesbaren Stores der Gäste landen; die unvermeidbare Einsichtsmöglichkeit des Hosts dokumentieren.
- [x] `connectionId`, sitzungsweit eindeutige `actionId`, `baseRevision` und `revision` umsetzen; Reconnects erhalten neue Connection-IDs, Lücken fordern einen Snapshot an und die Action-ID-Historie verhindert doppelte Anwendung über Verbindungswechsel hinweg.
- [x] Snapshot-Hash, geordnete Patch-Anwendung und `bufferedAmount`-Backpressure implementieren; rollengefilterte Snapshots bleiben unter dem 64-KiB-Envelopelimit.
- [x] Disconnect pausiert die Partie für höchstens 60 Sekunden.
- [x] manuellen Reconnect mit neuem Offer und vollständigem Snapshot bauen.
- [x] Host-Abbruch, Gast-Abbruch und Protokollfehler als unterschiedliche UX-Zustände behandeln.

Abnahme:

- Integrationstest mit Host und zwei simulierten Peers schließt einen Fall synchron ab.
- Ein Agent-Client erhält weder vollständige Akten noch versteckte Regeln oder korrekte Zielauflösung.
- Reconnect innerhalb des Fensters stellt Rolle, Ansicht und aktuellen Fall korrekt wieder her.
- Wiederholte Aktionen und verspätete Patches nach Reconnect ändern den Zustand nicht doppelt und erzeugen keine stille Abweichung.

## Batch 6 – Vertikaler Fall: Agent

Ziel: Die Agent-Rolle ist für einen vollständigen Fall spielbar und charaktervoll.

- [x] Telefonpult mit Anrufannahme, Portrait, Stimmung und Gesprächsindikator bauen.
- [x] verzweigten Dialog mit 3–5 Antworten, Konsequenzen und kurzen Reaktionen umsetzen.
- [x] Unterbrechen mit Cooldown und sichtbarer Telefonhörer-Reaktion implementieren.
- [x] exakt drei strukturierte Hinweis-Slots und Pin/Ersetzen-Fluss bauen.
- [x] Bitte an Dispatcher als begrenztes, öffentliches Signal umsetzen.
- [x] Queue-Druck verständlich visualisieren, ohne exakte versteckte Wartewerte zu verraten.
- [x] Tastatursteuerung und Fokusreihenfolge ergänzen.
- [x] Wurm-Telefonhörer-Animation für besonders schwierige Anrufer integrieren.

Abnahme:

- Agent kann alle erforderlichen Informationen entdecken, aber nicht allein sicher lösen.
- Dialogauswahl bleibt auch bei Animationen responsiv; Doppelaktionen sind ausgeschlossen.
- Die Rolle ist mit Maus und Tastatur vollständig bedienbar.

## Batch 7 – Vertikaler Fall: Archivar

Ziel: Recherche ist eine aktive, visuelle Mechanik statt einer Textdatenbank.

- [x] Aktenschrank, Suchfeld, Filter und animierte Karteikarten bauen.
- [x] absichtlich mehrdeutige Treffer mit fairen Unterscheidungsmerkmalen implementieren.
- [x] Regelbuch mit Inhaltsreitern, Tagesklauseln und Querverweisen bauen.
- [x] Stempel `VERIFIZIERT`, `FRAGWÜRDIG`, `AUF KEINEN FALL FREIGEBEN` implementieren.
- [x] maximal zwei öffentliche Pins mit Ersetzen-/Lösen-Fluss bauen.
- [x] Stempel-Squash, Papierauswurf bei Fehlersuche und Aktenschrankreaktion integrieren.
- [x] Screenreader-lesbare Textspiegelung für relevante Akteninformation ergänzen.

Abnahme:

- Archivar kann aus Gesprächstags und Akte eine begründete Empfehlung ableiten, sieht aber weder Agentenantworten noch Maschinenlösung vollständig.
- Suche und Regeln funktionieren mit mindestens 30 Archetypen und den vorgesehenen Contentmengen performant.

## Batch 8 – Vertikaler Fall: Disponent

Ziel: Routing fühlt sich wie eine widerspenstige physische Maschine an.

- [x] erstes Maschinenlayout mit 3–6 Controls und klaren Zustandsanzeigen bauen.
- [x] neun Ziele plus Sonderziel-Slots als datengetriebene Zielbank integrieren.
- [x] Vorbereitung, Sicherheitsfreigabe und finalen Hebel als getrennte Schritte implementieren.
- [x] Bedingungen wie Temperatur, Formularfarbe, Siegel und Ventilstellung abbilden.
- [x] Störungen mit Diagnosehinweis und Gegenaktion integrieren.
- [x] spürbar befriedigende Hebelanimation, Rückstoß, Funken, Rauch und Audio bauen.
- [x] korrekte und falsche Routing-Sequenz als kurze, abbrechbare Slapstick-Vignette integrieren.

Abnahme:

- Ein Commit ist standardmäßig erst nach Freigabe durch Agent und Archivar sowie `bereit` des Disponenten möglich und wird danach hostseitig vollständig neu validiert.
- Der Disponent sieht mögliche Ziele und Maschinenfeedback, aber keine vollständige Regelbegründung.

## Batch 9 – Gemeinsamer Spielzyklus und HUD

Ziel: 8–12 Fälle bilden eine verständliche, eskalierende 12–18-Minuten-Schicht.

- [x] Queue mit 3–5 parallelen Fallzuständen und eindeutigem aktivem Fall umsetzen.
- [x] gemeinsamen HUD-Vertrag implementieren: Zeit, Queue, drei Druckwerte, Fall-ID, Verbindung, Freigaben.
- [x] Kollegenstatus nur als `sucht`, `spricht`, `bereitet vor`, `bereit`, `getrennt` anzeigen.
- [x] Freigabeprotokoll und Widerruf vor dem finalen Hebel bauen.
- [x] alle zwei Fälle einen angekündigten Schichtmodifikator aktivieren.
- [x] Pausenregeln so umsetzen, dass Timer und Cooldowns hostautoritativ stoppen.
- [x] Abschlussakte mit Seed, Statistiken, Fehlerchronik und visuellen Folgen bauen.
- [x] Debug-Replay aus Startkonfiguration, Seed, PRNG-/Simulationsversion, Content-Hash, terminalem Host-Tick und nach Host-Tick plus Ordnungsnummer geordnetem Eingabelog (Aktionen und Systemereignisse) für Tests ermöglichen.

Abnahme:

- Eine komplette Schicht ist ohne Debug-Eingriff spielbar.
- Spieler können jederzeit erkennen, welcher gemeinsame Schritt fehlt, ohne fremde Geheimdaten zu sehen.
- Ergebniswerte lassen sich aus dem vollständigen Eingabelog reproduzieren.

## Batch 10 – Kampagne, freies Spiel und Tutorial

Ziel: drei Modi nutzen dieselben Kernsysteme ohne Sondercode in Rollenpulten.

- [x] `GameMode`-Vertrag für Content-Pool, Sessionregeln, Siegbedingung und Ergebnisfortschritt definieren.
- [x] Tutorial als reguläre Drei-Spieler-Partie mit drei geführten Rollenstationen plus gemeinsamem Übungsfall umsetzen; lokale Einzelrollen-Vorschauen bleiben Debug-/Eingabetests ohne Fortschritt.
- [x] Basiskampagne in Kapitel und Szenarien mit Intro, Regelpaket, Mutatoren und Abschluss gliedern.
- [x] Kampagnenfortschritt als exportierbaren lokalen Code/JSON speichern; keine Accounts voraussetzen.
- [x] Host-Fortschritt und Gastzugriff transparent behandeln.
- [x] freies Spiel mit Seed, Länge, Schwierigkeit, Ziel-/Regelpool und Störungsdichte konfigurieren.
- [x] Presets für entspannt, Standard und höllisch erstellen.
- [x] Content-Auswahl vor Lobby-Ready synchronisieren und Hash aller Pakete vergleichen.
- [x] Beispiel für zweite Kampagne als kleines separates Paket hinzufügen.

Abnahme:

- Rollenpulte benötigen keine kampagnenspezifischen Imports.
- Ein neues Kampagnenpaket erscheint nach Registrierung automatisch in der Auswahl.
- Freies Spiel mit identischem Seed, Preset, Content-Hash und Spielversion erzeugt dieselbe Schicht.

## Batch 11 – Content-Produktion MVP

Ziel: die geforderte Varianz ist vollständig, lösbar und stilistisch konsistent.

- [x] mindestens 30 Anrufer-Archetypen schreiben und illustrieren.
- [x] mindestens 40 Lebens-/Sünden-Tags, 20 Beschwerden, 18 Ausnahmen und 24 Regelklauseln anlegen.
- [x] neun Standardziele und drei temporäre Sonderziele ausarbeiten.
- [x] zwölf Maschinenstörungen mit Diagnose und Gegenaktion erstellen.
- [x] mindestens 20 visuelle Reaktionen Ereignissen zuordnen.
- [x] Dialoge auf Informationswert, Kürze, Wiederholung und Humor prüfen.
- [x] Safety-Review gegen reale Tragödien, geschützte Gruppen und realistische Gewalt durchführen.
- [x] Generator-Balancing per Simulation prüfen: Zielverteilung, Schwierigkeit, Dead Ends, Wiederholungen.

Abnahme:

- Inhaltsvalidator meldet keine Fehler oder unerreichbaren Knoten.
- Jeder Fall enthält mindestens zwei Rollenabhängigkeiten.
- In fünf aufeinanderfolgenden Standard-Schichten wiederholt sich kein identischer Gesamtfall.

## Batch 12 – Sprite- und Asset-Pipeline

Ziel: finale Illustrationen lassen sich ohne Codeumbau einsetzen und bleiben scharf, performant und animierbar.

- [x] verbindliche Asset-Spezifikation unter `src/assets/source/README.md` anlegen.
- [x] Namensschema nutzen: `<domain>.<entity>.<variant>.<state>.<frame>`.
- [x] Figuren in separat animierbare Teile zerlegen: Körper, Kopf, Augen, Mund, Hände, Requisit und FX; bei Frameanimation alternativ vollständige konsistente Frames.
- [x] pro Animation Pivot, Anker, nominale Pixelgröße, FPS, Loop, Hitbox und erlaubtes Cropping in Metadaten speichern.
- [x] Sprite-Atlanten pro Rolle und allgemeinem FX-Paket erzeugen; TexturePacker-kompatibles JSON oder Phaser Multiatlas verwenden.
- [x] 2×-Quelldateien erzeugen, Laufzeitgröße festlegen und automatische Downscale-/WebP/PNG-Ausgabe bauen.
- [x] 9-Slice-Rahmen, tilebare Rohre/Ketten und nicht skalierbare Details kennzeichnen.
- [x] Trim-Regeln so konfigurieren, dass Anker über alle Frames stabil bleiben.
- [x] Asset Registry mit Platzhalter-Fallback integrieren; Logik referenziert ausschließlich Asset-IDs.
- [x] Ladegruppen definieren: `boot`, `shared`, `role-agent`, `role-archivist`, `role-dispatcher`, `campaign-<id>`.
- [x] Preload-Budget, Atlasgrößenlimit, VRAM-Schätzung und Ladefortschritt prüfen.
- [x] visuellen Atlas-Review-Screen bauen, der alle Frames, Pivots, Bounds und Animationen zeigt.
- [x] reduzierte-Bewegung-Varianten für starke Wackel-/Blitz-Effekte definieren.

Abnahme:

- Platzhalterfigur kann durch finalen Atlas ersetzt werden, ohne Szenen- oder Spiellogik zu ändern.
- Keine Animation springt durch wechselnde Trim-Bounds oder Pivots.
- Bei 1920×1080 sind Hauptfiguren und Papiertexte scharf; Atlanten überschreiten nicht die festgelegten GPU-Limits.
- Fehlendes Kampagnenasset zeigt einen diagnostischen Platzhalter statt eines Absturzes.

## Batch 13 – Audio und Präsentationssystem

Ziel: Eskalation ist hör- und sichtbar, ohne Kerninformationen zu verdecken.

- [x] Audio-Busse für Master, Musik, SFX und UI mit Persistenz der Einstellungen bauen.
- [x] 3–5 lokal gebündelte Warteschleifen-Jingles integrieren.
- [x] dynamische Musik-/Ambience-Layer an Eskalationsstufe koppeln.
- [x] Ereignis-zu-Reaktion-Mapping für Figur, Pflanze, Rohre, Druckanzeigen und Hintergrunddämonen bauen.
- [x] Priorität und Cooldowns für Gags definieren, damit sie UI und Hinweise nie dauerhaft blockieren.
- [x] Untertitel bzw. visuelle Entsprechung für spielrelevante Sounds anbieten.
- [x] Browser-Audio-Unlock und Tab-Hintergrundverhalten behandeln.

Abnahme:

- Stummgeschaltet bleibt jede relevante Information sichtbar.
- Bei hoher Last konkurrieren maximal festgelegte FX-Gruppen; Lesbarkeit und Eingabe bleiben erhalten.

## Batch 14 – Accessibility, Optionen und Robustheit

Ziel: das dichte visuelle Design bleibt bedienbar.

- [x] vollständige Tastaturbedienung und logische Fokusreihenfolge je Pult prüfen.
- [x] Farbsehschwäche-Palette und Symbolcodierung für alle Ziel-/Statusfarben integrieren.
- [x] UI-Skalierung, Textgröße, reduzierte Bewegung und Blitzreduktion anbieten.
- [x] DOM-Textspiegel für zentrale Phaser-Texte und Live-Status implementieren.
- [x] keine zeitkritische Aktion ausschließlich über präzises Drag-and-drop anbieten.
- [x] sichere Wiederaufnahme nach Sichtbarkeitswechsel und Canvas-Kontextverlust testen.
- [x] verständliche Fatal-Error-Seite mit Diagnosekopie bauen.

Abnahme:

- Kritischer Spielfluss funktioniert ohne Maus, ohne Audio und ohne Farberkennung.
- 200 % Browserzoom verursacht keine unbedienbaren Lobbydialoge.

## Batch 15 – Balance, Cross-Browser und Release

Ziel: reproduzierbarer MVP-Release auf GitHub Pages.

- [x] Unit-, Integrations- und E2E-Suite aus Produktspezifikation vervollständigen.
- [ ] je einen aktuellen stabilen Chrome-, Edge- und Firefox-Browser als echtes gemischtes Trio auf mindestens zwei Netzwerken testen und die Kompatibilitätsmatrix für die letzten zwei stabilen Hauptversionen dokumentieren.
- [ ] 12–18 Minuten Zielzeit sowie Druck- und Fehlerkurven mit Playtests messen.
- [ ] Rollen auf Redeanteil, Leerlauf, Informationsmacht und Bedienlast vergleichen.
- [ ] Assets auf Ladezeit, Speicher und schwächeren integrierten GPUs profilieren.
- [ ] Offline-/STUN-Fehler, manipulierte Links, Hintergrundtabs und Reconnect testen.
- [x] Content-Hash und Version in Ergebnis-/Fehlerdiagnose anzeigen.
- [x] GitHub-Pages-Workflow deployen und Smoke-Test gegen veröffentlichte URL ausführen.
- [x] Datenschutzhinweis zu SDP/STUN sowie Credits und Lizenzen finalisieren.

Abnahme / MVP Definition of Done:

- Drei Personen verbinden sich ohne Account und Backend, wählen eindeutige Rollen und spielen eine vollständige Schicht.
- Jede Rolle besitzt notwendige, exklusive Information und aktive Aufgaben.
- Kampagne, freies Spiel und Tutorial verwenden dieselbe Simulation und dieselben Rollenmodule.
- Reconnect, Ergebnisakte und Seed-Wiederholung funktionieren.
- Alle sieben Pflichtinszenierungen aus Abschnitt 8.2 der Produktspezifikation und mindestens 20 Reaktionen sind integriert.
- Das Spiel wirkt in Standbild und Bewegung wie ein überzeichnetes, kaputtes Höllenbüro – nicht wie eine Web-App mit Skin.

## Empfohlene Release-Schnitte

1. `foundation`: Batches 0–3.
2. `network-alpha`: Batches 4–5.
3. `vertical-slice`: Batches 6–9 mit einem vollständig illustrierten Fall.
4. `modes-alpha`: Batch 10 und eine kleine Beispielkampagne.
5. `content-beta`: Batches 11–13.
6. `mvp`: Batches 14–15 und alle Abnahmen.

## Bewusst später

- Öffentliches Quick-Match mit Signalisierungs-/Room-Service und Missbrauchsschutz.
- TURN-Relay, integrierter Voice-Chat, Zuschauer, mobile Bedienung.
- Accounts, Cloud-Fortschritt, globale Bestenlisten und Modding-API.
- Diese Erweiterungen müssen Adapter implementieren und dürfen den P2P-Privatlobby-Pfad nicht ersetzen.
