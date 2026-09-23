# Produktspezifikation: Höllen-Hotline – Bitte bleiben Sie dran

Version: 1.2<br>
Ziel: Implementierbare Spezifikation für Codex<br>
Plattform: Desktop-Browser, statisch über GitHub Pages, 3-Spieler-Koop via WebRTC P2P

Dokumentenrang: Dieses Dokument definiert harte Produkt-, Technik-, Sicherheits- und Release-Anforderungen. `gameplay.md` konkretisiert Regeln, Modi und Inhalte. `TODO.md` ist nur der daraus abgeleitete Umsetzungsplan und darf keine neue Produktanforderung einführen. Bei einem Widerspruch gilt in technischen Fragen diese Spezifikation, in reinen Gameplay-Fragen `gameplay.md`; der Widerspruch muss vor der Implementierung in allen betroffenen Dokumenten bereinigt werden.

## 1. Produktziel

Höllen-Hotline ist ein kooperatives Browsergame für exakt drei Spieler. Die Gruppe betreibt während einer chaotischen Schicht den unterbesetzten Kundendienst der Hölle. Jede eingehende Seele hat Beschwerden, Akten, Sonderregeln und ein korrektes oder zumindest vertretbares Ziel. Die drei Spieler besitzen absichtlich unterschiedliche Informationen und Werkzeuge und müssen schnell miteinander reden.

Das Spiel soll lustig geschrieben sein, aber das reicht ausdrücklich nicht aus. Es muss auch passend lustig aussehen. Charakterdesign, UI, Animationen, Maschinen, Reaktionen, Fehlermeldungen, Übergänge und visuelle Konsequenzen von Fehlern sind Teil der Comedy. Eine normale Business-Oberfläche mit witzigen Texten erfüllt die Spezifikation nicht.

## 2. Harte Produktanforderungen

- Exakt drei aktive Spieler pro Partie, einschließlich gemeinsamem Tutorial: Agent, Archivar und Disponent. Lokale Debug-, Art- und Logiktests dürfen Rollen einzeln darstellen, sind aber keine Partie und erzeugen keinen Fortschritt.
- Kein Backend, keine Datenbank, kein Login, keine Cloud-Speicherung und keine serverseitige Spiellogik.
- Hosting als rein statische Site auf GitHub Pages.
- P2P-Kommunikation ausschließlich über WebRTC DataChannels.
- Ein konfigurierbarer STUN-Server oder mehrere STUN-Server dürfen für ICE/NAT-Ermittlung verwendet werden.
- Kein TURN-Zwang. Wenn eine direkte P2P-Verbindung nicht möglich ist, muss das Spiel verständlich erklären, dass diese Netzwerkkombination ohne Relay nicht funktioniert.
- Verbindungsaufbau über kopierbare Links. Wegen fehlendem Signalisierungsserver wird Non-Trickle-ICE verwendet: erst vollständige ICE-Kandidaten sammeln, dann Offer/Answer als Link austauschen.
- Offer- und Answer-Daten müssen im URL-Fragment nach `#` stehen, nicht in Query-Parametern. Dadurch werden diese Daten beim normalen Seitenabruf nicht an GitHub Pages übertragen.
- Keine Telemetrie, Werbung oder externen Runtime-APIs. Spielzustand und Spielinhalte bleiben im Browser der drei Spieler. Ausnahme: STUN sieht technisch notwendige Netzwerk-Metadaten, aber keine Spielinhalte.
- Unterstützungsziel bei Release sind die jeweils letzten zwei stabilen Hauptversionen von Chrome, Edge und Firefox auf Desktop. Die tatsächlich geprüften Versionen werden im Release dokumentiert. Safari ist optional für den MVP.
- Maus und Tastatur, keine Gamepads im MVP.
- Eine vollständige Partie dauert ca. 12–18 Minuten.
- Kein Account-Fortschritt. Kampagnenfortschritt darf ausschließlich lokal und exportierbar gespeichert werden. Wiederspielwert entsteht aus Systemkombinationen, Rollenabhängigkeit, zufälligen Fällen und eskalierenden Regeln.
- Der MVP umfasst Basiskampagne, freies Spiel und Tutorial gemäß `gameplay.md`. Alle mitgelieferten Content-Pakete sind Teil des statischen Builds; ein zur Laufzeit nachladbares Mod-System ist nicht Teil des MVP.

## 3. Technischer Stack

Empfohlener Stack:

