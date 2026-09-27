# Höllen-Hotline UI Authenticity Implementation Plan

## Ziel

Die drei Rollenoberflächen von **Höllen-Hotline** sollen visuell deutlich näher an die bestehenden Mockups und die Art-Bible gebracht werden, ohne Lesbarkeit, Accessibility oder Bedienbarkeit zu verschlechtern.

Die drei Rollen müssen auf den ersten Blick unterscheidbar sein:

- **Agent**: Telefonarbeitsplatz, Anrufer, Gespräch, Antwortskript
- **Archivar**: Aktenschrank, Dossiers, Regelbuch, Stempel
- **Disponent**: Maschinenkonsole, Zielbank, Regler, finaler Hebel

Gleichzeitig müssen alle drei Ansichten wie Arbeitsplätze im selben chaotischen Höllen-Kontrollraum wirken.

---

# 0. Arbeitsregeln für Codex

## 0.1 Änderungen schrittweise durchführen

Codex soll die Implementierung in den unten beschriebenen Phasen durchführen.

Nach jeder Phase:

1. Anwendung starten.
2. Alle drei Rollen öffnen.
3. Visuell prüfen.
4. Bestehende Interaktionen testen.
5. Erst danach mit der nächsten Phase fortfahren.

Keine komplette UI in einem einzigen Schritt neu schreiben.

---

## 0.2 Funktionalität vor Optik schützen

Bestehende Spielmechaniken dürfen während des visuellen Refactorings nicht verändert werden, sofern dies nicht ausdrücklich in diesem Dokument gefordert wird.

Insbesondere erhalten bleiben müssen:

- Rollenlogik
- Freigaben
- Queue-Logik
- Fallstatus
- Suchfunktion
- Tastaturbedienung
- Fokuszustände
- Reduced Motion
- Text-/UI-Skalierung
- Farb-unabhängige Statusinformationen

---

## 0.3 DOM und Accessibility erhalten

Interaktive Elemente sollen weiterhin echte DOM-Elemente bleiben.

Beispiele:

- Buttons bleiben `<button>`
- Suche bleibt `<input>`
- Tabs/Register bleiben semantisch bedienbar
- Form Controls bleiben per Tastatur erreichbar
- Labels bleiben programmatisch zugeordnet

Grafiken und Sprites dienen nur der visuellen Darstellung.

Keine kritische Interaktion ausschließlich in Canvas oder als nicht-semantische Bildfläche implementieren.

---

# 1. Gemeinsame visuelle Basis schaffen

## Ziel

Ein wiederverwendbares UI-System aufbauen, das alle drei Rollen benutzen.

Die Oberfläche soll weniger wie eine Web-App und stärker wie ein physischer Arbeitsplatz wirken.

---

## 1.1 Gemeinsame UI-Primitives anlegen

Folgende Komponenten oder entsprechende Varianten erstellen:

### `MetalHousing`

Verwendung:

- Maschinenrahmen
- Anzeigen
- HUD-Gehäuse
- Konsolen
- Schilder

Eigenschaften:

- dunkles Metall
- Kratzer
- helle Kanten
- Schrauben oder Nieten
- keine perfekten, sterilen Rechtecke

---

### `PaperSurface`

Varianten:

- Karteikarte
- Formular
- Notizzettel
- Clipboard
- Aktenblatt
- Endlospapier

Eigenschaften:

- heller, vergilbter Untergrund
- dunkle Schrift
- leichte Materialvariation
- Text selbst nicht rotieren

---

### `BakeliteControl`

Verwendung:

- Buttons
- Drehregler
- Telefonsteuerung
- Hebel
- Kippschalter

Eigenschaften:

- physische Tiefe
- klare Hover-, Focus- und Active-Zustände
- nicht nur über Farbe unterscheiden

---

### `NeonIndicator`

Verwendung ausschließlich für:

- aktive Signale
- Warnlampen
- Seelen-/Anruferstatus
- Maschinenzustände

Nicht verwenden als generische Umrandung für jeden Container.

---

### `PhysicalLabel`

Varianten:

- Metallschild
- Papieretikett
- Gravur
- Registerlasche
- Prägeschild

Diese Komponente ersetzt möglichst viele klassische Section-Headlines.

---

## 1.2 Material-Tokens definieren

Bestehende Design-Tokens prüfen und um semantische Tokens ergänzen.

Beispiel:

