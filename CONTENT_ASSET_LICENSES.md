# Content- und Asset-Lizenzen

Die beiden ursprünglichen Mockups sind interne Referenzen und werden nicht in den Webbuild kopiert. Das vom Nutzer zum Import bereitgestellte Archiv `hoellen-hotline-mockup-sprites-import-ready.zip` enthält die nun verwendeten Figuren- und Reaktionsbilder. Die ursprüngliche Urheberschaft und Lizenz dieser Bilder sind nicht unabhängig verifiziert; ihre Verwendung hier beruht auf der Bereitstellung für dieses Projekt.

| Pfad / Asset-ID                | Quelle / Urheber                                                       | Nutzungsrecht                                                        | Änderungen / Hinweis                   |
| ------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `titlescreen_mockup.png`       | Projekt-Referenzbild; Herkunft zu klären                               | Nicht zur Veröffentlichung freigegeben                               | Nur interne Referenz                   |
| `gameplay_mockup.png`          | Projekt-Referenzbild; Herkunft zu klären                               | Nicht zur Veröffentlichung freigegeben                               | Nur interne Referenz                   |
| `src/assets/source/portraits/` | Bereitgestelltes Mockup-Sprite-Paket                                   | Für dieses Projekt bereitgestellt                                    | 30 Rasterbilder in SVG-Hüllen          |
| `src/assets/source/reactions/` | Bereitgestelltes Mockup-Sprite-Paket; drei ursprüngliche Vektorsymbole | Paketbilder für dieses Projekt bereitgestellt; Symbole projektintern | 17 Rasterbilder und drei Vektorsymbole |
| `src/assets/generated/`        | Automatisch aus den obigen SVGs                                        | Wie jeweilige Quelle                                                 | 2×-PNG, PNG, WebP und Atlanten         |
| `src/audio/generated/`         | Mit `tools/build-audio.ts` synthetisiert                               | Projektinterne Originalinhalte                                       | Vier lokale WAV-Jingles                |
| `src/game/presentation/art.ts` | Für Höllen-Hotline gezeichnet                                          | Projektinterne Originalinhalte                                       | Prozedurale UI und Kulisse             |

Für Phaser 3, Zod und PeerJS gelten die MIT-Lizenzen ihrer Paketdistributionen unter `node_modules`. Bei neuen Fremdassets müssen Quelle, Urheber, Lizenz und Änderungen vor der Aufnahme ergänzt werden.