- TypeScript mit `strict: true`.
- Vite als Build-System.
- Phaser 3 für Szene, 2D-Animationen, Partikel und interaktive Spielobjekte.
- DOM-Overlays nur für Lobby, Copy/Paste-Dialoge sowie semantische Accessibility- und Texteingaben; die eigentliche Spieloberfläche soll primär visuell als Spielszene wirken.
- Zod oder eine gleichwertige kleine Schema-Library für eingehende Netzwerk-Nachrichten.
- pako oder CompressionStream/DecompressionStream mit Fallback für komprimierte SDP-Linkdaten.
- Vitest für Unit Tests; Playwright für End-to-End-Tests.
- GitHub Actions Workflow für Build und Deployment auf GitHub Pages.

Verzeichnisvorschlag:

```text
src/
  app/
  game/
    scenes/
    systems/
    roles/
    content/
    ui/
  net/
    peerHost.ts
    peerGuest.ts
    protocol.ts
    signalingLink.ts
    networkConfig.ts
  state/
    gameState.ts
    reducer.ts
    selectors.ts
  assets/
  tests/
```

## 4. Netzwerkarchitektur

### 4.1 Autorität

Der Spieler, der die Lobby erstellt, ist Host und autoritative Simulation. Der Host besitzt den kanonischen `GameState`, führt Zufallsgenerator und Timer und entscheidet über gültige Aktionen. Die beiden Gäste senden nur Aktionen. Der Host validiert sie, verändert den Zustand und broadcastet relevante Zustandsänderungen.

Der Host spielt selbst eine der drei Rollen und ist kein separater Server.

### 4.2 Peer-Topologie

- Host hält zwei unabhängige `RTCPeerConnection`-Instanzen: Peer A und Peer B.
- Gäste verbinden sich nur mit dem Host.
- Zwischen den beiden Gästen besteht keine direkte Verbindung.
- Ein zuverlässiger, geordneter DataChannel `game` reicht für MVP.
- Optional später: zweiter unzuverlässiger Channel `fx` für nichtkritische Cursor-/Effektinformationen.

### 4.3 Kopierbarer Link-Handshake

Host-Ablauf für jeden Gastslot:

1. Host erstellt `RTCPeerConnection` mit der konfigurierten STUN-Liste.
2. Host erzeugt DataChannel.
3. Host erzeugt Offer und setzt `setLocalDescription`.
4. Anwendung wartet bis `iceGatheringState === "complete"`. Erreicht sie vorher den definierten Timeout, wird kein unvollständiger Non-Trickle-Link ausgegeben; die UI bietet Abbruch und einen neuen Versuch an.
5. `localDescription` plus `sessionId`, `peerSlot`, Protokollversion und Nonce werden JSON-serialisiert, komprimiert und Base64URL-kodiert.
6. Host erhält einen Link auf die konfigurierte Vite-Basis, z. B. `https://<owner>.github.io/<repo>/#offer=<payload>`. Der Link darf keine nicht deployte Unterroute voraussetzen.
7. Gast öffnet den Link. Die App erkennt `offer`, zeigt das sechsstellige Sitzungskürzel zur menschlichen Kontrolle und lässt den Gast „Beitreten“ klicken.
8. Gast setzt Remote Offer, erzeugt Answer, wartet ebenfalls auf vollständiges ICE-Gathering und erzeugt `#answer=<payload>`.
9. Gast kopiert den Answer-Link zurück zum Host.
10. Host fügt den Answer-Link in der bereits geöffneten Host-Lobby im passenden Slot ein. Ein normales Öffnen des Links darf nicht als Host-Import beworben werden, da ein Reload oder neuer Tab keinen Zugriff auf die laufende `RTCPeerConnection` besitzt. Die App verifiziert `sessionId`, `peerSlot`, Nonce und Protokollversion und setzt erst dann `setRemoteDescription`. Ein versehentlich in einem neuen Tab geöffneter Answer-Link zeigt deshalb nur die Anweisung, zum bestehenden Host-Tab zurückzukehren und ihn dort einzufügen.
11. Nach `datachannel.open` wird ein `HELLO`/`WELCOME`-Handshake durchgeführt.

Der gleiche Prozess wird für den zweiten Gast wiederholt. Die UI muss beide Slots klar getrennt anzeigen.

Offer und Answer sind einmalige, slotspezifische Bearer-Daten. Die Nonce dient der Zuordnung und Replay-Erkennung, ist aber kein Ersatz für eine Benutzeridentität. Nach erfolgreichem Import oder ausdrücklichem Erzeugen eines Ersatzlinks ist der vorherige Payload innerhalb der laufenden Lobby ungültig. Eine belastbare globale Einmaligkeit oder Ablaufzeit ist ohne Server, persistente Sperrliste und vertrauenswürdige Uhr nicht erreichbar und darf von der UI nicht behauptet werden. Vor Dekompression und vor Übergabe an WebRTC gelten Grenzen für kodierte und dekodierte Größe. URL-Fragment und Zwischenablage schützen nicht vor lokal installierten Erweiterungen oder Personen mit Zugriff auf Gerät bzw. Zwischenablage; die UI weist deshalb auf vertrauliches Teilen hin.

