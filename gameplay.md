# Höllen-Hotline – Gameplay- und Modusdesign

Stand: 2026-09-23

Dokumentenrang: Dieses Dokument ist die fachliche Quelle für Gameplay, Modi und Inhalte. Harte Produkt-, Technik-, Sicherheits- und Release-Anforderungen stehen in `hoellen-hotline-spezifikation.md`; `TODO.md` ist nur der abgeleitete Umsetzungsplan.

## 1. Spielversprechen

`Höllen-Hotline – Bitte bleiben Sie dran` ist ein kooperatives Kommunikationsspiel für exakt drei Personen. Das Team bearbeitet eine chaotische Schicht im Kundendienst der Hölle. Jeder Spieler besitzt andere Informationen und andere Werkzeuge. Kein Spieler kann einen Fall zuverlässig allein lösen.

Eine Partie soll drei Gefühle abwechseln:

1. gemeinsames Ermitteln unter Zeitdruck,
2. hektisches Abstimmen vor einer irreversiblen Entscheidung,
3. eine kurze, visuelle Pointe als Konsequenz.

Die Komik kommt aus Figuren, unzuverlässigen Maschinen, bürokratischen Regeln und Timing. Lange Gags dürfen weder Eingabe noch relevante Informationen verdecken.

## 2. Bildschirm- und Informationskonzept

Das Gameplay-Mockup ist eine Referenz für Art Direction und Informationsarten, nicht für einen gemeinsamen Bildschirm mit drei vollständig bedienbaren Pulten.

Jeder Spieler sieht:

- sein eigenes großes, interaktives Rollenpult,
- dieselbe Höllenleitstelle als visuell zusammenhängende Umgebung,
- einen gemeinsamen schmalen Statusbereich,
- reduzierte Silhouetten oder kleine Aktivitätsanzeigen der beiden Kollegen.

Jeder Spieler sieht nicht:

- die konkreten Antwortoptionen des Agenten,
- vollständige Suchresultate, Akten und versteckte Regeln des Archivars,
- exakte Einstellungen, Störungslösung oder Zielvalidierung des Disponenten,
- die geheime, hostseitige Musterlösung.

Gemeinsam sichtbar sind nur Informationen, die das Team bewusst teilt oder die zur Koordination nötig sind:

- Fall-ID und Phase,
- Warteschlangenlänge und Schichtzeit,
- Teamdruck in drei Kategorien,
- bis zu drei Agenten-Hinweistags,
- bis zu zwei Archivar-Pins,
- Disponentenstatus `unvorbereitet`, `Ziel vorbereitet`, `Störung`, `bereit`,
- Freigaben der Rollen,
- Verbindung und Pause.

So sieht jeder Spieler, dass die Kollegen arbeiten, aber nicht deren Lösung. Kommunikation bleibt Kernmechanik. Eine optionale lokale Debug-/Demoansicht darf alle drei Pulte zeigen, ist aber kein regulärer Spielmodus.

## 3. Grundbegriffe

- Schicht: eine vollständige Partie von etwa 12–18 Minuten.
- Fall: eine Seele vom Eintritt in die Queue bis zur Auflösung.
- aktiver Fall: der Fall, über den der Agent gerade spricht und für den Teamaktionen gelten.
- Regel: allgemeine Zuordnungsbedingung für Ziele oder Strafen.
- Ausnahme: überschreibt eine allgemeine Regel mit klar definierter Priorität.
- Störung: temporäres Problem der Routingmaschine.
- Freigabe: widerrufbare Zustimmung vor dem finalen Routing.
- Routing: irreversibler Abschluss eines Falls durch den Disponenten.
- Druck: gemeinsame Fehler-/Zeitressourcen `queuePressure`, `boilerPressure`, `auditRisk`.

## 4. Rollen

### 4.1 Agent der Höllen-Hotline

Aufgabe: mit dem Anrufer sprechen, dessen wahres Anliegen erkennen und die wichtigsten Hinweise strukturiert weitergeben.

Der Agent sieht:

- den aktuellen Anrufer mit Portrait, Fall-ID, behaupteter Identität und Stimmung,
- den laufenden Dialog und 3–5 mögliche Antworten,
- grobe Queue-Dringlichkeit,
- drei eigene Hinweis-Slots,
- öffentlich gepinnte Archivar-Karten und den Vorbereitungsstatus des Disponenten.

