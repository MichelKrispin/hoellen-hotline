# Höllen Hotline sprite pack

Generated replacement sprites for the three role UIs plus shared props. The package is structured so Codex can integrate either individual PNGs or the original sprite atlases.

## Structure
- `agent/` – telephone/caller UI assets
- `archivist/` – archive/files/rulebook/stamp assets
- `dispatcher/` – routing machine/levers/gauges/warning FX
- `shared/` – reusable paper, button, siren, sign/frame props
- `manifest.json` – stable sprite IDs, file paths, dimensions, and source-atlas rectangles

Each role folder contains the original 1536×1024 atlas and a `sprites/` directory with pre-cropped RGBA PNGs. Text and labels are intentionally not baked into the assets; keep semantic labels as HTML/UI text for readability and localization.

## Suggested integration
1. Copy this directory into the project's asset folder, e.g. `public/assets/sprites/`.
2. Prefer the individual files referenced in `manifest.json` for `<img>`/CSS usage.
3. Preserve aspect ratio (`object-fit: contain`) and size from the surrounding UI rather than hardcoding native pixel dimensions.
4. Keep status text, counters, button labels and interaction states in the existing UI layer above/beside the art.
5. Use the atlas rectangles only if the project already has a sprite-sheet renderer.

## Stable IDs
Agent: `phone_base`, `handset`, `caller_ghost`, `spectral_mouth`, `ring_energy`, `alarm_button`.

Archivist: `filing_cabinet`, `case_file_stack`, `rulebook_open`, `infernal_stamp`, `paper_stack`, `torn_record_slip`, `wax_seal_pin`, `paper_fragments`.

Dispatcher: `routing_console`, `lever_bank`, `single_lever`, `red_push_button`, `warning_beacon`, `analog_gauge`, `gauge_needle`, `machine_fx`.

Shared: `paper_note`, `receipt_roll`, `demonic_plant`, `watching_eyes`, `red_siren`, `push_button`, `horned_signplate`, `cyan_neon_frame`.