Der DataChannel ist durch WebRTC/DTLS transportverschlüsselt. Das Protokoll bietet im MVP jedoch keine verifizierte Identität der Mitspieler und keinen Schutz gegen einen absichtlich manipulierten Host.

### 4.4 Netzwerkfehler

Die Lobby muss verständliche Zustände zeigen: „Offer wird vorbereitet“, „Antwort fehlt“, „Verbindung wird geprüft“, „Verbunden“, „Direkte Verbindung fehlgeschlagen“.

Bei Abbruch während einer Partie pausiert der Host insgesamt für bis zu 60 Sekunden. Der getrennte Gast kann mit einem neu erzeugten Reconnect-Offer wieder verbunden werden. Gelingt das innerhalb des Fensters nicht, endet die Partie. Ein Bot-Ersatz ist nicht Teil des MVP.

### 4.5 Nachrichtenprotokoll

Jede Nachricht besitzt mindestens:

```ts
type Envelope<T> = {
  v: 1;
  sessionId: string;
  connectionId: string;
  seq: number;
  type: string;
  payload: T;
};
```

Bei jeder neuen DataChannel-Verbindung erzeugt der Gast vor `HELLO` eine kryptografisch zufällige, nur für diese Verbindung gültige `connectionId`; der Host prüft und bestätigt sie in `WELCOME`. Ein Reconnect verwendet eine neue `connectionId`. Die getrennte `clientId` ist ebenfalls nur sitzungslokal und dient dazu, den reservierten Spieler-Slot wiederzuerkennen; sie wird nicht persistent gespeichert.

Benötigte Nachrichtentypen:

- `HELLO`: Gast meldet Protokollversion und Client-ID.
- `WELCOME`: Host bestätigt Client-/Peer-Slot, Session und ausgehandelte Protokollversion; die Rolle wird erst über den Lobby-Zustand bestätigt.
- `LOBBY_STATE`: Spieler, Rollenwahl, Ready-Status.
- `START_GAME`: autoritativer Start-Tick, öffentliche Moduskonfiguration und ausschließlich öffentliche Startregeln; Seed und PRNG-Zustand bleiben bis zur Abschlussakte beim Host.
- `ACTION`: eine Rollenaktion des Gasts.
- `ACTION_REJECTED`: ungültige oder veraltete Aktion.
- `STATE_PATCH`: kleine autoritative Änderung der jeweiligen Rollenprojektion.
- `STATE_SNAPSHOT`: vollständige, komprimierbare Rollenprojektion für Join/Reconnect, niemals der kanonische Gesamtzustand.
- `SNAPSHOT_REQUEST`: Client fordert nach Revisionslücke oder ungültigem Patch einen neuen Snapshot seiner Rollenprojektion an.
- `PING` / `PONG`: RTT-Anzeige und Disconnect-Erkennung.
- `PAUSE_STATE`: Host pausiert wegen Netzwerkverlust oder Menü.
- `GAME_OVER`: Ergebnisdaten.

`seq` steigt je Verbindung und Senderichtung streng monoton. `STATE_PATCH` trägt `baseRevision` und `revision`, `STATE_SNAPSHOT` seine `revision`; bei einer Lücke fordert der Client per `SNAPSHOT_REQUEST` einen neuen Snapshot an, statt einen Patch blind anzuwenden. Aktionen besitzen eine sitzungsweit eindeutige `actionId`, damit der Host Wiederholungen auch über eine neue Reconnect-Verbindung hinweg idempotent behandeln kann. Die Idempotenz-Historie bleibt mindestens für die Dauer der Partie erhalten.

Alle eingehenden Nachrichten müssen schema-validiert werden. Eine inkompatible Envelope- oder Protokollversion beendet die Verbindung mit verständlicher Fehlermeldung. Unbekannte Nachrichtentypen einer kompatiblen Version werden ignoriert oder protokolliert, niemals ungeprüft ausgeführt. Die UTF-8-kodierte, serialisierte Envelope-Größe ist auf 64 KiB (= 65.536 Byte) begrenzt; ein komprimierter, rollengefilterter Snapshot muss auf dem Draht innerhalb dieses Budgets bleiben. Dekomprimierte Payloads sind auf 256 KiB (= 262.144 Byte) begrenzt. Sender beachten `RTCDataChannel.bufferedAmount`, damit schnelle Aktionen oder Snapshots keinen unbegrenzten Puffer aufbauen.