```css
--material-metal-dark
--material-metal-edge
--material-wood-dark
--material-paper
--material-paper-aged
--material-bakelite
--signal-cyan
--signal-warning
--signal-danger
--ink-primary
--ink-muted
```

Keine Rollenfarbe direkt als alleinige Bedeutung verwenden.

---

## 1.3 Gemeinsame Abstände vereinheitlichen

Trotz absichtlich chaotischer Optik soll das Interaktionslayout intern einem klaren Raster folgen.

Empfehlung:

- Basisabstand: 8 px
- kleine Abstände: 4 / 8 px
- Standardabstände: 16 px
- große Abstände: 24 / 32 px

Dekorative Elemente dürfen asymmetrisch sein.

Text, Buttons und Controls bleiben systematisch ausgerichtet.

---

## 1.4 Akzeptanzkriterien

Phase 1 ist abgeschlossen, wenn:

- alle fünf UI-Primitives existieren
- mindestens eine Rolle die neuen Komponenten bereits verwendet
- keine bestehende Funktion verloren gegangen ist
- Fokuszustände weiterhin sichtbar sind
- Text auf Papier und Metall kontrastreich bleibt

---

# 2. Gemeinsames HUD umbauen

## Ziel

Die obere Statusleiste soll nicht mehr wie ein klassisches App-HUD wirken.

Die Position wichtiger Informationen bleibt jedoch rollenübergreifend konsistent.

---

## 2.1 Queue

Aktuelle Queue-Darstellung durch ein kleines Sichtfenster oder mechanisches Zählwerk darstellen.

Anforderungen:

- Zahl weiterhin klar lesbar
- Warteschlangenstatus sofort erkennbar
- optional kleine Geister-/Seelen-Silhouetten als Dekoration

---

## 2.2 Schichtzeit

Darstellung als:

- mechanische Uhr
- analoges Instrument
- altes digitales Zählwerk

Zeittext bleibt explizit sichtbar.

---

## 2.3 Stresswerte

Drei Stresswerte als:

- Manometer
- Warnlampen
- analoge Anzeigen

Jeder Wert benötigt zusätzlich:

- Textlabel oder Symbol
- numerische oder klar gestufte Information
- nicht nur Farbe

---

## 2.4 Fall-ID

Als:

- Metallplakette
- Papieretikett
- angeheftete Karte

darstellen.

---

## 2.5 Freigaben

Drei Freigaben als Kontrolllampen mit:

- Symbol
- Text
- Status

Darstellung nicht ausschließlich grün/rot.

---

## 2.6 Akzeptanzkriterien

- HUD wirkt wie Teil eines physischen Arbeitsplatzes
- Informationspositionen bleiben auf allen Rollen gleich
- Werte sind ohne Hover lesbar
- Status bleibt bei Farbsehschwäche verständlich

---

# 3. Agent neu gestalten

## Ziel

Der Agent soll von einem Dashboard zu einem echten Telefonarbeitsplatz werden.

---

## 3.1 Layout neu strukturieren

Zielaufteilung:

- links: ca. 25–30 %
- Mitte: ca. 45–50 %
- rechts: ca. 20–25 %

### Links

- Agentenfigur
- Telefon
- Tischkante
- Kabel
- primäre Telefonaktion

### Mitte

- Anrufer
- Gespräch
- Antwortoptionen

### Rechts

- öffentliche Hinweise
- teambezogene Informationen
- Sekundärstatus

---

## 3.2 Agentenfigur integrieren

Aktuelles Portrait-artiges Framing reduzieren oder entfernen.

Figur stärker mit Arbeitsplatz verzahnen:

- Körper teilweise hinter Tisch
- Telefon in direkter Nähe
- Kabel über oder hinter UI
- kleine Reaktionsanimationen zulassen

Keine Interaktionsfläche verdecken.

---

## 3.3 Anruferbereich als Seelenmonitor

Den Caller-Bereich visuell priorisieren.

Elemente:

- großes Portrait
- cyanfarbenes Seelensignal
- Fall-ID als Papierstreifen
- Stimmungszustand als Gesicht + Symbol
- Gesprächsstatus

Cyan ausschließlich für Anrufer-/Seelensignale verwenden.

---

## 3.4 Gesprächsverlauf

Statt eines normalen Panels:

- Schreibblock
- Endlospapier
- Formularbogen

verwenden.

Anforderungen:

- Text horizontal
- ausreichend Zeilenhöhe
- keine Textur direkt hinter kleiner Schrift
- Auto-Scroll nur wenn bereits vorhanden oder sinnvoll

---

## 3.5 Antwortoptionen

Aktuelle gleichförmige Buttons in Telefon-Skriptstreifen umwandeln.

Jede Option enthält:

- große Nummer `1–5`
- Antworttext
- optional kleines semantisches Symbol

Interaktion:

- Hover: Papier leicht anheben
- Focus: klarer Fokusrahmen
- Active: visuell gedrückt/eingezogen
- Auswahl nicht nur per Farbe kennzeichnen

---

## 3.6 Telefonaktionen

`Annehmen` und `Unterbrechen` physischer darstellen.

Mögliche Darstellung:

- Bakelit-Taster
- Hörer
- großer mechanischer Knopf

Primäraktion muss visuell klar dominieren.

---

## 3.7 Öffentliche Hinweise

Hinweisbereich als Klemmbrett oder Stecksystem darstellen.

Drei Slots:

- als einzelne Papierzettel
- klar voneinander getrennt
- Hinzufügen/Ersetzen visuell nachvollziehbar

Beim Ersetzen:

- alten Zettel visuell entfernen
- neuen Zettel einsetzen

Animation muss Reduced Motion respektieren.

---

## 3.8 Akzeptanzkriterien Agent

- Rolle ist ohne Text als Telefonarbeitsplatz erkennbar
- Anrufer ist visuell wichtigster Inhaltsbereich
- Antworten bleiben schnell scanbar
- Telefonaktion ist sofort erkennbar
- Hinweise sind verständlich und nicht dekorativ überladen
- vollständige Tastaturbedienung bleibt erhalten

---

# 4. Archivar neu gestalten

## Ziel

Die Archivar-Ansicht soll nicht wie eine Suchanwendung, sondern wie ein physischer Bürokratie-Arbeitsplatz wirken.

---

## 4.1 Grundlayout

Empfohlene Aufteilung:

### Links

- Aktenschrank
- Suchfeld
- Register
- Ergebniszugriff

### Mitte

- ausgewähltes Dossier
- Akteninhalt
- Beschwerde
- Unstimmigkeiten

### Rechts

- Regelbuch
- Tagesklauseln
- Ausnahmen
- Querverweise

### Unten

- Stempel
- öffentliche Pins/Freigaben

---

## 4.2 Suchfeld in Karteikasten integrieren

Echtes DOM-Input behalten.

Visuell darstellen als:

- Beschriftungsfenster
- Karteikasten-Suchfeld
- Schreibmaschinen-/Büroelement

Fokuszustand weiterhin klar sichtbar.

---

## 4.3 Filter als Registerlaschen

Tagfilter nicht als normale Pills oder Chips darstellen.

Stattdessen:

- Registerlaschen
- Papier-Tabs
- Aktenmarker

Aktiver Filter:

- Position
- Form
- Symbol
- Text

Nicht nur Farbe.

---

## 4.4 Ergebnisse als Karteikarten

Keine große Tabellenliste.

Stattdessen:

- wenige Karteikarten gleichzeitig
- Stapel oder Schublade
- klarer aktiver Datensatz
- Pagination/Wechsel über Register oder physische Navigation

---

## 4.5 Dossier als Hauptobjekt

Ausgewählte Akte ist größte Papierfläche der Rolle.

Empfohlene Reihenfolge:

1. Name / Alias
2. Portrait
3. Beruf / Ereignis
4. relevante Tags
5. Beschwerde
6. Unstimmigkeiten
7. Status

Sekundäre Metadaten kleiner darstellen.

Entscheidungsrelevante Informationen optisch priorisieren.

---

## 4.6 Regelbuch

Regelbereich als aufgeschlagenes Buch gestalten.

Mögliche Struktur:

### Linke Seite

- Tagesregeln
- Hauptklauseln

### Rechte Seite

- Ausnahmen
- Querverweise
- Sonderfälle

Navigation:

- Registerlaschen
- Lesezeichen
- Büroklammern

Aktive Regel deutlich hervorheben.

---

## 4.7 Stempel

Drei Urteile als große physische Stempel darstellen:

- `VERIFIZIERT`
- `FRAGWÜRDIG`
- `NICHT FREIGEBEN`

Jeder Stempel unterscheidet sich durch:

- Form
- Symbol
- Text
- ggf. Farbe

Beim Auslösen:

1. Stempel bewegt sich zur Akte.
2. kurzer Druckeffekt.
3. sichtbarer Abdruck erscheint auf der Akte.
4. Status wird funktional aktualisiert.

Reduced Motion berücksichtigen.

---

## 4.8 Fehlgeschlagene Suche

Bei fehlenden Treffern optional Papierauswurf oder Aktenchaos zeigen.

Wichtig:

- Fehlermeldung zusätzlich als Text
- Animation kurz
- keine Blockade der nächsten Eingabe

---

## 4.9 Akzeptanzkriterien Archivar

- Rolle ist ohne Text als Akten-/Regelarbeitsplatz erkennbar
- Suche bleibt schnell bedienbar
- Dossier dominiert visuell
- Regelbuch ist eindeutig getrennt
- Stempelentscheidung ist die zentrale Abschlussaktion
- keine kritische Information versteckt sich nur in Animationen

---

# 5. Disponent neu gestalten

## Ziel

Der Disponent soll stärker als Maschinenbediener und weniger als Form-UI wirken.

---

## 5.1 Grundlayout

Empfohlene Struktur:

### Links / links oben

- Disponentenfigur
- kleinere Statusanzeigen

### Mitte

- große Maschinenkonsole
- Regler
- Ventile
- Schalter

### Rechts

- vertikale Zielbank
- Zielinformationen

### Rechts unten

- vorbereitete Route
- finaler Hebel

---

## 5.2 Zielbank

Jedes Ziel als beleuchtetes Schild darstellen.

Immer anzeigen:

- Symbol
- Name
- Farbe als Zusatzcodierung

Beispiel:

```text
🔥 ZORN
♥ LUST
🍔 VÖLLEREI
```

Farbe niemals als alleinige Unterscheidung verwenden.

---

## 5.3 Maschinenregler

Controls visuell unterschiedlich gestalten, Bedienlogik aber konsistent halten.

Mögliche Varianten:

- Drehknopf
- Kippschalter
- Ventil
- Schieberegler
- Wahlschalter
- Siegelhebel

Für jedes Control:

- sichtbares Label
- sichtbarer aktueller Wert
- Tastaturbedienung
- Focus-State
- klare Min-/Max- oder Zustandsgrenzen

---

## 5.4 Zielanforderungen

Anforderungen als physisches Wartungsblatt darstellen.

Beispiel:

```text
Temperatur: HOCH
Siegel: ROT
Ventil: OFFEN
```

Erfüllte Bedingungen mit:

- Haken
- Lampe
- Symbol

kennzeichnen.

Nicht nur grün/rot.

---

## 5.5 Route vorbereiten

Vor der finalen Aktion klar anzeigen:

- Ziel
- gewählte Parameter
- erfüllte Anforderungen
- fehlende Anforderungen
- vorhandene Freigaben

Diese Zusammenfassung soll optisch wie ein Maschinenauftrag oder Formular wirken.

---

## 5.6 Finalen Hebel gestalten

Der Hebel ist größtes einzelnes Control der Rolle.

Zweistufige Interaktion:

1. Schutzbügel / Arretierung öffnen.
2. Hebel betätigen.

Vor Schritt 2 nochmals visuell zeigen:

- Ziel
- Status
- kritische fehlende Bedingungen

Keine zusätzliche modale Dialogbox verwenden, wenn die zweistufige physische Interaktion ausreichend eindeutig ist.

---

## 5.7 Akzeptanzkriterien Disponent

- Rolle ist ohne Text als Maschinenarbeitsplatz erkennbar
- Zielbank ist auf einen Blick verständlich
- Werte sind auch ohne Farbe interpretierbar
- finale Aktion ist visuell dominant
- versehentliche Auslösung ist durch zweistufige Bedienung erschwert
- alle Controls bleiben per Tastatur bedienbar

---

# 6. Charaktere stärker in die Arbeitsplätze integrieren

## Ziel

Figuren sollen nicht wie Avatare in UI-Karten wirken.

---

## 6.1 Regeln

Charaktere dürfen:

- teilweise hinter Möbeln verschwinden
- mit Telefon, Papier oder Maschine überlappen
- kleine Idle-Animationen haben
- auf Spielzustände reagieren

Charaktere dürfen nicht:

- Texte verdecken
- Buttons blockieren
- Fokuszustände verdecken
- wesentliche Statusanzeigen überlagern

