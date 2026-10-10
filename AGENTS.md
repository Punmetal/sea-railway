# Sea Railway coding agent instructions

## Start here

Read `README.md`, `QA.md` and `docs/PROJECT_CONTEXT.md` before editing. `dist/main.js` assembles the scene and connects UI/input. The editable source lives in `dist/`; do not discard it as a build output. Source provenance is in `SOURCE-REVISION.txt` and `docs/migration/original-files.sha256.json`.

## Preserve the project

Maintain the quiet exploration experience, painterly sky/sea, muted red train, warm cream lights and UI that leaves room for the view. Preserve the existing directory layout and vendored Three.js r170/utilities. Do not substitute placeholders for original assets or regenerate audio/images without a specific task. Never rewrite the game from a handoff description.

Protect walking, seating, door collisions, continuous station boarding, train recall, automatic/manual travel, time/weather, three audio channels, Photo Mode and cinematic camera. Changes to v31 systems should inspect `journey-start.js`, `journey-memory.js`, `journey-hints.js`, `quiet-passenger.js` and `showcase.js`. Preserve localStorage schema compatibility and safe recovery when relevant.

## Run and check

Run `python3 -m http.server 8000 --directory dist` (`py -m http.server 8000 --directory dist` on Windows), then visit http://localhost:8000. No npm install is needed to play. Use Node.js 24/npm for `npm run check` and `npm test`; optional native checks need the libraries documented in QA/scripts.

After a behavior change, run the existing checks and relevant browser smoke tests when supported. Report exactly what ran and what did not. CPU renderer/DOM/MediaRecorder mocks are not browser verification, synthetic/native pixels are not full-game screenshots, and CPU timing is not GPU FPS. Export gallery PNGs and clips through the game and inspect real downloads before labeling them v31 evidence.

## Working practices

Keep changes focused on the assigned task. Inspect current code before relying on historical README sections. Do not commit secrets, credentials, local environment files, generated captures or dependencies. Preserve license headers and the audio license. `.openai/hosting.json` is original hosting metadata, not a credential; do not assume GitHub migration deploys or alters that site. Do not force-push or overwrite concurrent repository work.