### 4.6 Vertrauensmodell

Der Host besitzt als autoritative Simulation zwangsläufig den vollständigen Zustand. Die normale Host-Oberfläche zeigt nur die gewählte Rolle, ein technisch versierter Host kann verborgene Daten aber über DevTools oder einen veränderten Client lesen und das Ergebnis manipulieren. Der MVP schützt Gäste vor versehentlichem Datenabfluss in ihre Clients, nicht vor einem böswilligen Host. Gäste können den statisch ausgelieferten Content und eigenen Clientcode ebenfalls untersuchen; Seed, PRNG-Zustand und konkrete Musterlösung werden ihnen deshalb vor der Auflösung nicht übertragen. Echte Geheimhaltung gegenüber dem Host würde eine andere, deutlich komplexere verteilte Architektur erfordern.

## 5. Spielstruktur

Eine Partie besteht aus einer Schicht mit 8 bis 12 Fällen. Drei bis fünf Fälle können gleichzeitig in verschiedenen Bearbeitungszuständen stecken. Die Schicht eskaliert: Regeln werden widersprüchlicher, Maschinen unzuverlässiger und Anrufer sonderbarer.

### 5.1 Rollen

#### Rolle A: Agent der Höllen-Hotline

Der Agent sieht und hört den aktuellen Anrufer. Er führt ein kurzes verzweigtes Gespräch und extrahiert Hinweise. Er kennt nicht die komplette Akte und nicht alle Routing-Regeln.

Mechaniken:

- Auswahl aus 3–5 Dialogantworten.
- „Unterbrechen“-Button mit Cooldown.
- Stimmungsanzeige des Anrufers.
- Warteschlange mit Zeitdruck.
- Kann dem Archivar maximal drei Stichworte pro Fall als strukturierte Tags senden.
- Kann den Disponenten auffordern, einen Zielbereich vorzubereiten.

#### Rolle B: Archivar der Verdammnis

Der Archivar durchsucht absurde Lebensakten und aktuelle Höllenvorschriften. Er kennt nicht die komplette Gesprächssituation und bedient keine Routing-Maschine.

Mechaniken:

- Aktenregister mit Name, Alias, Todesursache, Sünden-Tags, Beschwerden und Ausnahmen.
- Suchleiste mit absichtlich teilweise widersprüchlichen Treffern.
- Regelbuch mit täglich wechselnden Klauseln.
- Stempel „VERIFIZIERT“, „FRAGWÜRDIG“ und „AUF KEINEN FALL FREIGEBEN“.
- Kann zwei relevante Aktenkarten an die anderen Rollen pinnen.

#### Rolle C: Disponent der neun Kreise

Der Disponent kontrolliert die physische Routing-Anlage. Er sieht die verfügbaren Ziele, aber nicht alle Gründe, warum ein Ziel richtig ist.

Mechaniken:

- Drei bis sechs Hebel, Ventile oder Förderbänder je Maschinenlayout.
- Ziele benötigen Bedingungen, z. B. Temperatur, Formularfarbe oder korrektes Siegel.
- Maschine kann überhitzen, kleben, rückwärts laufen oder „beleidigt“ sein.
- Spieler muss Ziel vorbereiten und erst nach gemeinsamer Freigabe final auslösen.

### 5.2 Fallablauf

1. Neuer Anrufer erscheint in der Queue.
2. Agent nimmt Gespräch an und sammelt Hinweise.
3. Archivar sucht parallel Akte und Regeln.
4. Disponent bereitet mögliche Zielbereiche vor.
5. Spieler einigen sich verbal auf eine Entscheidung.
6. Agent und Archivar erteilen jeweils eine widerrufbare Freigabe; der Disponent meldet die Maschine bereit und zieht den finalen Hebel. Modifikatoren dürfen diese Regel ausdrücklich verändern.
7. Host wertet Ergebnis aus.
8. Konsequenz wird visuell ausgespielt und beeinflusst Stress, Queue, Maschinenzustand oder Bonus.

## 6. Content- und Wiederspielsystem

Keine LLM- oder Servergenerierung. Fälle werden deterministisch aus lokalen Daten zusammengesetzt.

### 6.1 Fallbausteine

MVP soll mindestens enthalten:

