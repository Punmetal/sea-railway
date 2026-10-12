# WebGPU migration audit

Baseline: `d3fdbd3dbfe4cea45e7ea1d460a9ed8f270a7ba3` (v31), inspected before rendering changes. Experimental branch: `feat/webgpu-renderer`. Editable ES modules are in `dist/`; this directory is source, not disposable build output.

## Existing rendering pipeline

`main.js:54` constructs r170 `WebGLRenderer`, opaque canvas, native MSAA, sRGB output, ACES Filmic tone mapping and palette exposure. One scene, PerspectiveCamera, OrbitControls and a CPU animation loop own gameplay. `PhotoProcessor` renders linear half-float HDR to an MSAA target, two separable bloom targets, then resolves with ACES, sRGB conversion, FXAA, restrained sharpening and photo controls. The postprocess runs during normal play, photography and showcase captures.

The ocean and two carriage floors use vendored GLSL `Reflector`. A shared recursion guard suppresses nested reflection passes. The ocean has a depth texture and reconstructs reflected world hits using the inverse oblique projection. WebGPU depth conventions, render-target UV orientation and renderer-private state make this an explicit migration, not a renderer replacement.

## Compatibility inventory

| System | Current mechanism | Migration requirement / risk |
| --- | --- | --- |
| Ocean | Custom GLSL vertex/fragment, nine wave directions, derivative slope filtering, projective reflection, depth reconstruction, shore absorption, rain impacts, headlight footprint, directional shadows | TSL port of all functions; 0–1 depth and oblique clipping; preserve alpha and linear HDR |
| Wood floors | GLSL Reflector, five-tap low-opacity blur | Node reflection target, shared recursion guard and same blend |
| Painted sky/clouds | GLSL dome at far depth, original sRGB PNG, wrapped textureGrad derivatives, palette/time uniforms | TSL with explicit gradients and correct far depth; preserve authored sky asset |
| Night | Stars, half moon, three animated aurora curtains in sky shader | Port all sky equations; derivative/branch uniformity and panorama seam |
| Rain | Instanced screen-aligned streaks, stationary world cells, train/station shelter masks | TSL vertex clip coordinates, attributes and shelter arrays; retain existing GPU animation |
| Snow | GLSL Points, gl_PointSize/gl_PointCoord, reflection-specific footprint | WebGPU needs triangle billboards; preserve count, masks, size/alpha and draw-range quality controls |
| Glass | Composed onBeforeCompile droplets + Fresnel depth/frost | Preserve hook order, emissive, alpha and double-sided windows |
| Snow cover | Composed onBeforeCompile coverage, material response and derivative powder normals | TSL color/roughness/metalness/normal composition, same accumulation state |
| Painted surfaces | onBeforeCompile pigment noise, grain, wetness, interior bounce, window room depth, distance haze | Node material extensions; keep existing texture maps, instance/vertex colors and physical parameters |
| Foliage | onBeforeCompile leaf wind, veins, snow tint and emissive; custom GLSL shadow-depth material | TSL displacement also in shadow pass; same instance transforms and quality budget |
| Characters | Cheek blush and breathing-cloak onBeforeCompile | Preserve face mask, cloth displacement and all original geometry |
| Window light | onBeforeCompile analytic carriage-space sun/moon projection | Shared uniforms, correct local coordinates and shader composition |
| Wheel wakes/spray | Instanced StandardMaterial + aFade shader hook; CPU transforms | TSL opacity attribute; no compute rewrite without evidence |
| Headlights | Spot shadows, GLSL 24-step occluded beam and water footprint, packed shadow depth | Node shadow sampling differs from packed WebGL depth; must port both effects together |
| Contact shadows | GLSL instanced soft-alpha discs | Node fragment preserving instance transform/alpha |
| Photo/bloom | Custom HDR targets, blur, ACES/sRGB, eight filters, FXAA/sharpen/crop/grain | Node postprocess; do not double tone-map or gamma-convert |
| Captures | Canvas read immediately after render, PNG crop/composite, six-view ZIP, MediaRecorder copy | Preserve same-frame canvas copy under WebGPU; GPU submission/export checks required |
| Gameplay/UI/audio | Scene/input/state/DOM/Web Audio; no renderer-specific shaders | Leave original systems intact; rerun regression and actual browser checks |

## Version decision

The official npm `three@0.170.0` package includes `three.webgpu.js` and TSL. Retain r170 initially: no evidence yet requires an upgrade. Keep the original vendored WebGL bundle and utilities byte-identical. Never mix a newer WebGPU build with r170 objects. If a later release becomes necessary, list and test breaking changes in a separate commit.

## Activation and rollback

Availability of `navigator.gpu` does not prove scene compatibility or stability. WebGPU activation needs device initialization, migrated material coverage, scene compilation and an initial rendered frame. Unsupported/unported effects retain the original WebGL path with a recorded reason. A WebGPURenderer's internal WebGL backend is not the original GLSL-compatible WebGLRenderer fallback.

Keep a force-WebGL URL option and avoid persisted renderer preferences during the experiment. Startup failure must destroy the failed renderer/canvas and start original WebGL. Device loss and runtime failures must recover through an explicit WebGL restart, with existing journey/settings checkpoints retained. Never silently report a fallback run as a WebGPU benchmark.

## Measurement policy

Compare the pinned baseline and experimental backend at the same viewport, DPR, quality, pixel scale, weather intensity, time, simulation route/camera and animation phase. Disable adaptive resolution during benchmark windows; record warmup, sample counts, visibility, browser and actual backend. Use rAF frame intervals for observed FPS/frame-time and explicitly distinguish these from GPU timestamps. Count all reflection/shadow/postprocess draws, not only the final render call. Texture/geometry counts are not GPU memory bytes; unavailable driver memory stays null. Do not add compute, change particle density or improve visual design during parity work.

Required scenarios: day ocean, evening, night, heavy rain, snow, train interior and cinema. Full-device visual accuracy, screenshots/downloads, leak and stability results require actual browser evidence; existing DOM/renderer CPU mocks cannot establish them.
