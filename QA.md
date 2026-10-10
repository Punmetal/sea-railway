# Sea Railway v31 — Migration QA · 2026-10-10 (GMT+7)

Migration preserves the original game and assets. See [migration validation](docs/migration/VALIDATION.md) for the complete evidence and [original file manifest](docs/migration/original-files.sha256.json) for all 105 original paths/hashes. The original QA bytes are archived in `docs/migration/source-QA.md` and retained below.

## Checks performed during migration

- Both Notion ZIP SHA-256 hashes and ZIP CRCs pass; 105 unique files merge without conflicting bytes.
- All original game/asset/audio/test/script/dependency files are byte-identical; updated README/QA/gitignore originals are archived.
- Node 24.19.0: 49 syntax commands and 24 regression test commands pass unchanged. npm is not installed here; the declared Node commands were executed directly.
- Original runtime integration initially fails on Windows drive-letter ESM imports. The unchanged test passes with a validation-only Windows URL hook: 41,204 CPU render calls, 375 meshes and 518,745 triangles. This host portability issue was not fixed in game/test source. Reproduction is in the migration validation document.
- Standalone export reproduces the Notion SHA-256 with original revision outside Git, UTF-8 and LF output; HTML verification passes for 53 modules, three CSS files and two original binary assets. Module linking passes with 138 imports.
- Native gallery PNG test passes for six synthetic 1280×720 images and ZIP CRC; a validation-only adapter resolves the Python executable on Windows.
- Automated secret scanning found no common key/token/private-key/credential/signed-URL candidates in the repository.

## Still untested / known limitations

Full-game browser/WebGL play, pointer lock/touch, real audio, gallery/video downloads, mobile/zoom layout, standalone browser play and device FPS remain unverified. The other optional native GLES/component/photo suites were not rerun. CPU mocks and native synthetic images do not establish browser behavior or GPU performance. The original Handoff supplied no external model files, installers or verified v31 full-game media.

## Original QA from the v31 Source ZIP

The following is historical evidence from the original developer handoff, not a claim that every check below was rerun during migration.

---

# Sea Railway quality pass — v31 · 2026-10-10 (GMT+7)

## Current journey update

- A keyboard-accessible welcome screen pauses travel and scene controls until
  Start/Resume. Quality and sound choices apply from that user gesture.
- Contextual hints appear once per browser storage: exterior view, walking,
  seats, doors, docking, shore and photo. Settings can disable or replay them.
- Journey checkpoints save every five simulation seconds and on page exit or
  hiding. They retain train direction/distance, train seats, shore/bench
  positions, look direction, door targets and snow accumulation. Settings are
  stored separately. Invalid/obsolete doorway positions recover to the aisle;
  corrupt or unavailable storage falls back without preventing play.
- An occasional original passenger boards through the side door, rides a
  reserved seat and alights at the next stop. Boarding delays departure, while
  a blocked visitor gives way and releases the seat. Existing birds, changing
  house lights, boats, meteors and quiet platform events remain available.
- Settings → journey help can export six preset 1280px PNG views as one ZIP,
  or record a 15-second silent cinematic clip at up to 1280px/24fps, using a
  browser-supported WebM/MP4 encoder. Gallery pauses simulation and restores
  time/weather/camera afterward; video preserves distance travelled.

### Current validation and limits

- Full existing regression suite and JavaScript syntax checks pass. Added
  behavioral tests exercise malformed/quota-rejected saves, safe recovery,
  motion after a saved stop/reversal, modal focus/input, remembered hints,
  passenger reservation/freeze/boarding/give-way/disposal, UTF-8 ZIP output,
  recording failure/cancel and stream cleanup.
- The integrated CPU scene also exercises welcome freeze/cancel, train-seat
  and shore-bench resume, six capture poses and state restoration, a complete
  15-second mock recording, and camera dragging immediately after both exports.
  DOM, WebGL rendering, browser downloads and MediaRecorder are mocked.
- `node scripts/verify-showcase-png.mjs` encodes/decodes six real 1280×720 PNGs
  using native Canvas, then checks their ZIP CRC and extraction with Python.
  Its source pixels are synthetic, not screenshots of the full game.
- The single-HTML export parses/links all 53 modules and the bootstrap, embeds
  three exact stylesheets and two byte-identical assets, with no external file
  references. Both delivery ZIPs must be merged before rebuilding the HTML.
- Browser smoke tests, touch/layout at mobile sizes, actual WebGL PNG/video
  downloads, device FPS and the six current full-game screenshots/clip are
  still outstanding. No browser preview was started because the required
  control-browser capability is unavailable. The gallery/record buttons prepare
  those media files in a user's supported browser; no fabricated captures are
  supplied as evidence.

## Previous quality pass — v30 · 2026-10-08

## Changes

- Photo mode accepts Escape/P even when a range input or select has focus.
- Cancelled pointer drags release first-person look.
- Photo capture attaches/removes its download link, retains capture metadata
  across asynchronous encoding, and rejects a lost graphics context.
- Liquid Glass has a stronger tint for bright backgrounds, flexible narrow
  layouts, relative label sizes, and reduced blur on the low quality preset.
- Static UI elements are cached; unchanged weather no longer rewrites its
  four buttons every animation frame.

## Verified

- Full test suite and JavaScript syntax checks pass.
- Integrated CPU scene runs cover menu closure, mouse restoration, seats,
  every gangway/cab door, station disembarking, benches, recall/reboarding,
  cinema, photo entry/exit, weather and quality changes.
- New regressions cover photo exit from focused inputs, cancelled drags,
  lost graphics context, and avoiding repeated weather attribute writes.
- Native GLES pixel tests cover all eight filters, bloom, compare, antialiasing
  and sharpening. This uses a software GLES renderer, not browser WebGL.
- Native component previews compile 33 character and 15 second-station
  material programs and render front/oblique/close views. Character floor
  contact and the second station's connected extension/open shelter were
  inspected. These are component fixtures, not full-game screenshots; the
  station sign texture and full scene lighting are not reproduced.
- The real capture function encodes and decodes 16 PNGs through native Canvas:
  eight ratios with full-image/postcard frames, crop offset, nonempty pixels,
  opaque alpha, attached download link and cleanup.
- Conservative white-backdrop compositing estimates give 4.83:1 for muted
  panel text and 4.99:1 for standard button text. This is a tint calculation,
  not a rendered browser accessibility audit.

## Performance sample

`RAILWAY_BENCHMARK=1 node --experimental-vm-modules tests/runtime.test.js`
measured nine quality/weather combinations, 600 measured frames each after
600 warmup frames. Main-loop CPU work was 0.731–0.770 ms/frame in this container.
Visible estimated primitives were about 0.83 million on low and 1.13 million
on high. Reflection, shadow, postprocess and browser composition costs are
excluded. The renderer is mocked: these values must not be reported as FPS,
GPU timings, or proof of smooth play on a user's device.

## Remaining browser checks

The managed Sites preview requires the control-browser skill, which was not
available in this session. No alternate browser-control path was used.

- Actual pointer lock/touch and connected gameplay in a browser.
- PNG download from the actual WebGL canvas; pixel equality with preview.
- Liquid Glass at day/evening/night, rain/snow, small screens and 200% zoom.
- FPS/GPU cost with rain, snow, bloom, reflections and an open glass menu.

These are explicit outstanding verification items, not passes.

## Reproduce native PNG verification

With the runtime's native Canvas/pngjs packages available:

`node scripts/verify-photo-png.mjs [optional-source-image] [optional-PNG-path]`

This tests actual PNG encoding through the capture function, while using a
native source canvas and a download DOM stub. It does not launch a browser.