Der Agent sieht nicht die vollständige Lebensakte, alle Tagesregeln oder die korrekte Maschinenkonfiguration.

Aktionen:

- Gespräch annehmen.
- Dialogantwort wählen. Antworten können Information, Stimmung, Zeit oder Glaubwürdigkeit verändern.
- einmal pro Cooldown unterbrechen. Das spart Zeit, kann aber Hinweise verlieren oder Stimmung verschlechtern.
- entdeckten Hinweis als einen von höchstens drei Tags veröffentlichen; ein voller Slot muss bewusst ersetzt werden.
- einen Zielbereich zur Vorbereitung vorschlagen. Das ist keine bindende Entscheidung.
- Freigabe erteilen oder vor dem finalen Hebel widerrufen.

Gutes Spiel bedeutet nicht, jeden Dialogknoten zu öffnen. Der Agent muss einschätzen, welche Information für den Archivar fehlt und wann weiteres Fragen mehr kostet als es bringt.

### 4.2 Archivar der Verdammnis

Aufgabe: die passende Akte finden, aktuelle Klauseln auslegen und eine begründete Freigabe empfehlen.

Der Archivar sieht:

- Suchregister und gefundene Dossiers,
- Namen, Aliasse, Lebensereignisse, Sünden-Tags, Beschwerden und markierte Unstimmigkeiten,
- das aktuelle Regelbuch samt Tagesklauseln und Ausnahmen,
- die veröffentlichten Agenten-Tags,
- Zielvorbereitung und Freigabestatus.

Der Archivar sieht nicht den vollständigen Dialogverlauf, nicht alle Stimmungsreaktionen und nicht die exakten Maschinenwerte.

Aktionen:

- nach Name, Alias, Beruf, Ereignis oder Tag suchen.
- Karten vergleichen und bis zu zwei davon öffentlich pinnen.
- Regeln und Querverweise nachschlagen.
- den Fall `VERIFIZIERT`, `FRAGWÜRDIG` oder `AUF KEINEN FALL FREIGEBEN` stempeln.
- eine Freigabe erteilen oder widerrufen.

Suchtreffer dürfen widersprüchlich sein, müssen aber fair auflösbar bleiben. Falsche Ergebnisse besitzen rekonstruierbare Warnzeichen; reines Raten ist kein gewünschter Schwierigkeitsfaktor.

### 4.3 Disponent der neun Kreise

Aufgabe: ein Ziel technisch vorbereiten, Störungen beherrschen und das beschlossene Routing ausführen.

Der Disponent sieht:

- verfügbare Zielbereiche und deren öffentliche Kurzbeschreibung,
- Maschinenlayout, Regler, Hebel, Ventile, Druck und Temperatur,
- technische Anforderungen des gewählten Ziels,
- veröffentlichte Tags/Pins und Freigaben.

Der Disponent sieht nicht die vollständige Akte, alle Regeltexte oder alle Dialoghinweise.

Aktionen:

- Ziel vorwählen; das Team sieht nur Zielname und Status.
- 3–6 Controls einstellen.
- Störung diagnostizieren und Gegenaktion ausführen.
- Bereitschaft melden.
- nach den erforderlichen Freigaben den finalen Hebel ziehen.

Das finale Routing ist bewusst befriedigend, aber nicht blind: Unmittelbar davor zeigt die Maschine eine kurze Zusammenfassung der öffentlich bekannten Wahl. Der Host validiert Ziel, Freigaben, Fallphase und technische Bedingungen erneut.

## 5. Fallablauf

### Phase A – Eingang

Eine Seele rückt in der Queue vor. Der gemeinsame Bereich zeigt Nummer, Dringlichkeit und Warteverhalten. Der Agent nimmt den Fall an. Nicht angenommene Anrufe erhöhen nach einer Gnadenzeit den Queue-Druck.

### Phase B – Parallele Ermittlung

Der Agent spricht, der Archivar sucht, der Disponent prüft mögliche Ziele und aktuelle Maschinenlage. Spieler dürfen jederzeit extern miteinander sprechen. Strukturierte Pins ergänzen Sprache, ersetzen sie aber nicht.

