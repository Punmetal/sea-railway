# Experimental migration status

This is an **incomplete, staged migration**, not a full-game WebGPU release. The actual WebGPU implementation currently covers the authored sky/cloud/star/moon/aurora subsystem. The complete game deliberately stays on the original WebGL 2 path, including when `renderer=webgpu` is requested. Ocean/floor reflections, weather, material hooks, headlights and photo postprocessing remain migration blockers. No effects have been removed to satisfy a renderer flag.

## Implemented

- Original Three.js r170, WebGL bundle/utilities, scene geometry, textures, audio and gameplay retained.
- Added official r170 WebGPU bundle with MIT license, loaded only by the isolated GPU sky validation entry point. No Three.js version upgrade.
- Sky GLSL equations translated to committed TSL source using the official r170 decoder/encoder. Explicit panorama gradients, far depth, palette exposure, cloud artwork, aurora, stars and half moon preserved. `THREE.Color` uniforms use node `color` bindings, not Vector3 bindings.
- Renderer negotiation distinguishes forced WebGL, missing WebGPU, insecure context, incomplete scene coverage and initialization failure. A failed renderer is disposed and removed; WebGPURenderer's internal WebGL backend is rejected rather than mislabeled as WebGPU.
- Seven-scenario full-scene benchmark with fixed Medium quality, scale 1, canonical route/time/speed, camera poses and animation step, warmup, 1% low calculation, per-frame accumulation of reflection/shadow/postprocess draw calls, JSON download and state restoration. Hidden tabs and viewport changes invalidate a run.

## Run the complete game

```sh
python3 -m http.server 8000 --directory dist
```

- Normal play: `http://localhost:8000/`
- Explicit rollback path: `http://localhost:8000/?renderer=webgl`
- Compatibility-gated experiment: `http://localhost:8000/?renderer=webgpu`
- Actual frame measurements: `http://localhost:8000/?renderer=webgl&benchmark=1`; Start/Resume, then **Run 7 scenarios**. Keep the tab visible and do not change graphics/UI during measurement. Normal play resumes after completion/cancel.

The present gate returns WebGL for the full game. It is intentionally impossible to bypass the remaining shader coverage by setting a URL flag. Removing the gate before completing migration would lose effects or fail compilation.

## Run actual WebGPU sky validation

Open `http://localhost:8000/webgpu/sky-validation.html`. Left is original GLSL; right is actual `WebGPURenderer`, with backend identity checked after `init()`. Compilation diagnostics and runtime/device errors appear in the page. Choose Day/Evening/Night, wait for `textureReady: [1,1]`, then save a same-frame PNG comparison. Both halves use the same dimensions, camera, original texture, time, palette, exposure and DPR 1.

If sockets are blocked, use the self-contained exports (original source and assets embedded; no CDN):

```sh
python3 tools/export-sky-validation.py
python3 tools/export-single-html.py --version webgpu-experiment
```

Open the generated HTML files in Chrome. The full-game export also accepts the renderer/benchmark query options. Exports are local verification artifacts and are not committed.

## Reproduce source and CPU checks

With Node.js 24/npm:

```sh
npm run check
npm test
node scripts/generate-sky-tsl.mjs
python3 tools/verify-html-export.py Sea-Railway-webgpu-experiment.html
node --experimental-vm-modules tools/verify-html-modules.mjs Sea-Railway-webgpu-experiment.html
python3 tools/compare-sky-png.py /path/to/actual-comparison.png
```

The generator has no package installation requirement. Its vendored compiler sources are official r170 files with two documented local adaptations: a local WebGPU import for TSL symbol discovery, and primitive-number detection that includes `.5` and spaced negative literals. WGSL's two-argument atan is emitted as `atan2`; the entry function is inline so varyings remain in the fragment entry scope. Generated graphs are source, not runtime `eval`.

## Still required before a complete GPU version or merge

1. Port ocean/floor planar reflections, including depth conventions, oblique clipping, reflection UV orientation, shore transmission and all shadow/headlight/rain contributions.
2. Port rain and convert snow points to WebGPU billboards while preserving masks, reflected sizes and quality controls.
3. Compose every existing material hook in TSL, including powder normals, foliage shadow deformation, window projection, painted haze, cheeks, cloth and wake opacity. The full-scene inventory records remaining materials; postprocess materials also require separate coverage.
4. Port linear HDR/bloom, all eight photo filters, antialias/sharpen/crop, and validate same-frame PNG/gallery/video export on WebGPU.
5. Install a full-scene GPU driver, compile all time/weather permutations, handle runtime/device-loss restart through saved journey state, and only then change the readiness gate.
6. Repeat the seven scenarios on **both actual backends**, review matched captures and exercise full GPU gameplay. Test repeat initialization/disposal and longer stability/resource runs.

## Browser requirements and current recommendation

WebGPU requires a secure context (HTTPS or supported localhost/file testing), an exposed `navigator.gpu`, a supported browser/OS/driver and successful adapter/device/pipeline initialization. This session validated the sky in Chrome 155 on Apple M1 Pro; it does not establish Safari, Windows, Android or mobile support. The full game continues to use its existing WebGL 2/import-map requirements.

Keep **WebGL as the primary renderer** until full-scene WebGPU parity, stability and a matched benchmark exist. The sky port demonstrates compatibility and close image parity; it does not establish a full-game FPS improvement. No compute shaders, extra particles, texture reductions or draw-call optimizations were introduced without evidence.

## Rollback

Use `?renderer=webgl` to select original rendering explicitly. `main` remains untouched; do not merge this experimental PR until the outstanding checklist is complete and approved. To discard the experiment, close the PR and continue from baseline `d3fdbd3dbfe4cea45e7ea1d460a9ed8f270a7ba3`. If changes are eventually merged, revert the migration commits on a new branch rather than resetting published history. Original vendored files/assets remain byte-identical, so their restoration needs no regeneration.
