# Actual verification results — 2026-10-13 (Asia/Bangkok)

**Full-game WebGPU migration is incomplete.** The sky subsystem rendered and was compared on an actual WebGPU device; the complete game used original WebGL 2 fallback. No full-game WebGPU FPS, draw count, GPU memory or gameplay pass is claimed. Recommendation: **option 3 — retain WebGL as primary** until the remaining shader ports and matched A/B evidence exist.

## Full-scene WebGL measurements

Actual Chrome browser, Apple M1 Pro via ANGLE Metal, Chrome 155. Canvas/viewport 976×868, device DPR 2 with fixed render scale 1, Medium quality, original r170 GLSL/reflection/shadow/bloom pipeline. Each scenario used 3 seconds of warmup and 10 seconds of measurement. The tab remained visible. Canonical speed 6.495153 m/s and scene time 120 seconds were used; simulation advances 1/60 second per rendered frame to match future runs. Train/camera/time/weather/quality state was restored afterward. JSON evidence: [webgl-benchmark.json](webgl-benchmark.json).

| Scenario | WebGL average FPS | WebGL 1% low FPS | Mean frame ms | Mean total draws/frame | WebGPU full game |
| --- | ---: | ---: | ---: | ---: | --- |
| Day ocean | 117.55 | 83.45 | 8.51 | 678.1 | Not measured |
| Evening | 98.61 | 83.61 | 10.14 | 796.1 | Not measured |
| Night | 97.04 | 76.28 | 10.31 | 814.9 | Not measured |
| Heavy rain (existing rain at full intensity) | 120.02 | 99.69 | 8.33 | 284.6 | Not measured |
| Snowfall | 120.00 | 99.09 | 8.33 | 651.1 | Not measured |
| Train interior | 119.99 | 98.77 | 8.33 | 514.6 | Not measured |
| Cinematic camera | 120.02 | 99.92 | 8.33 | 648.8 | Not measured |

These are intervals between completion of browser rendering calls across animation frames, including scheduling, CPU submission, driver work and frame pacing. They are **not GPU timestamp timings**, nor proof of CPU/GPU bottleneck attribution. About 120 FPS can be display/rAF limited. 1% low is 1000 divided by the mean of the slowest ceil(1% of samples) frame intervals. Draw counts accumulate original WebGL renderer.info calls across main, reflection, shadow and postprocess passes. A future WebGPURenderer run uses its distinct `render.drawCalls` metric, rather than its render-invocation counter.

GPU memory bytes and GPU frame time: **not available / not measured**. Renderer texture/geometry counts are recorded as counts only. Counts grew from lazily rendered scene assets across scenarios; this run is not a leak test. No harness shader/runtime error or hidden-tab event occurred during the measured windows. An earlier exploratory run with a noncanonical speed was superseded by this fixed-speed run; it is not used for A/B evidence.

## Sky WebGPU vs original WebGL PNG comparison

Both renderers actually rendered the authored dome in Chrome, with identical camera, original PNG, palette/time/exposure, 488×538 pixels per backend, DPR 1 and native MSAA. Saved comparison PNGs were decoded, checked for CRC and compared using `tools/compare-sky-png.py`. These are actual canvas downloads, not synthetic fixtures. Captures remain local and are not committed.

| Time | Mean absolute RGB error (8-bit) | 99th percentile channel error | Pixels with any channel error > 2 | Alpha |
| --- | ---: | ---: | ---: | --- |
| Day | 0.3574 | 1 | 0% | Opaque |
| Evening | 0.4804 | 1 | 0% | Opaque |
| Night | 0.1122 | 1 | 0% | Opaque |

The sampled view includes clouds; night includes stars, half moon and animated aurora. The page reported actual backend `webgpu`, loaded textures and zero captured errors after fixes. It remained rendering for more than seven minutes / over 45,000 displayed frames, but no formal device-loss/leak stress test was run. These three captures establish close sky parity for **one camera/device**, not every sky angle or whole-game visual accuracy. No separate WebGL-vs-WebGPU sky FPS claim is made: both rendered in the same frame during comparison.

During development, real WGSL tests caught and fixed: leading-decimal/negative literal encoder bugs, a texture reference without texture sampling methods, GLSL atan vs WGSL atan2, varying scope inside a layout function, and incorrectly typed Color uniforms that produced black output. Compilation was followed by image review; compile success alone did not detect the black sky.

## Executed CPU/static checks

- Original pinned baseline: 49 Node syntax commands and 25 regression commands passed.
- Modified branch: 54 Node syntax commands and 27 regression commands passed, executed with Node 24.21.0 by invoking the exact package script commands directly. npm was not installed on this host.
- Integrated runtime test rerun after canonical benchmark-speed changes: passed; 41,204 mocked renders, 375 meshes, 518,745 geometry triangles. These counters are CPU fixture results, not browser draw counts or GPU FPS.
- New renderer tests exercise forced/unavailable/insecure/incomplete selection, genuine backend identity, adapter failure cleanup, silent WebGPU-to-WebGL internal fallback rejection and shader inventory.
- New benchmark tests exercise 1% low math, all-pass accumulation, WebGPU draw-counter semantics, state restore, hidden-tab rejection and callback-error cleanup; rerun after counter/error-handling fixes.
- Full-game single-HTML validation: 59 modules, three exact stylesheets, two byte-identical assets; parse/link check: 146 imports with matching exports. Actual browser opened the export because local HTTP bind was sandbox-blocked.
- Original existing scene modules, vendor utilities, sky PNG and WAV remain byte-identical; only renderer startup/benchmark integration in `main.js` changed among the original gameplay modules.

## Actual browser smoke evidence

- Full game startup/Start/Resume and `renderer=webgpu` compatibility fallback worked without a blank scene.
- Reverse command visibly selected and entered braking; Stop was exercised. Forward state and resumed train state were visible. Fine speed/position/door/seat behavior is covered by CPU tests, not exhaustively retested natively.
- Exterior/interior rendered; pointer-lock prompt appeared and Escape released it.
- Control Center opened, Day selection updated, rain selection was exercised; the benchmark rendered full-intensity rain and snow and original lighting/cinema/interior scenarios.
- Sound panel exposed independent ambience/train/music sliders and controls. Actual audible playback was **not verified**.
- Photo Mode opened, froze the scene and exported a real nonempty 1952×1736 PNG, decoded/visually inspected from the browser download.
- The original WebGL photo view shows prominent triangular shadow bands and a dark distant-water boundary. Those existing visual artifacts were recorded, not refactored during renderer migration.

## Still unverified / blocking full migration

Full-scene WebGPU material compilation/rendering; GPU reflections/shadow/alpha parity; GPU weather/photo/bloom/capture; full GPU movement/doors/seats/UI/audio; same-frame GPU gallery/video exports; runtime/device-loss restart; repeat-init/long-term GPU memory stability; mobile/Safari/Windows compatibility; broad visual-angle review; full backend A/B performance. See [migration checklist](MIGRATION.md#still-required-before-a-complete-gpu-version-or-merge).

## Performance opportunities, without speculative speedup claims

Evening/night had the highest observed draw workload (about 796–815 draws/frame) and the slowest mean intervals in this sample. Isolating reflection/shadow cost and material/geometry batching is a reasonable next profiling step; this does not prove a particular GPU bottleneck. Existing rain/snow already animate in shaders, so compute simulation has no demonstrated benefit here. Keep particle counts, imagery and adaptive-resolution policy unchanged during parity work. A longer, repeated A/B run is required before choosing optimizations or promoting WebGPU.
