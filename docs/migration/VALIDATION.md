# Migration validation — 2026-10-10 (Asia/Bangkok)

## Actually verified

- Notion Handoff read in full. The existing `main` contained only the two-line initial README at commit `c4d86bd5f81dd242edd93bbc7b7dd47d27a13e2c`. Its original text is archived as `repository-README.original.md`.
- Both v31 ZIP downloads match the Notion SHA-256 values recorded in README. Both pass ZIP CRC. They have 104 and 3 file entries, including two byte-identical overlaps, yielding 105 unique original files.
- Every original file is represented at its original internal path. README, QA and gitignore are the only original paths updated; their original bytes are separately archived here. All other game, asset, audio, test, script, dependency and hosting files remain byte-identical. The archive wrapper directory became the repository root.
- Original WAV, sky PNG, audio CC0 dedication and vendor license headers are present. `SOURCE-REVISION.txt` retains the original v31 revision.
- Node.js v24.19.0: all 49 syntax commands from `package.json`'s `check` script pass. The first 24 regression commands from its `test` script pass unchanged.
- The 25th command, `node --experimental-vm-modules tests/runtime.test.js`, initially fails on Windows with `ERR_UNSUPPORTED_ESM_URL_SCHEME` because it imports an absolute `C:` path. Re-running the unchanged test with the documentation-only `validation-adapters/windows-esm-hook.mjs` passes: 41,204 CPU render calls, 375 meshes and 518,745 triangles. No source/test fix was applied.
- npm is unavailable in this environment. A local runner executes the exact Node commands declared in `package.json`, in order, rather than claiming literal `npm run check` or `npm test` succeeded.
- The unchanged exporter was run from the merged archive outside Git, with UTF-8. Its generated Windows CRLF output was converted to LF (only the generated artifact), producing exactly `770d1a44d37fd8ea40e6b6be2fe607d0fbee8ff686859a22ce17c83a38f0cd39`, the Notion standalone HTML hash.
- `tools/verify-html-export.py` passes: 53 modules, three exact CSS files, two byte-identical binary assets and no external file references.
- `node --experimental-vm-modules tools/verify-html-modules.mjs` passes: 53 parsed modules plus bootstrap, 138 linked imports/exports.
- `scripts/verify-showcase-png.mjs` passes native Canvas/pngjs encoding/decoding of six 1280×720 PNGs and Python ZIP CRC validation. A validation-only preload maps its `python3` call to the installed Python executable on Windows. The pixels are synthetic, not full-game screenshots.
- Automated secret review checks common private-key/token/API-key signatures, credential assignments, signed download URLs and sensitive filenames. No candidates were found in the repository. Signed Notion URLs and local adapters containing machine-specific paths stay outside the committed project.
- `.gitattributes` disables automatic text conversions so original file bytes remain preserved across platforms. No dependency lockfile or generated game code was introduced.

The migration additionally compares every staged Git blob to a SHA-256/Git-blob manifest before commit, then compares the entire remote `main` tree and every downloaded Git blob after publication. These publication checks are reported in the final migration report; this document records the checks performed before publication.

## Not verified in this migration

- Actual browser/WebGL gameplay, pointer lock, audible playback or touch controls.
- Actual full-game gallery PNG/MediaRecorder video downloads, screenshots or clips.
- Mobile layout, Liquid Glass at every time/weather and 200% zoom.
- Device FPS/GPU performance or standalone HTML browser play.
- Optional Mesa/GLES shader/component suites and the separate 16-photo native suite were not rerun.
- Original Sites deployment or access from another account/device was not changed or revalidated.

The original QA reports historical CPU/native checks separately and lists these browser requirements. No gameplay bugs were fixed during migration. Missing model files/installers/current browser media were not invented: the handoff confirms models are built in JavaScript and those deliverables were not supplied.

## Windows runtime test adapter

On a Windows machine with Node.js 24, the unchanged integration test can be run using:

```powershell
node --import ./docs/migration/validation-adapters/windows-esm-hook.mjs --experimental-vm-modules tests/runtime.test.js
```

The hook only turns Windows drive-letter import specifiers into valid `file:` URLs. It is isolated from game runtime and does not change test assertions or rendering mocks. Normal regression commands remain exactly as shipped; address portability only under a separate development task if desired.