### Phase C – Hypothese

Das Team formuliert ein Ziel. Der Disponent wählt es vor und bereitet die Anlage vor. Agent und Archivar prüfen ihre jeweiligen Hinweise. Ein Zielwechsel ist möglich, kostet aber Maschinenzeit und kann bei hoher Eskalation Druck erzeugen.

### Phase D – Freigabe

Standardmäßig müssen Agent und Archivar freigeben und der Disponent `bereit` melden. Kampagnenmodifikatoren können doppelte Stempel, vertauschte Zuständigkeit oder ein kurzes Zeitfenster verlangen. Jede Freigabe ist bis zum Hebelzug widerrufbar.

### Phase E – Routing

Der Disponent zieht den finalen Hebel. Weitere Eingaben für diesen Fall werden gesperrt. Der Host berechnet das Ergebnis anhand des kanonischen Zustands.

### Phase F – Konsequenz

Eine 2–5 Sekunden lange Vignette zeigt das Ergebnis. Korrekte Zuordnung kann ebenfalls absurd schief aussehen, ist mechanisch aber positiv. Fehler ändern Druckwerte, Queue, Maschine oder spätere Regeln. Danach wird die Begründung knapp aufgedeckt und der nächste Fall aktiv.

## 6. Bewertung und Niederlage

Gemeinsame Werte liegen jeweils zwischen 0 und 100:

- `queuePressure`: steigt durch lange Wartezeiten, verpasste Anrufe und unnötig lange Gespräche.
- `boilerPressure`: steigt durch falsche Maschinenbedienung, hektische Zielwechsel und bestimmte Störungen.
- `auditRisk`: steigt durch falsche Akten, widersprüchliche Freigaben und Fehlleitungen.

Ein normaler Fehler erhöht einen oder zwei Werte. Ein katastrophaler Fehler kann zusätzlich eine Folgekomplikation erzeugen. Gute Serien, saubere Dokumentation und seltene perfekte Lösungen senken begrenzt Druck.

Die Schicht endet:

- erfolgreich nach der vorgegebenen Fallzahl bzw. Szenarioaufgabe,
- vorzeitig, sobald zwei der drei Druckwerte gleichzeitig 100 erreichen,
- durch Aufgabe des Hosts oder endgültigen Verbindungsverlust.

Es gibt keine einfache Sternebewertung. Die Abschlussakte zeigt:

- korrekt, vertretbar und falsch gelöste Fälle,
- katastrophale Fehler,
- durchschnittliche Bearbeitungszeit,
- knappste Rettung und häufigste Fehlerursache,
- aktive Mutatoren,
- Seed und Content-Version,
- eine illustrierte Dienstbeurteilung.

## 7. Schwierigkeit und Eskalation

Schwierigkeit verändert Informations- und Bedienlast, nicht bloß Zahlen.

- Entspannt: längere Timer, deutlichere Warnzeichen, seltene Störungen, weniger Regelkonflikte.
- Standard: vorgesehene 12–18 Minuten, normale Mehrdeutigkeit und Störungsrate.
- Höllisch: knappere Zeitfenster, mehr gleichzeitige Fälle, subtilere Aktenfehler und kombinierte Störungen.

Nach jeweils zwei abgeschlossenen Fällen startet ein angekündigter Schichtmodifikator, sofern die Schicht noch mindestens einen weiteren Fall enthält. Beispiele:

- Audit aus der Oberhölle: jeder dritte Stempel braucht eine zweite Freigabe.
- Kesseldruck: Zielvorbereitung besitzt kürzere stabile Zeitfenster.
- Montag: Anrufer starten gereizter.
- Formularreform: zwei klar markierte Regelbegriffe tauschen ihre Bedeutung.
- Praktikant: eine Aktenseite ist falsch einsortiert, trägt aber rekonstruierbare Spuren.

Ein Modifikator muss mindestens eine sichtbare Vorwarnung, eine verständliche Regelkarte und eine eindeutige Endbedingung besitzen.

## 8. Fallgenerierung und Fairness

Ein Fall kombiniert lokal gespeicherte Bausteine:

```text
Archetyp
+ 2–4 Lebens-/Sünden-Tags
+ Beschwerde
+ wahre Zielbedingung
+ 0–2 Ausnahmen
+ optionaler Twist
+ Präsentationsprofil
```

Der Host erzeugt alle Zufallsentscheidungen aus einem 128-Bit-Seed. Der Generator arbeitet in dieser Reihenfolge:

1. erlaubten Content-Pool des Szenarios bestimmen,
2. Ziel und wahre Begründung wählen,
3. kompatiblen Archetyp und Tags zusammensetzen,
4. Ausnahmen und mögliche Ablenkungen hinzufügen,
5. Rollenhinweise so verteilen, dass mindestens zwei Rollen beitragen müssen,
6. Lösbarkeit mit der Regel-Engine prüfen,
7. Dialog, Aktenfunde, Maschine und Reaktionen instanziieren.

Fairnessregeln:

- Mindestens ein Ziel ist regelkonform.
- Falls mehrere Ziele vertretbar sind, wertet das Ergebnis sie nachvollziehbar abgestuft.
- Kein notwendiger Hinweis darf ausschließlich in einer zufälligen, nicht wiederholbaren Animation liegen.
- Ein absichtlich falscher Datensatz besitzt mindestens ein entdeckbares Gegenindiz.
- Eine Störung darf die einzige korrekte Lösung nicht dauerhaft sperren.
- Gleiche Seeds und Aktionen erzeugen dieselben Fälle und Ergebnisse.

## 9. Matchmaking und Lobby

### 9.1 Privates Matchmaking im MVP

Da das Spiel statisch gehostet wird und keinen Signalisierungsserver besitzt, bedeutet Matchmaking im MVP: Drei bekannte Personen bilden über Einladungs- und Antwortlinks eine private Gruppe.

Ablauf:

1. Ein Spieler wählt Modus, Kampagne/Szenario, Schwierigkeit und optional einen Seed und erstellt die Lobby.
2. Der Host erzeugt getrennte Einladungslinks für Gast 1 und Gast 2.
3. Jeder Gast öffnet seinen Link, prüft Session-Kürzel und erstellt einen Antwortlink.
4. Der Host importiert beide Antworten; die DataChannels werden geprüft.
5. Jeder Spieler wählt selbst eine freie Rolle.
6. Die Lobby prüft Content-Version und Kampagnen-Hash.
7. Alle führen optional einen Ping-Test durch und setzen sich auf bereit.
8. Der Host startet, wenn drei eindeutige Rollen besetzt sind.

Die Lobby zeigt pro Platz: Anzeigename nur für diese Session, Rolle, Verbindung, Ping, Content-Kompatibilität und Ready. Es gibt kein Konto und keine öffentliche Spielerliste.

Scheitert eine direkte P2P-Verbindung, erklärt die UI, dass diese Netzwerkkombination ohne Relay nicht funktioniert. Sie bietet einen neuen Versuch und neue Links an, behauptet aber nicht, automatisch einen Server zu suchen.

### 9.2 Reconnect

Bei Verlust eines Gasts pausiert der Host die Schicht insgesamt für bis zu 60 Sekunden. Der Slot und die Rolle bleiben reserviert. Über einen neuen, slotspezifischen Reconnect-Link wird die Verbindung aufgebaut; anschließend erhält der Gast einen rollengefilterten Snapshot. Nach Ablauf endet die Partie im MVP; ein Bot-Ersatz oder eine unbegrenzt wiederholbare Pause ist nicht vorgesehen.

### 9.3 Öffentliches Quick-Match als spätere Erweiterung

Öffentliches Matchmaking benötigt mindestens einen Raum-/Signalisierungsdienst, Missbrauchsschutz und üblicherweise TURN für verlässliche Verbindungen. Es wird hinter einem `MatchmakingProvider` ergänzt:

```ts
interface MatchmakingProvider {
  createRoom(request: RoomRequest): Promise<RoomTicket>;
  joinRoom(code: string): Promise<RoomTicket>;
  quickMatch(preferences: MatchPreferences): Promise<RoomTicket>;
  leave(ticket: RoomTicket): Promise<void>;
}
```

Der private Link-Provider bleibt Standard. Ein künftiger Service darf Lobby und Spielprotokoll verwenden, aber weder Spielsimulation noch geheime Rolleninformationen hosten müssen.