---

## 6.2 Rollenreaktionen

### Agent

- Hörer bewegt sich
- Figur reagiert auf Anruferstress
- kleine Blickbewegungen

### Archivar

- Papierstapel wackelt
- Stempelreaktion
- Aktenauswurf

### Disponent

- Maschine ruckelt
- Ventile reagieren
- Figur stemmt sich ggf. gegen den Hebel

---

# 7. Visuelle Dichte erhöhen, ohne Lesbarkeit zu verlieren

## Ziel

Mockup-Dichte übernehmen, ohne die Bedienoberfläche unruhig zu machen.

---

## 7.1 80/20-Regel

Ca. 80 % der eigentlichen Interaktion findet auf ruhigen, kontrastreichen Flächen statt.

Ca. 20 % visuelles Chaos befindet sich:

- an Rändern
- zwischen Modulen
- hinter Arbeitsflächen
- in nicht-interaktiven Zwischenräumen

---

## 7.2 Textregeln

### Auf Papier

- dunkle Tinte
- heller Hintergrund

### Auf Metall

- helle Creme-/Off-White-Schrift
- dunkler Hintergrund

### Vermeiden

- Text direkt auf Flammen
- Text auf starkem Neon
- Text über bewegten Hintergründen
- kleine Schrift auf stark texturierten Flächen

---

## 7.3 Rotation

Dekorative Objekte dürfen rotieren.

Textflächen selbst bleiben möglichst gerade.

Beispiel:

- schiefer Zettel
- Text im Zettel horizontal

---

## 7.4 Hierarchie

Pro Rolle genau eine dominante Hauptaktion.

Agent:

- Telefon-/Gesprächsaktion

Archivar:

- Stempelentscheidung

Disponent:

- finaler Hebel

Sekundäraktionen sichtbar, aber klar schwächer gewichtet.

---

# 8. Accessibility absichern

## Ziel

Der visuelle Umbau darf die bestehende Zugänglichkeit nicht verschlechtern.

---

## 8.1 Farbe

Jeder kritische Zustand benötigt mindestens zwei der folgenden Merkmale:

- Farbe
- Symbol
- Text
- Form
- Position

---

## 8.2 Fokus

Alle interaktiven Elemente brauchen einen klar sichtbaren Focus-State.

Dieser Fokus darf nicht ausschließlich aus einer Rollenfarbe bestehen.

---

## 8.3 Reduced Motion

Alle neuen Animationen müssen Reduced Motion respektieren.

Bei aktivierter Reduktion:

- keine starken Ruckler
- keine großen Objektbewegungen
- keine unnötigen Loop-Animationen
- Statusänderung statisch sichtbar machen

---

## 8.4 Text-/UI-Skalierung

Alle neuen Panels auf größere Textdarstellung testen.

Kein Text darf:

- abgeschnitten werden
- hinter Dekoration verschwinden
- außerhalb von Controls laufen

---

# 9. Responsive Verhalten

## Ziel

Die Mockup-Nähe darf nicht nur auf einer Desktopauflösung funktionieren.

---

## 9.1 Große Desktopansicht

Volle Arbeitsplatzkomposition anzeigen.

---

## 9.2 Mittlere Breite

Prioritäten:

1. Hauptarbeitsbereich
2. Hauptaktion
3. gemeinsame Statuswerte
4. Sekundärdekor

Dekorative Elemente zuerst reduzieren.

---

## 9.3 Kleine Breite

Falls unterstützt:

- Module stapeln
- keine kritischen Controls verkleinern
- Mindest-Touch-Flächen erhalten
- Sekundärillustrationen ausblenden

Keine horizontale Miniaturisierung des kompletten Mockups.

---

# 10. Visuelle Detailphase

Diese Phase erst durchführen, wenn Layout und Interaktion stabil sind.

---

## 10.1 Vordergrundrequisiten

Mögliche Elemente:

- Papierstapel
- Kaffeetasse
- Ketten
- Kabel
- Rohrleitungen
- kleine Dämonen
- Büroklammern
- Asche
- Warnschilder

Nur dekorativ verwenden.

Keine wichtigen Controls verdecken.

---

## 10.2 Licht

Lokale Lichtquellen ergänzen:

- Cyan beim Anrufer
- Warnlampen beim Disponenten
- warme Schreibtischbeleuchtung beim Archivar

