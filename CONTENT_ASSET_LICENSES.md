# Content- und Asset-Lizenzen

Die für dieses Projekt erstellten Grafiken und Klänge haben keine externe Bild- oder Audioquelle. Die beiden ursprünglichen Mockups sind interne Referenzen und werden nicht in den Webbuild kopiert.

| Pfad / Asset-ID                | Quelle / Urheber                         | Nutzungsrecht                          | Änderungen / Hinweis           |
| ------------------------------ | ---------------------------------------- | -------------------------------------- | ------------------------------ |
| `titlescreen_mockup.png`       | Projekt-Referenzbild; Herkunft zu klären | Nicht zur Veröffentlichung freigegeben | Nur interne Referenz           |
| `gameplay_mockup.png`          | Projekt-Referenzbild; Herkunft zu klären | Nicht zur Veröffentlichung freigegeben | Nur interne Referenz           |
| `src/assets/source/portraits/` | Für Höllen-Hotline erstellte Vektoren    | Projektinterne Originalinhalte         | 30 Figurenporträts             |
| `src/assets/source/reactions/` | Für Höllen-Hotline erstellte Vektoren    | Projektinterne Originalinhalte         | 20 Reaktionsbilder             |
| `src/assets/generated/`        | Automatisch aus den obigen SVGs          | Wie jeweilige Quelle                   | 2×-PNG, PNG, WebP und Atlanten |
| `src/audio/generated/`         | Mit `tools/build-audio.ts` synthetisiert | Projektinterne Originalinhalte         | Vier lokale WAV-Jingles        |
| `src/game/presentation/art.ts` | Für Höllen-Hotline gezeichnet            | Projektinterne Originalinhalte         | Prozedurale UI und Kulisse     |

Für Phaser 3 und Zod gelten die MIT-Lizenzen ihrer Paketdistributionen unter `node_modules`. Bei neuen Fremdassets müssen Quelle, Urheber, Lizenz und Änderungen vor der Aufnahme ergänzt werden.