## 10. Spielmodi

Alle Modi konfigurieren denselben Kern. Sie liefern Content-Pool, Fallplan, Mutatoren, Siegbedingung und Ergebnisregeln. Rollenaktionen, Netzprotokoll und Pulte bleiben unverändert.

### 10.1 Kampagne

Eine Kampagne besteht aus Kapiteln; Kapitel bestehen aus Szenarien. Ein Szenario ist eine Schicht mit kuratiertem Seed oder Seed-Regeln, erlaubtem Content, Intro/Outro, Mutatoren und Zielen.

Beispielstruktur:

```text
Basiskampagne: Probezeit in der Ewigkeit
  Kapitel 1: Erster Arbeitstag
    1. Die Leitung glüht
    2. Formulare, Feuer, Feierabend
  Kapitel 2: Audit aus der Oberhölle
    1. Der Prüfer hört mit
    2. Stempel unter Verdacht
  Kapitel 3: Kesselstreik
    1. Dienst nach Vorschrift
    2. Die große Fehlleitung
```

Szenarioziele können sein:

- eine feste Zahl Fälle bearbeiten,
- einen bestimmten Druckwert unter einem Grenzwert halten,
- eine Sonderseele korrekt zuordnen,
- mehrere Fälle unter einem Kampagnenmutator überstehen.

Fortschritt:

- Der Host wählt seinen lokal gespeicherten Kampagnenstand.
- Gäste müssen das Content-Paket besitzen, benötigen aber keinen identischen Fortschritt.
- Nach Erfolg wird das nächste Szenario lokal beim Host freigeschaltet; auf Wunsch exportiert der Host einen kurzen Fortschrittscode bzw. eine JSON-Datei für Gerätewechsel.
- Gäste erhalten in ihrer lokalen Historie einen Abschlussvermerk, aber der Host entscheidet, welche Lobbykampagne gestartet wird.
- Ein Scheitern sperrt nichts dauerhaft; das Szenario kann sofort mit gleichem oder neuem Seed wiederholt werden.

Kampagnen dürfen neue Regeln, Archetypen, Ziele, Maschinenlayouts, Reaktionen und Art-Sets hinzufügen. Sie dürfen bestehende Kern-IDs nicht still überschreiben.

### 10.2 Freies Spiel

Freies Spiel erzeugt eine eigenständige Schicht ohne Freischaltlogik. Der Host konfiguriert:

- Seed oder Zufall,
- 8–12 Fälle bzw. kurze/lange Schicht,
- Schwierigkeit,
- erlaubte Kampagnen-/Content-Pakete,
- Dichte der Störungen,
- Modifikator-Pool,
- kuratierte oder zufällige Maschinenlayouts.

Presets:

- Feierabendrunde: 8 Fälle, entspannt, wenige Störungen.
- Dienstplan: 10 Fälle, Standard, normale Eskalation.
- Ewige Warteschleife: 12 Fälle, höllisch, kombinierte Mutatoren.

Ein Seed ist nur zusammen mit Preset, Content-Hash und Spielversion reproduzierbar. Diese Angaben stehen in der Abschlussakte.

### 10.3 Tutorial

Das Tutorial ist eine reguläre Drei-Spieler-Partie und besteht aus:

1. einer kurzen, gleichzeitig oder nacheinander aktivierten geführten Station an jedem der drei Rollenpulte,
2. einem gemeinsamen, fehlertoleranten Übungsfall,
3. einer Zusammenfassung der sichtbaren und geheimen Informationen.

Die drei Spieler bleiben dabei in ihren gewählten Rollen; eine Station zeigt nur ihrem Besitzer die geführten Eingaben, während die anderen kurze eigene Aufgaben oder eine klar begrenzte Wartephase erhalten. Der gemeinsame Übungsfall kann nicht an Druckwerten scheitern. Er erklärt ausdrücklich, dass Screens nicht geteilt werden sollen und welche Informationen über Tags/Pins öffentlich werden. Eine lokale Einzelrollen-Vorschau ist nur ein Debug-/Eingabetest und kein fortschrittswirksames Tutorial.

## 11. Modulare Kampagnenstruktur