Keine globalen Glow-Effekte über Text.

---

## 10.3 Comedy-Reaktionen

Kleine zustandsabhängige Gags hinzufügen.

Beispiele:

- Papier fällt aus dem Archiv
- Telefonkabel windet sich
- Ventil zischt
- Warnlampe flackert
- kleiner Dämon reagiert

Alle Gags kurz halten.

Gameplay bleibt primär.

---

# 11. Testmatrix

Nach jeder großen Phase folgende Tests durchführen.

---

## 11.1 Agent

Testen:

- Anruf annehmen
- Antwort auswählen
- Tastatursteuerung
- Gesprächsverlauf
- Hinweise veröffentlichen
- Hinweise ersetzen
- Stressanzeige
- Fokus
- Reduced Motion

---

## 11.2 Archivar

Testen:

- Suchfeld
- Filter
- Ergebniswechsel
- Dossieranzeige
- Regelbuchnavigation
- Stempelaktionen
- öffentliche Pins
- Fehlersuche
- Fokus
- Reduced Motion

---

## 11.3 Disponent

Testen:

- Zielauswahl
- Regler
- Tastatursteuerung
- Anforderungen
- Freigaben
- Route vorbereiten
- Hebel-Arretierung
- finale Auslösung
- Fokus
- Reduced Motion

---

# 12. Visuelle Abnahme

Für jede Rolle Screenshots bei den wichtigsten Zielauflösungen erstellen.

Nicht auf Pixelgleichheit prüfen.

Stattdessen diese sechs Kriterien bewerten:

1. **Komposition**
2. **Warm-/Kalt-Kontrast**
3. **Materialmix**
4. **Silhouettenlesbarkeit**
5. **visuelle Dichte**
6. **Comedy-Reaktion**

---

# 13. Definition of Done

Die UI-Überarbeitung gilt als abgeschlossen, wenn:

- Agent, Archivar und Disponent ohne Text voneinander unterscheidbar sind
- alle Rollen klar zum selben visuellen Universum gehören
- klassische Web-Dashboard-Anmutung deutlich reduziert wurde
- die Hauptaktion jeder Rolle sofort erkennbar ist
- Mockup-Materialien und physische Bedienobjekte das UI prägen
- Lesbarkeit mindestens auf aktuellem Niveau bleibt
- Tastaturbedienung vollständig funktioniert
- Fokuszustände sichtbar bleiben
- Reduced Motion funktioniert
- kritische Zustände nicht nur durch Farbe codiert sind
- keine bestehende Gameplay-Mechanik durch den visuellen Umbau verloren geht

---

# 14. Empfohlene Implementierungsreihenfolge

Codex soll diese Reihenfolge einhalten:

1. Gemeinsame UI-Primitives
2. Material- und Design-Tokens
3. Gemeinsames HUD
4. Agent-Layout
5. Agent-Interaktionen visuell integrieren
6. Archivar-Layout
7. Archivsuche und Dossierdarstellung
8. Regelbuch
9. Stempel
10. Disponent-Layout
11. Zielbank
12. Maschinenregler
13. finaler Hebel
14. Charakterintegration
15. Accessibility-Regressionstest
16. Responsive Anpassungen
17. visuelle Detailphase
18. Screenshots und finale Abnahme

---

# 15. Arbeitsweise für Codex pro Schritt

Für jeden Implementierungsschritt:

1. Relevante bestehende Komponenten und Styles identifizieren.
2. Bestehende Logik nicht duplizieren.
3. Neue visuelle Primitive bevorzugt wiederverwenden.
4. Änderung in möglichst kleinen, klaren Commits durchführen.
5. Nach jedem Schritt Build und relevante Tests ausführen.
6. Betroffene Rolle manuell prüfen.
7. Bei visueller Verbesserung keine Accessibility entfernen.
8. Erst nach erfolgreicher Prüfung zum nächsten Schritt wechseln.

---

# Endziel

Die Oberfläche soll sich nicht wie eine Web-App mit Höllen-Skin anfühlen.

Sie soll wirken wie drei physische Arbeitsplätze in einem chaotischen, improvisierten Höllen-Kontrollraum:

- der Agent arbeitet an einem Telefonplatz,
- der Archivar in einer absurden Bürokratie,
- der Disponent an einer widerspenstigen Maschine.

Die Spielmechanik bleibt dabei klarer als die Dekoration.