- 30 Anrufer-Archetypen.
- 40 Sünden-/Lebensereignis-Tags.
- 20 Beschwerden.
- 18 Sonderausnahmen.
- 24 wechselnde Regelklauseln.
- 9 Zielbereiche plus 3 absurde temporäre Sonderziele.
- 12 Maschinenstörungen.
- 20 visuelle Reaktionsanimationen.

Ein Fall besteht aus Archetyp + 2–4 Tags + Beschwerde + wahrer Zielbedingung + 0–2 Ausnahmen + optionalem Twist.

### 6.2 Seed

Der Host erzeugt zu Spielbeginn einen 128-Bit-Seed. Eine optionale manuelle Seed-Eingabe wird per festgeschriebenem, versioniertem Verfahren in genau 128 Bit normalisiert; Anzeige und erneute Eingabe müssen denselben Seed ergeben. Alle prozeduralen Entscheidungen laufen über einen deterministischen PRNG auf dem Host. Der normalisierte Seed erscheint am Ende als „Aktenzeichen“, damit Spieler eine Schicht erneut starten können.

### 6.3 Eskalation

Nach jeweils zwei abgeschlossenen Fällen tritt ein Schichtmodifikator ein, z. B.:

- „Audit aus der Oberhölle“: jeder dritte Stempel muss doppelt bestätigt werden.
- „Kesseldruck“: Disponent hat kürzere Zeitfenster.
- „Montag“: Anrufer starten gereizter.
- „Formularreform“: zwei Regeln tauschen ihre Bedeutung.
- „Praktikant“: zufällige Aktenseite ist falsch einsortiert, aber visuell markiert rekonstruierbar.

## 7. Punktesystem und Niederlage

Gemeinsame Werte:

- `queuePressure`: 0–100.
- `boilerPressure`: 0–100.
- `auditRisk`: 0–100.
- `resolvedCorrectly`: Anzahl korrekter Fälle.
- `resolvedAcceptably`: Anzahl nachvollziehbar vertretbarer Fälle.
- `resolvedIncorrectly`: Anzahl falscher, nicht katastrophaler Fälle.
- `catastrophicErrors`: schwere Fehlleitungen.

Partie endet bei Schichtende oder wenn zwei der drei Druckwerte gleichzeitig 100 erreichen. Das Ergebnis ist kein simples Sterne-Rating, sondern eine komische Abschlussakte mit Statistiken und visuellen Konsequenzen.

## 8. Visuelle und humoristische Spezifikation

Diese Sektion ist eine Muss-Anforderung.

Das Spiel darf nicht lediglich lustige Texte auf einer gewöhnlichen Web-App-Oberfläche anzeigen. Es soll bereits in einem Screenshot ohne Text erkennbar komisch und charaktervoll wirken.

### 8.1 Art Direction

- Stil: überzeichnete 2D-Cartoon-Hölle, Bürokratie trifft kaputte Industrieanlage.
- Formen: krumme Rahmen, überdimensionierte Stempel, wackelige Ordner, zu große Telefone, kleine Dämonen mit müden Gesichtern.
- Keine sterile SaaS-Optik.
- Panels dürfen wie physische Arbeitsplätze aussehen: Telefonpult, Aktenschrank, Schaltwand.
- Humor aus Silhouetten und Bewegungen, nicht nur aus Beschriftungen.

### 8.2 Pflichtanimationen für MVP

- Telefonhörer windet sich wie ein Wurm, wenn ein besonders nerviger Anrufer kommt.
- Aktenschrank spuckt bei falscher Suche Papier aus.
- Stempel drückt die UI sichtbar zusammen und federt zurück.
- Falsches Routing zeigt eine kurze slapstickartige Förderband-/Falltürsequenz.
- Korrektes Routing darf ebenfalls absurd sein, z. B. winziger Aufzug mit viel zu dramatischem Rauch.
- Druckanzeigen zittern und beginnen bei hoher Belastung zu schwitzen oder zu glühen.
- Dämonische Büropflanze reagiert auf Katastrophen.

### 8.3 Humorregeln

- Dunkler Bürokratiehumor, makabre Konsequenzen, gelegentlich kindisch-eklige Details sind erlaubt.
- Nicht auf realen geschützten Gruppen, realen Tragödien oder konkreten Personen aufbauen.
- Keine realistische Gore-Darstellung; Tod und Hölle bleiben stark stilisiert.
- Gags sollen kurz sein und Gameplay nicht dauerhaft blockieren.

## 9. UI pro Rolle

Die drei Rollen müssen deutlich unterschiedliche Screens haben.

### Agent