Jede Kampagne liegt in einem eigenen Namespace und besitzt ein Manifest.

```ts
type CampaignManifest = {
  schemaVersion: 1;
  id: string;
  version: string;
  titleKey: string;
  descriptionKey: string;
  requiredCoreVersion: string;
  dependencies: Array<{ id: string; version: string }>;
  chapters: ChapterId[];
  contentPacks: ContentPackId[];
  assetPack: string;
};

type Chapter = {
  id: ChapterId;
  titleKey: string;
  scenarios: ScenarioId[];
  unlock: UnlockCondition;
};

type Scenario = {
  id: ScenarioId;
  mode: 'campaign';
  allowedContent: ContentSelector;
  casePlan: CasePlan;
  machineLayouts: MachineLayoutId[];
  startingRules: RuleId[];
  mutators: MutatorSchedule;
  victory: VictoryCondition;
  intro?: NarrativeBeatId;
  outro?: NarrativeBeatId;
};
```

Deklarative Bedingungen verwenden einen begrenzten Operatorensatz wie `all`, `any`, `not`, `hasTag`, `hasStamp`, `destinationIs`, `pressureBelow` und `caseCountAtLeast`. Content enthält keinen ausführbaren Code.

Registrierung:

1. Manifest und Abhängigkeiten laden.
2. Schema-Version prüfen.
3. alle IDs mit Namespace registrieren.
4. Referenzen und Asset-IDs prüfen.
5. Kampagnen-Hash bilden.
6. erst dann in Modusauswahl und Lobby anzeigen.

Damit kann eine weitere Kampagne hinzugefügt werden, ohne Reducer, Netzwerkcode oder Rollenpulte zu ändern. Neue echte Mechaniken benötigen dagegen eine versionierte Core-Erweiterung und passende Fallback-Darstellung.

## 12. Zustands- und Sichtbarkeitsmodell

Der Host hält den vollständigen `GameState`. Daraus entsteht für jeden Spieler ein `PlayerViewState`.

```ts
type PlayerViewState = {
  public: PublicShiftView;
  role: AgentView | ArchivistView | DispatcherView;
  presentation: PresentationEvent[];
};
```

`PublicShiftView` enthält ausschließlich gemeinsam sichtbare Daten. Rollenansichten sind disjunkte Typen. Ein Gastclient erhält niemals zunächst den Gesamtzustand, um ihn anschließend lokal zu verstecken. Beim Host bleibt der kanonische Zustand technisch im selben Browser verfügbar; die normale Oberfläche erhält dennoch nur die Projektion seiner Rolle.

Beispiele:

| Information | Agent | Archivar | Disponent | Gemeinsam |
|---|---:|---:|---:|---:|
| konkrete Dialogoptionen | ja | nein | nein | nein |
| Anruferstimmung | genau | grob nach Pin | nein | nein |
| vollständige Dossiers | nein | ja | nein | nein |
| vollständiger Regeltext | nein | ja | nein | nein |
| exakte Maschinenwerte | nein | nein | ja | nein |
| Agenten-Hinweistags | ja | ja | ja | ja |
| Archivar-Pins/Stempel | ja | ja | ja | ja |
| vorgewähltes Ziel | ja | ja | ja | ja |
| wahre Lösung vor Routing | nein | nein | nein | nein |

## 13. Content- und Maschinen-Erweiterbarkeit

Rollenmechaniken kommunizieren über Domain-Events und öffentliche Fakten:

- Der Agent erzeugt `HintPublished`.
- Der Archivar erzeugt `RecordPinned` und `StampChanged`.
- Der Disponent erzeugt `DestinationPrepared` und `MachineReadyChanged`.
- Nur der Host erzeugt `CaseResolved`.

Ein Maschinenlayout deklariert Controls, Zustandsvariablen, Anforderungen und Präsentationsbindungen. Es darf keine Kampagnenlogik direkt kennen. Eine Kampagne wählt Layouts und Mutatoren über IDs.

Ein neuer Zielbereich benötigt mindestens:

- ID, Name, Symbol und Farbalternative,
- öffentliche Beschreibung,
- deklarative Eignungsbedingungen,
- Maschinenanforderungen,
- korrekte, vertretbare und falsche Reaktionen,
- Fallback-Assets und Audio.

