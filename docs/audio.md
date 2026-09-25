# Audio und Reaktionen

Vier lokal gebündelte Warteschleifen-Jingles werden mit `npm run audio:build` aus Notenfolgen als WAV erzeugt. Der Audio-Mixer besitzt getrennte Busse für Gesamtlautstärke, Musik, Effekte und Bedienung. Reglerwerte liegen lokal unter `hoellen-hotline.audio.v1`. Der Browser startet Audio erst nach „Ton aktivieren“; bei einem Hintergrundtab wird der AudioContext pausiert und bei Rückkehr fortgesetzt.

Der musikalische Grundton steigt mit dem höchsten der drei Druckwerte. Zustellung und Störung erzeugen kurze Effekttöne. Die sichtbaren Reaktionsbilder und Bildunterschriften zeigen dieselbe Bedeutung auch bei stummgeschaltetem Ton. Der Hebel nutzt den Effektbus; er öffnet keinen eigenen AudioContext.

Das Präsentationssystem ordnet Zustellungen der Figur und Hintergrunddämonen, Störungen Rohren und Pflanze sowie Druckanstiege der Anzeige zu. Maximal zwei Gruppen werden gleichzeitig geplant; dringende Reaktionen verdrängen ruhige Gags. Gleiche Ereignisse haben 1,8 Sekunden Cooldown, ein Gag läuft höchstens 0,8 Sekunden. Die Dekoration ist nicht interaktiv. Bei reduzierter Bewegung bleibt ein kurzes statisches Aufleuchten, ohne Wackeln oder Blitz.