Links: Warteschlange. Mitte: Anruferportrait, Dialog und Stimmung. Rechts: drei extrahierte Hinweis-Slots. Unterkante: Push-to-talk-artiger visueller Gesprächsindikator, aber ohne integrierten Voice-Chat.

### Archivar

Mitte: ausziehbarer Aktenschrank mit Karten. Rechts: Regelbuch. Unten: drei Stempel und Pin-Bereich. Suchergebnisse sollen wie physische Karteikarten animiert werden.

### Disponent

Mitte: große Maschine mit Schaltern. Links: Zielbereiche. Rechts: Temperatur/Druck/Störungen. Finaler Hebel muss absichtlich befriedigend animiert sein.

## 10. Audio

MVP benötigt keine Sprachübertragung. Spieler nutzen externen Voice-Chat.

Lokale Audioanforderungen:

- kurze UI-Sounds für Stempel, Papier, Hebel, Röhren und Warteschleifen.
- 3–5 kurze instrumentale Warteschleifen-Jingles.
- dynamische Layer bei steigender Eskalation.
- Master-/Musik-/SFX-Regler und Mute.
- Keine extern gestreamten Audiodateien; alle Assets werden mit dem Build ausgeliefert.

## 11. State Model

Minimaler kanonischer Zustand:

```ts
type GameState = {
  sessionId: string;
  phase: 'lobby' | 'shift' | 'results';
  seed: string;
  rngState: string;
  hostTick: number;
  stateRevision: number;
  players: Record<PlayerId, {
    role: 'agent' | 'archivist' | 'dispatcher';
    connected: boolean;
    ready: boolean;
  }>;
  shift: {
    elapsedMs: number;
    currentWave: number;
    queuePressure: number;
    boilerPressure: number;
    auditRisk: number;
  };
  cases: CaseState[];
  activeRules: RuleId[];
  machine: MachineState;
  score: ScoreState;
  pause: null | {
    reason: 'host-menu' | 'disconnect';
    resumePhase: 'shift';
  };
};
```

`ScoreState` unterscheidet mindestens `resolvedCorrectly`, `resolvedAcceptably`, `resolvedIncorrectly` und `catastrophicErrors`; die Kategorien müssen aus der Auflösungsbegründung reproduzierbar sein.

Private Rolleninformationen dürfen im Hostzustand liegen, aber an Clients nur rollenbezogen übertragen werden. Der Agent soll z. B. keine versteckten Archivregeln im Browserzustand erhalten, nur weil sie für den Host existieren. Seed, PRNG-Zustand und Musterlösung gehören vor der Ergebnisphase in keine Gastprojektion.

Der konkrete PRNG-Algorithmus und seine Version sind Teil der Replay-Daten. Die Simulation verwendet einen festen, versionierten Tick in ganzzahliger Zeit; Timer, Cooldowns und Druckänderungen leiten sich ausschließlich daraus ab. Der Host weist jede angenommene Spieleraktion und jedes zustandswirksame externe Systemereignis, etwa Disconnect-Pause, Wiederaufnahme oder Verbindungsabbruch, einem `hostTick` und innerhalb desselben Ticks einer monotonen Ordnungsnummer zu. Initialer Seed, PRNG-/Simulationsversion, Content-Hash, Spielversion, Startkonfiguration, terminaler `hostTick` sowie dieses geordnete Eingabelog bestimmen die Simulation. Der aktuelle serialisierte PRNG-Zustand gehört in Snapshots und optionale Replay-Checkpoints, aber nicht als zusätzlicher unklarer Startparameter in ein Vollreplay. Reale Zeitstempel, Netzwerk-Latenz und kosmetische Präsentationsereignisse gehören nicht zum deterministischen Kern.

Der Content-Hash wird mit einem festgeschriebenen Hashverfahren aus einer kanonischen, plattformunabhängigen Serialisierung der sortierten, validierten Gameplay-Inhalte und ihrer Schema-Versionen gebildet. Dateireihenfolge, Whitespace und rein kosmetische Assets dürfen ihn nicht unbeabsichtigt verändern. Welche kosmetischen Paketversionen separat kompatibel sein müssen, wird im Manifest festgelegt.

Die monotone Echtzeit für ICE-/Reconnect-Timeouts liegt im Netzwerk-Supervisor außerhalb des kanonischen `GameState`. Sie darf eine verbleibende Pausenzeit in die UI projizieren, wird aber nicht vom Simulationstakt abgeleitet. Ablauf, Wiederaufnahme oder Abbruch gelangen als geordnete Systemereignisse in die Simulation; so bleibt ein Replay ohne Wanduhrdaten reproduzierbar.

## 12. Aktionen

Beispiele:

```ts
type ClientAction =
  | { actionId: string; kind: 'AGENT_DIALOGUE'; caseId: string; optionId: string }
  | { actionId: string; kind: 'AGENT_TAG'; caseId: string; tagId: string }
  | { actionId: string; kind: 'ARCHIVE_SEARCH'; query: string }
  | { actionId: string; kind: 'ARCHIVE_PIN'; caseId: string; recordId: string }
  | { actionId: string; kind: 'ARCHIVE_STAMP'; caseId: string; stamp: string }
  | { actionId: string; kind: 'MACHINE_CONTROL'; controlId: string; value: number | boolean }
  | { actionId: string; kind: 'ROUTE_COMMIT'; caseId: string; destinationId: string };
```

Host validiert Rolle, Phase, Fallstatus, Cooldowns, `actionId` und Sequenznummer. Auch lokale Aktionen des Hostspielers durchlaufen denselben Command-Validator; nur der Transportweg entfällt.

## 13. Lobby und Rollenwahl

Lobby zeigt drei Arbeitsplatzkarten. Host kann Rollen nicht für andere festlegen, aber freie Rollen sind anklickbar. Start ist nur möglich, wenn alle drei Slots verbunden, unterschiedliche Rollen gewählt und alle Spieler ready sind.

Zusätzlich:

- Intern eine kryptografisch zufällige Session-ID mit mindestens 128 Bit Entropie verwenden; davon getrennt ein sechs Zeichen langes, gut lesbares Sitzungskürzel nur zur menschlichen Zuordnung anzeigen.
- Buttons „Einladungslink für Gast 1 erstellen“ und „Gast 2“.
- Antwortlink-Eingabefeld je Slot.
- „Verbindung testen“ mit Ping-Anzeige.
- Seed optional manuell eintragbar.
- Für verweigerten Clipboard-Zugriff immer markierbare Textfelder und manuelles Kopieren/Einfügen anbieten.

## 14. GitHub-Pages-Anforderungen

- `vite.config.ts` muss einen konfigurierbaren `base` unterstützen.
- Keine serverseitigen Routes voraussetzen. Navigation erfolgt über In-Memory-Single-Page-State; ein Hash-Router ist ausgeschlossen, weil das URL-Fragment für `offer` und `answer` reserviert ist.
- `404.html`-Workaround ist nicht notwendig, wenn keine History-API-Routen verwendet werden.
- Assets relativ zum Vite-Basepfad laden.
- CI: `npm ci`, Tests, Build, GitHub-Pages-Artifact, Deploy.
- Produktionsbuild darf keine Source-Maps ausliefern, sofern nicht explizit aktiviert.

## 15. Datenschutz und Sicherheit

- Keine Analytics.
- Kein LocalStorage für personenbezogene Daten.
- Optional dürfen nur Einstellungen, letzter Seed, nicht personenbezogener Kampagnenfortschritt und lokale Abschlussvermerke gespeichert werden. Sessionnamen, SDP und laufende Sitzungsdaten werden nicht persistent gespeichert.
- Sessiondaten nach Tab-Schließen verwerfen.
- Offer-Fragmente beim Gast unmittelbar nach erfolgreicher Validierung und Übernahme in die laufende Verbindung mit `history.replaceState` aus der Adresszeile entfernen. Answer-Fragmente in einem versehentlich geöffneten Tab erst entfernen, nachdem der Nutzer sie kopieren konnte; der Host importiert Answers regulär aus einem Eingabefeld.
- SDP kann Netzwerkadressen/Kandidaten enthalten. UI soll bei „Link kopieren“ knapp erklären, dass der Link nur an Mitspieler geschickt werden soll.
- Serialisierte Envelopes auf 64 KiB (= 65.536 Byte) und dekomprimierte Payloads auf 256 KiB (= 262.144 Byte) begrenzen.
- Nie `eval`, `new Function` oder HTML aus Netzwerkdaten ausführen.
- Text aus Netzwerkdaten nur escaped rendern.

## 16. MVP-Umfang

MVP ist fertig, wenn:

1. Drei Browser können ohne Backend über Offer-/Answer-Links eine Session aufbauen.
2. Rollenwahl und Ready-State funktionieren.
3. Eine komplette Schicht mit mindestens 8 Fällen spielbar ist.
4. Jede Rolle besitzt echte, voneinander abhängige Mechaniken.
5. Mindestens 30 Archetypen und die unter Abschnitt 6 genannten Contentmengen sind als lokale Daten vorhanden.
6. Hostautorität und State-Sync funktionieren bei normaler Latenz.
7. Reconnect eines Gasts ist manuell möglich.
8. Ergebnisseite zeigt Statistiken und Seed.
9. Das Spiel sieht erkennbar lustig aus, selbst wenn man alle Texte ausblendet. Mindestens die Pflichtanimationen aus Abschnitt 8.2 müssen implementiert sein.
10. Deployment auf GitHub Pages läuft reproduzierbar.
11. Basiskampagne, freies Spiel und das Tutorial verwenden dieselbe Kernsimulation; nur Konfiguration, Content-Auswahl und Siegbedingungen unterscheiden sich.