## 14. Sprite-Integration und visuelle Inszenierung

Die Referenzbilder geben folgende Richtung vor:

- stark konturierte 2D-Cartoonfiguren,
- warmes Höllenlicht gegen kaltes Seelen-Cyan,
- schiefe, physisch wirkende Rahmen statt glatter Karten,
- Papier, Bakelit, Metall, Neon, Rohre und Ketten als UI-Material,
- überzeichnete Gesichter und gut lesbare Silhouetten,
- viele kleine Hintergrundgags, aber klare Hierarchie der Eingabe.

Sprites werden nicht als monolithischer Screenshot verwendet. Die Szene besteht aus austauschbaren Ebenen:

```text
Hintergrund / Parallax
Umgebungsrequisiten
Pult-Rahmen und Maschinenkörper
interaktive Controls
Figur-Körperteile oder Frameanimation
UI-Karten und Texte
Vordergrund-FX
DOM-Overlay
```

Jede Animation besitzt eine stabile Asset-ID und Metadaten für Pivot, Frames, Bildrate, Loop, Eventmarker und reduzierte Bewegung. Gameplay wartet nie auf das Ende einer kosmetischen Animation. Reaktionsereignisse dürfen zusammengefasst oder verworfen werden, wenn zu viele gleichzeitig eintreffen.

Pflichtinszenierungen:

- nerviger Anrufer: Telefonhörer windet sich, Agent reagiert sichtbar.
- falsche Archivsuche: Schrank hustet Papier aus.
- Stempel: Papier/UI wird kurz zusammengedrückt und federt zurück.
- falsches Routing: Förderband/Falltür mit kurzer Slapstickfolge.
- korrektes Routing: absurder Mini-Aufzug mit übertriebenem Rauch.
- hoher Druck: Anzeigen zittern, glühen oder schwitzen.
- Katastrophe: Büropflanze und Hintergrundpersonal reagieren.

Wichtige Informationen bleiben über den Effekten und werden zusätzlich durch Symbol oder Text vermittelt.

## 15. Pause, Abbruch und Sonderfälle

- Menü-Pause: nur der Host kann die gemeinsame Simulation pausieren; Gäste können ihr lokales Menü öffnen, ohne die Zeit anzuhalten.
- Disconnect-Pause: automatisch und deutlich sichtbar; pro zusammenhängendem Verbindungsverlust gilt ein gemeinsames Budget von maximal 60 Sekunden, auch wenn beide Gäste nacheinander oder gleichzeitig betroffen sind. Ein neuer Ausfall nach erfolgreicher Wiederaufnahme startet ein neues Budget.
- Hintergrundtab: Der Host berechnet Zeit monoton; Clients interpolieren nur die Anzeige und resynchronisieren beim Zurückkehren.
- ungültige Aktion: wird ohne Zustandsänderung abgewiesen und am auslösenden Pult erklärt.
- Content-Mismatch: Start bleibt gesperrt; betroffener Spieler sieht erwartete und vorhandene Paketversion.
- Host-Verlust: Partie endet im MVP, weil kein Host-Migrationsprotokoll vorgesehen ist.
- Aufgabe: erfordert Bestätigung und erzeugt eine Abschlussakte ohne regulären Kampagnenerfolg.

## 16. Gameplay-Abnahmekriterien

Das Design ist spielerisch erfüllt, wenn:

- jede Lösung Wissen oder Handlung von mindestens zwei Rollen benötigt,
- keine Rolle regelmäßig länger als 20 Sekunden ohne sinnvolle Entscheidung bleibt,
- Spieler fremde Pulte nicht sehen müssen, um den gemeinsamen Schritt zu verstehen,
- strukturierte Hinweise nützlich sind, Sprache aber nicht vollständig ersetzen,
- ein Standardspiel 8–12 Fälle in etwa 12–18 Minuten abwickelt,
- Niederlagen nachvollziehbar auf Teamentscheidungen zurückzuführen sind,
- neue Kampagnen durch Manifest und Content-Pakete ergänzt werden können,
- freie Spiele über Seed, Preset, Content-Hash und Version reproduzierbar sind,
- die Oberfläche schon ohne Text als komische Höllenleitstelle funktioniert.
