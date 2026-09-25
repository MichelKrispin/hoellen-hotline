# Bedienung und Robustheit

Die Schaltfläche „Optionen“ oder Taste O öffnet die globalen Darstellungsoptionen. Farbpalette, UI-Größe, Textgröße, reduzierte Bewegung und Blitzreduktion werden lokal gespeichert. Die kontrastreiche Graustufenpalette lässt die bereits vorhandenen Symbole und ausgeschriebenen Statusmeldungen als primäre Unterscheidung stehen.

Jedes Rollenpult hat eine DOM-Steuerung mit normaler Tab-Reihenfolge und sichtbarem Fokusrahmen. Agent, Archiv und Disposition lassen die benötigten Aktionen über Buttons, Textfelder und Auswahllisten ausführen. Der gemeinsame Schichtstatus ist als fokussierbarer Textspiegel verfügbar; sein Live-Bereich meldet Fall-, Druck- und Freigabewechsel, ohne die fortlaufende Sekundenuhr ständig anzusagen. Keine zeitkritische Aktion verlangt Drag-and-drop.

Bei einem versteckten Hosttab pausiert die Schicht automatisch. Bei Rückkehr verarbeitet der Host die pausierte Zeit und setzt nur die von ihm automatisch gestartete Pause fort. Ein Gasttab kann seinen Snapshot weiter empfangen. Ein verlorener WebGL-Kontext darf wiederhergestellt werden; bleibt die Wiederherstellung aus, erscheint nach zehn Sekunden eine Diagnoseansicht. Unerwartete Laufzeitfehler zeigen dieselbe Ansicht mit markierbarer und kopierbarer Diagnose. Die URL in der Diagnose enthält kein Signalisierungsfragment.

Die Browserprüfung `e2e/accessibility.spec.ts` verwendet einen 640×360-Viewport als Layoutprobe für 200 % Zoom, prüft gespeicherte Optionen, simuliert Canvas-Kontextverlust und Wiederherstellung sowie eine Fehlerdiagnose. `e2e/private-lobby.spec.ts` spielt den ersten verbundenen Fall über die Tastatursteuerungen aller drei Rollen. Der Host-Sichtbarkeitswechsel wird zusätzlich als Netzwerktest geprüft.