## 17. Nicht Teil des MVP

- Integrierter Voice-Chat.
- Matchmaking-Server.
- TURN-Relay.
- Mobile Layouts.
- Accounts, Achievements oder globale Leaderboards.
- Modding-API.
- KI-generierte Dialoge.

## 18. Testplan

### Unit Tests

- Seed produziert deterministische Fallreihenfolge.
- Kanonisch identischer Content erzeugt unabhängig von Dateireihenfolge und Formatierung denselben Content-Hash; relevante Inhaltsänderungen erzeugen einen anderen Hash.
- Host akzeptiert keine Aktion einer falschen Rolle.
- Zustandsreducer ist deterministisch.
- Link-Encoding/Decoding ist round-trip-stabil.
- Falsche Session-ID oder Protokollversion wird abgewiesen.
- Regelkombinationen erzeugen mindestens ein gültiges Ziel.

### Integration Tests

- Host + zwei simulierte Peers erreichen Lobby „connected“.
- Beide Gäste erhalten unterschiedliche Rollenansichten.
- Fallabschluss wird auf allen Peers synchron angezeigt.
- Snapshot stellt einen frisch verbundenen Client wieder her.
- Fehlende oder doppelte Revisionen lösen Resynchronisierung statt stiller Zustandsabweichung aus.
- Eine nach Reconnect wiederholte `actionId` verändert den Zustand nicht erneut.
- Ein Vollreplay aus Startkonfiguration und geordnetem Eingabelog reproduziert auch Timer-, Cooldown-, Eskalations- und Verbindungsabbruchereignisse ohne Wanduhrdaten.

### Manuelle Browser-Tests

- Je ein aktueller stabiler Chrome-, Edge- und Firefox-Browser sowie mindestens ein gemischtes Trio; die letzten zwei stabilen Hauptversionen werden in der Release-Kompatibilitätsmatrix abgedeckt.
- Zwei verschiedene Netzwerke, soweit verfügbar.
- STUN nicht erreichbar: direkte Host-Kandidaten funktionieren, falls die Netzwerklage dies erlaubt; andernfalls erscheint statt eines Hängers ein verständlicher Fehlerzustand.
- Tab im Hintergrund für 30 Sekunden und Rückkehr.
- Gast trennt Netzwerk und reconnectet.
- Answer-Link wird in die bestehende Host-Lobby importiert, ohne deren Verbindungszustand durch Navigation zu verlieren.
- Sehr große oder stark expandierende komprimierte Payloads werden vor WebRTC-Verarbeitung abgewiesen.

## 19. Umsetzungsreihenfolge für Codex

1. Vite/TypeScript/Phaser-Projekt und GitHub-Pages-Workflow anlegen.
2. `signalingLink.ts` mit Offer/Answer-Codec und Tests implementieren.
3. Host-/Guest-WebRTC-Lobby mit zwei Slots bauen.
4. Protokoll und autoritativen State-Reducer implementieren.
5. Rollen-Lobby und Rollenspezifische Dummy-Screens umsetzen.
6. Einen vollständigen vertikalen Fall mit allen drei Rollen implementieren.
7. Content-System datengetrieben ausbauen.
8. Eskalationssystem und Ergebnisbildschirm ergänzen.
9. Visuelle Comedy, Animationen und Audio nicht als spätes Polish behandeln, sondern parallel zu jedem Mechanik-Schritt implementieren.
10. Cross-Browser- und Reconnect-Tests durchführen.

## 20. Definition of Done

Das Produkt gilt als erfolgreich implementiert, wenn drei Personen eine GitHub-Pages-URL öffnen, ohne Account oder Backend eine P2P-Session herstellen, in deutlich verschiedenen Rollen eine vollständige 12–18-minütige Schicht spielen und durch Kommunikation gemeinsam Fälle lösen können. Spielzustand wird ausschließlich zwischen ihren Browsern übertragen. Die Präsentation muss bereits durch Figuren, Maschinen, Animationen und Reaktionen komisch sein; humorvolle Texte allein erfüllen die Definition of Done ausdrücklich nicht.
