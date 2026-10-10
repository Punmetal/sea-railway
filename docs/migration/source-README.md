# Sea Railway

A browser-based, walkable 3D train journey inspired by the supplied Sea Railway references.

## Play
- Drag to orbit the train, scroll to zoom.
- Switch to walking mode; click to capture the mouse, or drag to look.
- WASD / arrow keys to walk; Shift to walk faster.
- Look at a nearby seat or door and press E (or tap the contextual button). E sits down, stands up again, or opens/closes the focused gangway/cab door.
- Escape releases the mouse. V changes view. C toggles cinematic camera. H hides the interface.
- Stop / Forward / Reverse buttons control train travel; the label shows braking, acceleration or current motion.
- 1 / 2 / 3 select day / evening / night.
- Settings controls automatic station stops, image quality, clear/rain/snow/mist weather, gradual weather changes and a lock for the current weather.
- When the train docks, walk through the open side door and two steps to disembark. The station button takes you to the doorway inside the carriage. WASD walks the platform and connected island; the recall button brings the train back and holds it until you walk aboard.
- P opens photo mode. Freeze/unfreeze the scene, orbit/pan/zoom, change the lens, choose a postcard border and save a PNG. Escape exits photo mode.
- Touch: drag to look and use the onscreen walking buttons.

Two metre-scaled carriages travel an arc-length-parametrized ellipse in 480 seconds (eight minutes).
Collision is resolved in carriage coordinates, including benches, support poles, side walls and closed cabs. An open gangway connects both carriages. Each end has a glazed sliding door: E or the contextual button opens/closes it over 1.05 seconds. Closed and partially open doors block walking, and doors reopen if the player occupies the threshold.
The evening preset is the default. Sky, clouds, ocean reflection, ambient illumination and warm carriage lighting transition over 2.6 seconds.

## Implementation
Static ES modules. Three.js r170 and its MIT-licensed utilities are vendored locally. No runtime CDN or API request is needed. `.openai/hosting.json` declares the static output.

## Validation
JavaScript syntax, scene construction, finite geometry, animation state, controls, loop continuity, speed uniformity, collisions and carriage spacing were checked locally. WebMCP tools were tested in a simulated API context. GPU rendering, browser pointer lock and real supported WebMCP browser behavior have not been visually verified in this environment.

## Second iteration
Ellipse radii increased from 150 / 95 m to 375 / 237.5 m: a 1,948.55 m route at the original 6.495 m/s. Carriages follow the same continuous arc-length curve, with no reset at lap boundaries.

Rounded individual leather cushions use local grain bump/roughness maps. Light seam lines were removed in the later water/sky iteration. The wood floor uses modest clearcoat and a low-opacity, softly sampled planar reflection. Nested ocean/floor reflection passes are guarded to prevent recursion. Side door glazing now has an actual cutout; cab details include wipers, rivets and a wooden dashboard.

References supplied by the user remain primary. Additional publicly listed model references inspected through search:
- https://sketchfab.com/3d-models/spirited-away-sea-railway-478d32513eda44338b59aa2284ee01b8
- https://sketchfab.com/3d-models/spirited-away-train-2f7c2bbc09614f1eba8e6ec7d8eb00e0
No third-party model assets were downloaded or redistributed.

## Water, sky and soundtrack iteration
The old zigzag side strips and light cushion stitches are removed. Rail center is 11 cm below world zero, sleeper center 18 cm below, with the water surface at 1.8 cm. Carriages are lowered 10 cm so wheel bottoms align with the submerged rails. The translucent ocean reveals nearby tracks while distance increases water opacity. Five differently oriented wave scales, slowly warped by noise, replace the repeating highlights.

Every one of the 16 wheel contacts has animated, raised torus ripple crests and ballistic splash droplets, tied to train speed. All crests and droplets use two instanced draws, with fewer instances on touch devices. Clouds use one instanced draw: 38 clusters / 266 puffs on desktop, 24 clusters / 168 puffs on touch devices, with day/evening/night shading and distance haze. The renderer lowers its pixel ratio to a minimum of 1 when sustained frame timing exceeds 32 ms; no additional full-scene reflection passes were added.

Quiet Tide is an original, sample-free 72 BPM lo-fi composition. Its 16-bar stereo PCM recording is 53.333 seconds long, with circular note tails and filtering for a continuous loop. See `dist/audio/LICENSE.txt` for its CC0 dedication and `scripts/compose-lofi.py` for the reproducible score/synthesis. Audio is fetched only when the user clicks the music button or presses M. A Web Audio loop and gain fade handle mute/unmute and volume; hidden tabs suspend the audio context.

Validation includes collision/continuity regression tests, full scene initialization and instanced transforms, reflection recursion checks, soundtrack format/loop boundary inspection, and audio gesture/loop/volume/loading-error state tests. Actual GPU appearance, browser audio playback and measured device FPS remain unverified here.

## Broader waves and visible ocean relief
Wheel crests now expand as irregular open arcs over several metres. Their birth coordinates remain in world space while the train moves on, leaving a genuine trailing wake. Seeded emission timing, lifetime, spread, aspect and orientation vary between crests. A small raised foam crest remains at each of the 16 wheel contacts. Crests, contact foam and droplets still use two instanced draws; old crests fade out over roughly three seconds.

The ocean now uses a grid concentrated around the camera and progressively coarser towards the horizon (160 × 160 desktop / 96 × 96 touch subdivisions). Six wave scales displace its vertices and drive shading, with stronger normal relief, sky reflection and time-dependent glints. Maximum wave displacement is 7.4 cm, leaving even the lowest trough above the rail top. It retains one ocean reflection pass and nearby track transparency.

Exterior and interior geometry were deliberately left unchanged in this iteration. Both requested Sketchfab pages displayed a thumbnail but their interactive viewers reported “Something went wrong with the 3D viewer.” Full shape, underside and interior details could not be checked, so user screenshots are required before matching those models further.


## Screenshot-based train revision
The nine user-supplied September 30 screenshots now ground the exterior and interior. Both end cabs have a bowed, sloped nose, two curved clear windshields with rubber seals, a white circular headlight, round markers, bronze skirts and silver buffers. The body uses burgundy/pink paint, an ochre window band, panel ribs, inset side doors, one long bevelled roof vent, visible axle links, suspension and underside equipment. Local procedural paint textures add restrained wear without downloading third-party model assets.

The interior now has stepped brass window frames, a continuous cream vaulted ceiling with ribs, four round ceiling lamps per car, lengthwise wooden luggage rods on curved metal brackets, oval hand loops, red rounded leather cushions without white seams and a few parcels above the racks. Floor boards have staggered joints and small nail heads; the previous modest reflection remains. End walls use vertical wood boards, framed panels and an operable glazed sliding door. The open gangway and original five-minute loop, water, sky and soundtrack remain functional. Collision bounds follow the shortened benches and sloped cab.

Static details, including the glazing, are merged by material per carriage. Additional ray tests verify unobstructed window apertures, upward roof faces, the continuous ceiling, the level floor, opened door clearance and the new cab collision. CPU scene and movement checks passed; GPU appearance and measured device FPS have not been verified.


## Seating and cab access
Both long benches in each car offer 16 seating positions: 64 total, spaced 75.75 cm apart and aligned with the eight existing upholstered sections per side. Seats, geometry and collisions share layout constants. The seated eye is 2.365 m in carriage coordinates, compared with 2.69 m standing. Position and eye height ease over 0.42 seconds while mouse-look remains free. Camera placement always uses the moving car's transform. Walking input is ignored while seated; switching outside and back preserves the seat.

E stands the player in a checked clear aisle location beside that same seat. The contextual prompt appears only within range and when the centre gaze intersects a cushion, backrest or door aperture; partition walls and poles occlude selection. While seated, looking at a nearby seat/door shows the stand action, and looking out of the window hides it. E still stands the player regardless of their current gaze.

A wooden arched partition at each cab end includes a glazed sliding door with the same 1.05-second easing as the gangway doors. Closed and partially opened doors block both directions. Wall sides remain solid when a door is open, and occupied thresholds prevent closing. The cab has a safe windshield/dashboard limit. Dynamic door panels now merge by material, reducing total scene meshes from 126 to 110 despite the additional doors. Browser WebMCP door controls support optional `kind: "cab"` and preserve the existing default gangway behavior.

Regression coverage includes all seat targets and safe exits, carriage attachment across curves and lap boundaries, both cab partitions and two-way collision, and a full CPU scene simulation driven through keyboard, mouse and contextual clicks. The simulation checks seating/standing, seated movement lock, view switching, gaze gating, door opening, cab entry/exit, occupied thresholds, water, lighting, audio controls and reflection recursion. Actual GPU rendering, pointer-lock behavior and device frame rates remain unverified in this environment.


## Eight-minute sea route, station, island and birds
The ellipse is now 600 / 380 m, a 3,117.67 m route with a 480-second lap. This scales the previous route by 1.6 while preserving 6.495 m/s and the arc-length mapping. Both cars and all seated/walking passengers continue seamlessly across lap boundaries.

The user-supplied station/island collage grounds the new geometry. One warm stone platform has jointed slabs, a thin yellow track edge, white far/end fences, an open red-brown waiting shelter with a corrugated gray roof, a pale signboard, bench and tall signal. Its nearest edge is 2.2 m from track centre, leaving at least 46 cm from the swept train envelope. The train does not stop. A long, low grassy island lies outside the rails, with a pale two-storey house, brick-orange gabled tile roof, two chimneys, dark framed windows and a slender leaning tree with layered green canopy lobes. The house faces the railway. Small grass clumps are instanced and scenery is batched by material.

Eight small flocks / 40 birds on desktop, or six / 24 on touch devices, fly near different route sections. Their bodies and two hinged wings use three instanced draws. Smooth flight paths, banking, small height changes, independently phased wing beats and glide intervals continue without jumps. All birds remain several metres above the water; no water birds or fish were added. They appear in the same scene for orbit, walking and seated cameras.

The existing ocean reflector captures the station, house, tree and birds, without another reflection pass. One local soft directional shadow map (1024 desktop / 512 touch) follows the time palette, with subtle wave-displaced shadow sampling on the sea. Main illumination, reflected scene colors, shelter lamp and warm house windows ease with the existing 2.6-second time transition. Reflector passes reuse the shadow map.

Validation: syntax and all regression tests pass, including 480-second continuity/speed, platform and island clearance, lawn height/normals, house orientation, finite bird transforms/sky altitude, animation continuity and touch budgets. The full CPU scene simulation preserves seating, cab/gangway doors, time controls and the existing reflection recursion guard. The expanded ocean shaders compile and link in an OpenGL ES 3.2 Mesa context with the directional PCF shadow configuration. Actual browser GPU appearance, audio, pointer lock and measured device frame rates remain unverified in this environment.


## Train controls, cinematic camera and painted sky
A signed train speed and metric distance now drive both carriage poses. The train starts at its original 6.495 m/s; an uninterrupted lap still takes eight minutes. Stop brakes with a quintic easing curve over up to four seconds; starting takes five seconds. Reversing brakes to exactly zero, holds for 0.22 seconds, then accelerates in the requested direction. The analytic speed integral keeps position continuous and independent of frame rate. Active button states show the requested command, while a small live label reports actual braking/acceleration/travel. The world animation clock stays independent so walking, sitting, doors, waves and birds work while stopped. Reverse travel also produces wakes and backward-facing spray; spray animation does not jump as speed changes.

Cinematic (button or C) cycles six 14-second shots: front, side, rear, high, wide and landscape. Polar camera interpolation remains outside the full train envelope, with a smooth spatial height guard over the shelter, signal, house and tree. The camera follows signed train movement, including gradual reversal framing and stationary trains. Wide shots bias their framing towards the station/island when nearby. Entry and exit use a 0.72-second fade so a first-person camera does not travel through carriage walls. Closing restores the previous first-person pose/look or orbit angle and zoom, preserving the seated/standing passenger. A view button can also exit cinema. Repeated rapid toggles finish the pending transition coherently.

Birds now occupy 24 small flocks / 120 birds on desktop, or 16 / 64 on touch devices, at alternating sides of the track and near/far height bands. The same three instanced draws and independently phased flapping/gliding are retained. Wing transformation helpers are reused rather than allocated per bird/frame.

`dist/assets/painted-sky.png` is an original 1774 × 887 opaque image generated with the built-in imagegen tool. Prompt: “Original seamless 360° equirectangular painted anime sky, soft watercolor/gouache cumulus clouds, blue daylight, peach haze horizon, uniform blue zenith, calm negative space; no ground, water, objects, text or UI.” Its cloud shapes, painted lighting and faint texture are sampled by the sky shader, recolored with the existing day/evening/night palettes, and also used subtly on the existing 3D cloud field. A narrow smooth central-patch bridge joins the panorama edges with continuous values and slopes, and texture detail fades at the zenith. Stars use 3D spherical directions to avoid a longitude seam. Asset loading fades in the painted detail over 0.9 seconds; the palette sky remains usable if loading fails. No additional reflection passes were added.

Validation covers exact zero-speed reversal, interrupted commands, frame-rate-independent distance, both travel directions, all six camera shots, camera/scenery clearance across every shot, seated motion controls, stopped poses, reverse wakes, cinematic seat preservation, orbit restoration, rapid toggles and view overrides. The full CPU scene simulation runs 6,368 frames. Sky/cloud shaders compile and link in native Mesa OpenGL ES 3.2; rendering the actual sky texture at both sides of the panorama seam produces identical RGB values in day/evening/night tests. Native GPU sky panoramas were inspected. Browser scene rendering, pointer lock, audio and measured device FPS remain unverified in this environment.


## Quiet, living journey
Three requested additions extend the existing painted atmosphere without changing the time palettes, eight-minute route, train shell or No-Face placement.

- Independent ambience button / B and volume slider. Original sample-free Web Audio layers combine low rail rumble, paired rail-joint knocks, soft wind, water and occasional quiet carriage creaks. Rail sound follows absolute speed in both directions and stops at zero. Inside/outside distance, proximity to windows, open cab/gangway doors and listener orientation alter the mix. Music remains independently controlled. Audio requires a button/key gesture, suspends in hidden tabs and cleans up on page exit.
- 52 hand loops pivot around their real overhead attachments, using four instanced draws across both cars. Motion is restrained, responds to acceleration/braking, and settles after stopping. Soft window light is projected into the existing wood, seat and wall surface shaders from the actual world sun/moon direction and carriage orientation. It uses the existing window geometry dimensions, adds no layered planes and introduces no reflection passes.
- Seventeen tapered timber utility poles in three widely separated stretches, small porcelain insulators and gently sagging wires. Three additional glimpses along the route: a solitary cottage with warm windows and a small jetty, an empty water platform with a bench and lantern, and a low tree shoal. All scenery is merged into twelve material batches and captured by the existing ocean reflector. Cinematic cameras include the new poles, wires and landmarks in their smooth clearance guard and gently frame nearby landmarks in wide shots.

Official visual references inspected: https://www.ghibli.jp/works/chihiro/ and official stills https://www.ghibli.jp/gallery/chihiro041.jpg, https://www.ghibli.jp/gallery/chihiro042.jpg, https://www.ghibli.jp/gallery/chihiro043.jpg. Empty horizons, low islands, coral train/cream windows and violet-peach dusk inform the additions. Utility crossarms and wire spacing are original adaptation choices; these gallery frames do not establish measured pole details. No film image or third-party model is redistributed.

Validation: automatic tests cover audio gesture gating, speed/stop/reverse, window/door mix, rail-joint distance, independent volume, visibility and disposal; strap swing/settling, window shader hooks, finite scenery, pole clearance, landmark lighting and cinematic clearance in both directions. Existing seating, doors, No-Face reservation, train controls, palette transitions and cinematic return are regression-tested. Real browser rendering, audible playback and device FPS have not been verified in this environment.


## Thailand clock, drizzle, audio mixer, second station and ballast
The original manual day/evening/night presets remain. The Thailand time button samples a fixed GMT+7 offset independently of the viewer's device timezone. Smooth palette keyframes cover dawn, daylight, dusk and night: colors, ambient/main lights, stars, moon, train lights, house windows and station lamps share the same interpolated palette. The lock button freezes the currently displayed palette, including when pressed during a transition; unlocking resumes the prior mode. Selecting a manual preset exits sync and lock. Returning from a hidden tab eases towards the new current time rather than jumping. Sync works while the page is open and requires no scheduled task or external time service.

Gentle rain is opt-in and fades over a 1.4-second time constant. A single streak draw is anchored around the actual viewer; two carriage roof masks exclude rain from the cabin. Sparse sliding droplets are shaded on the existing glazing, without a screen overlay covering the view. Small expanding rain rings affect the existing ocean displacement and normals; no floating ripple sheets or added reflection pass are used. Rain sound is part of the ambient category and softly shifts towards roof tapping inside the train. Turning rain off fades every rain visual and its sound to zero.

The sound button opens one compact panel with independent on/off switches and level sliders for ambience, train and music. Ambient wind/water/rain retain a 45% default. Train rumble, rail-joint pairs and occasional carriage creaks have their own gain at 55%, approximately 22% above the former shared train level. Music remains 25%. All three categories start silent until explicitly enabled. Existing B/M shortcuts and WebMCP controls are preserved, with separate clock/rain/train-audio tools added.

A second version of the first station stands half a route away (70 m + half the track length). The stone platform width is 10.8 m, twice the original 5.4 m, while the nearest track-facing edge retains its original clearance. It has the same shelter, white fencing, bench, sign, signal and warm lighting, with no island, house or tree. Cinematic camera clearance includes its shelter and signal.

The supplied shallow-track images ground a continuous 3.7 m-wide submerged gravel ridge under and between the rails, with sloped shoulders, natural grey/tan stone variation and scattered low 3D pebbles. The gravel surface stays below water; tie and rail positions remain unchanged. Mesh vertices meet at the lap seam. Bed shading is native procedural material, with 18,000 instanced large pebbles on desktop and 6,500 on touch devices (two added draws).

Validation includes fixed-offset time across midnight, continuous night/star weights, manual override, lock preserving the actual displayed exposure, rain/glass fade and shutoff, independent train/ambient volume and gestures, second-station width/island exclusion/clearance, camera obstacle guards, submerged gravel and route continuity. The existing movement, seating, No-Face reservation, doors, reversal, palette, water and cinematic regressions also run. Actual browser GPU appearance, audible mixing and device FPS remain unverified in this environment.


## Station visits, snowfall and saved journeys

Automatic station stops are enabled by default. The controller brakes to the boarding-door alignment in either direction, waits 24 seconds, closes the side door and resumes travel. Movement still takes eight minutes per lap; station dwell adds time. Manual Stop/Forward/Reverse overrides the current automatic approach. Disembarking and boarding now use the continuous side-door/step path described below. Platform and island movement has bounded ground collision; a wooden walkway connects the first station to its grassy island. The recall command chooses the shorter route and holds the train until the visitor boards.

Settings persist locally on the visitor's device: time mode and frozen palette, image quality, preferred view and look, automatic stops, weather and frozen weather mix, and independent audio volumes/enabled states. Remembered audio resumes after the first click or key press. Low/medium/high quality controls pixel ratio, shadows, ocean/floor reflection resolution and particle/bird/pebble budgets.

Weather supports clear skies, drizzle, slow drifting snow and light mist. Optional automatic changes crossfade over several seconds; weather lock freezes the currently visible mix. Snow uses one point draw with camera-centred coverage, softly edged flakes, restrained size/opacity variation and the same cabin roof masks as rain. Cloud cover, haze and direct light change gently while the established time palettes remain intact.

Photo mode freezes the train, environment clock, weather, bird flight, No-Face and wheel spray while leaving the camera free. The lens is adjustable from 28 to 95 degrees. PNG capture re-renders the scene immediately before copying the canvas; postcard mode draws a cream border, journey title, station and GMT+7 caption into the exported image. Closing restores the prior camera controls and lens. Browser encoding/download and visual appearance still need a real browser check.

No-Face occasionally turns its mask slightly and its cloak sways subtly. A slow distant boat, a rare nighttime shooting star and faint stationary platform travellers add small, optional discoveries. Interior maps, clocks, tickets and a bag use original native geometry and small sign textures; clocks follow GMT+7.

## Second station proportion and layout correction

The 10.8 m-wide platform is now constructed at its true width rather than stretching its entire parent group. Its shelter has the same compact 1.9 m depth / 2.7 m frontage as the first station; roofing, fence posts, benches and signal cross-sections retain their proportions. The former detached little platform has been relocated into a 3.3 m-wide wooden annex joined directly to the second station at the same 0.74 m floor height. Visitors can walk continuously between them. There is no house island at this station.

Benches face the railway from the rear of the platform and annex, with approximately 45 cm seat height. Lantern poles occupy the rear corners, away from the boarding edge and pedestrian approach. The open waiting shelter sits against the back edge; the signal has a separate rear location. Furnishing and annex collision bounds are included in walking and cinematic camera guards.

The user's screenshot is the primary layout reference. Small open waiting shelters and rear/side enclosure are informed by the Agency for Cultural Affairs' Kinoe and Gujo-Hachiman station records:
- https://online.bunka.go.jp/heritages/detail/233948
- https://online.bunka.go.jp/heritages/detail/280093
- https://www.ghibli.jp/works/chihiro/

These references inform an original game-scale layout; film stills do not establish measured placement or dimensions. No new third-party image or model is redistributed.

Validation: npm syntax checks and the full CPU regression suite cover docking in both directions/frame rates, dwell/departure, recall/boarding, connected island and annex walking, shelter proportion preservation, camera collision, snow fade/lock, quality budgets, remembered settings, photo freeze (including wheel spray), lens restoration and controls. Snow, cloak, painted sky, rain, ocean, glass, shallow seabed and ballast shaders compile and link in native Mesa OpenGL ES 3.2. Full browser rendering, real PNG downloads, pointer lock, audible playback and device FPS have not been verified in this environment.


## Snow visibility correction

Snow now has a direct toggle beside Rain, synchronized with the Settings weather choice. Explicit weather selection reaches a visible mix over a 2.8-second time constant; automatic weather changes retain the slower 11-second fade. The flake field uses 3,200 desktop / 1,600 touch points over a 60 m horizontal area and 36 m height. Its lower bound follows elevated orbit cameras, instead of all flakes remaining below 18 m. Flakes are larger, softly edged and brighter, with top/bottom fading and the existing cabin shelter mask. Quality settings still reduce the draw count; snow is off until selected or recalled from the visitor's preferences.

Validation includes syntax checks, the full CPU interaction regression, weather/time tests, and all custom shaders compiling/linking in Mesa GLES. A standalone native snow-shader render measured visibly changed pixels from exterior, window-facing, high-orbit, low-quality and two-second manual-start cameras. Snow coverage increased in every case, including the previously nearly empty high-orbit view. This checks real shader rasterization; full browser scene appearance and device FPS remain unverified.


## Station seating, shelter and continuous boarding

Both station shelters are walkable through their open fronts. Separate wall/post/bench collision volumes leave the waiting area accessible. All 12 station bench positions support gaze-targeted E/touch seating, a smooth seated camera and a safe standing position; movement stays locked while seated. Covered waiting areas mask falling rain and snow, reduce wind/water levels and soften rain to a lower roof-tapping filter.

The leading car's actual sliding side-door aperture connects to each platform through two shallow wooden steps. Floor queries and step geometry share one world-space path. Walking across preserves view direction and camera continuity; passengers cannot cross a partly open door or leave the path into the sea. Automatic departure waits for a passenger in the doorway/steps, and manual forward/reverse commands are blocked there. The station shortcut positions visitors at the train doorway; it no longer moves them directly between train and platform.

A thin procedural snow coating builds on exposed upward-facing station roofs, benches, stone/wood platform surfaces, house roof tiles and the train roof. Covered benches remain bare. Snow builds over tens of seconds, melts gradually in clear weather and more quickly in rain, and stops changing during scene/photo freeze. Existing day/evening/night illumination lights the coating. No new texture downloads or rendering passes are required.

Photo mode uses the current station as its reference while ashore. Postcard title and station/time caption have separate bounded-width lines, keeping them readable in landscape and portrait exports.

Validation: all syntax checks and CPU regressions passed, including 38,976 integrated animation frames; tests exercise actual player control paths for continuous boarding, doorway departure holds, shelter seating/standing, recall and snow/photo freeze. Station tests cover both platforms, all 12 seat positions, wall occlusion and safe exits. Photo tests check fresh render/copy ordering, PNG dimensions, footer placement at three aspect ratios and failure/cleanup handling; canvas encoding/download are mocked. Nine custom shader programs, including the snow coating, compile/link in native Mesa GLES 3.2. A native coating raster verifies exposed horizontal surfaces brighten while covered benches and vertical walls remain unchanged.

A supported Sites browser QA capability is unavailable in this environment. Full browser scene appearance, pointer lock, actual PNG downloads, audible playback and device FPS still require a real browser check. Native shader and CPU checks are limited to the behaviors described above.


## Horizon seam and powder snow refinement

The painted sky is rendered at far depth in both the main camera and the ocean's oblique reflection camera. This prevents the water-plane clipping operation from exposing a black clear region in the reflected sky dome. A palette-matched scene background supplies a colour fallback; distant water gently approaches the current horizon colour while near-water clarity and ripples are retained. The softer colour direction follows the Met Office explanation of a paler horizon from increased atmospheric scattering:
https://weather.metoffice.gov.uk/learn-about/weather/optical-effects/why-is-the-sky-blue

The small red raised panel on each carriage roof now has its own snow-capable material, cloned from the existing paint. Its clear-weather appearance and geometry stay the same; the shared red carriage walls receive no snow coating. This adds one batched draw per carriage and no triangles.

Accumulation combines a continuous fine dusting with slow organic deposits instead of coarse, high-contrast bare patches. A derivative-filtered fine grain fades at distance to avoid shimmer. Millimetre-scale height variation perturbs the lit surface normal, and snowy surfaces become matte with reduced metalness. Cover still respects upward-facing surfaces, station shelters, gradual accumulation/melt and photo freeze. No vertex displacement opens gaps in roofs or platforms, and no new textures or rendering passes are required.

Validation: syntax and the full CPU regression suite cover the shared roof/panel snowfall and uncoated red walls. Ten custom GPU programs, including mapped roof paint, compile/link in native Mesa GLES 3.2. A native render using the actual sky sphere and actual oblique reflection-camera matrices at 2.6/12/60 m reproduces black clipped background before the fix and zero uncovered black pixels afterward. Snow shader samples remain finite at three accumulation stages, with substantially lower early-stage colour variation; exposed horizontal surfaces receive snow while sheltered benches and vertical walls remain unchanged. These are focused native shader renders, not full game/browser screenshots. Full browser scene appearance and device FPS remain unverified because the supported Sites browser QA capability is unavailable.

## Photo studio: aspect ratios, filters and effects

Photo mode (P or “ถ่ายภาพ”) now offers screen/free, 16:9, 21:9, 3:2, 4:3, 1:1, 4:5 and 9:16. A visible crop frame uses the largest inscribed crop, with horizontal/vertical offset controls when space permits. Orbit rotation, zoom, Shift-drag panning and two-finger panning/zoom remain available. Rule of Thirds guides and the dimmed area are separate from the captured WebGL canvas. The controls can collapse while composing.

The eight presets are Original, Warm Memory, Pastel Dream, Film 35mm, Anime Cel, Moonlit Blue, Rainy Window and Black & White. Presets set restrained bloom/grain/vignette levels and preserve manual exposure/contrast/saturation/temperature adjustments. Overall intensity blends the complete look against Original; zero intensity and hold-to-compare both use the normal game render. Original comparison supports mouse, touch and Space/Enter, and clears on pointer cancellation, lost capture, blur or photo exit. Reset restores the controls and entry lens.

Live effects and PNG export share a GPU path: linear half-float scene rendering, optional separable highlight blur, one ACES/sRGB conversion, then preset colour grading, manual adjustments, crop-relative vignette and stable grain. Scene exposure and materials are unchanged, and processing targets are released on photo exit. HDR allocations are bounded to a 2880-pixel long edge with up to two MSAA samples. The PNG copies a freshly processed frame, uses the exact selected crop, and limits its long edge to 2880 pixels. The postcard footer/border and two caption lines use shared geometry for preview and export. Saving during an Original comparison still saves the selected look.

Validation: all syntax checks and the existing CPU regression suite passed, including 39,006 integrated scene renders. Photo tests cover 120 aspect/size/offset combinations, all eight filter render paths, 24 preview/postcard geometry combinations, PNG source rectangles and sizes, compare/save/reset, zero intensity, HDR bounds, renderer restoration on failure and disposal. Canvas encoding and downloads are mocked. Native Mesa GLES compiles/links both new shader programs and checks actual pixels against the game's ACES/sRGB reference, distinct preset colours, retained warm lamps, monochrome neutrality, manual adjustments, stable grain, a crop-relative vignette and RGBA16F blur halos.

Optional native validation (requires Mesa EGL/GL and NumPy): `python scripts/check-photo-shaders.py`. A supported Sites browser QA capability is unavailable here; full browser appearance, actual PNG download and device FPS remain unverified.

## Overall painted graphics upgrade

Lighting now follows the train throughout the complete route, with tighter, texel-aligned shadow coverage, softened window-light edges, blue water bounce and subtle contact shading beneath station furniture and foundations. Shadow maps use 1024 pixels at medium quality and 2048 at high, capped at 1024 on touch devices. Derivative-filtered brush variation, gentle wet-surface response and distance colour blending share the current time/weather palette. Train window frames have rounded seals and brass edges, with small panel rivets; rain glazing adds restrained angle-dependent sky tint and cold edge haze while keeping the view clear.

Ocean reflections use a small three-tap softening kernel. Distant glints fade with pixel footprint, shallow beds have moving interconnected light patterns, and four low-contrast ridge bands extend the horizon. The established horizon/reflection fix and clear shallow water remain in place. Cottage roofs and exposed timber share gradual snow accumulation and melt with the main stations, and snow remains matte over wet material shading.

Station clocks track the selected time, with notice boards, ticket plaques, parcels, bench joints and fittings arranged along existing walls/furniture edges. Houses and the route cottage have shutters, gutters, downpipes, porch details, window boxes and chimney joints. The walking paths, shelter seating and boarding interactions use their existing geometry and clearances.

All four trees now use individual curved leaf blades, smaller branches and twigs rather than solid crown spheres. There are 8,800 leaf instances at desktop high quality, drawn in four batches. Seeded leaf size, orientation and colour vary naturally; shared wind drives both colour and shadow passes, subtle veins receive filtered shading, and a light frost responds to accumulated snow. Medium/low quality reduce the leaf count to 78%/52%; touch devices start with 46% of the desktop budget. Scene and photo freeze preserve the leaf motion and station clock hands.

Validation: syntax checks and the complete CPU regression suite passed, including 39,006 integrated render calls. Graphics checks exercise individual leaf geometry, quality counts, finite transforms, full-route light coverage, weather/snow material composition, house/station additions, contact-shadow placement and clock freeze. Sixteen actual composed shader programs compile/link in native Mesa GLES, including rain glass, snow-coated roofs, water, leaf shadows and mapped interior materials. A native render of the actual 4,200-leaf station tree and branch buffers confirms visible wind and pixel-identical frozen repeats. This is an isolated model check; full browser scene appearance and measured device FPS remain unverified because the supported Sites browser QA capability is unavailable.

Optional graphics validation (requires Mesa EGL/GL, NumPy and Pillow): run `node scripts/graphics-shaders.mjs --preview > /tmp/railway-graphics-shaders.json`, then `python scripts/check-photo-shaders.py /tmp/railway-graphics-shaders.json`. The isolated tree preview is written to `/tmp/railway-foliage-qa.png`.

## Warm train headlights and live bloom

The supplied illustration guides a warm, broad beam from the actual roof-mounted lamp. A bounded, soft cone integrates the ray interval inside its volume, fades towards its end and the sea surface, and strengthens smoothly from dusk into night. Daylight hides the cone. Rain, mist and snow gently increase visible scattering. The leading cab follows actual travel direction, stays selected during a stop, and changes to the rear cab during reverse travel. A matching spotlight lights nearby scene geometry; the ocean shader adds a soft, wave-modulated pool of warm light ahead. No new shadow-map pass is added.

Live gameplay now uses the same linear HDR processing allocation as photo mode. Highlight extraction and two reduced-resolution blur passes add restrained bloom to bright lights before one ACES/sRGB conversion. Bloom increases gradually with the evening/night lamps; the extraction threshold keeps ordinary surfaces from glowing heavily. Photo bloom remains an additional adjustment. Original comparison and zero photo intensity retain the game lighting and bloom, and exported photos render through that same path. World targets are bounded to 2880 pixels at high quality, 2560 at medium and 1920 at low/on touch devices; blur targets use half resolution or quarter resolution on low/touch. Photo mode retains its 2880-pixel allocation cap. Existing adaptive pixel ratio remains active.

Validation: syntax and the complete regression suite passed, including 39,006 integrated scene render calls. Added tests cover exact lamp placement, day/dusk/night visibility, reverse/stop direction, weather scattering, stable frozen transforms, shared photo/game targets, quality bounds, Original/zero-intensity bloom and restoration after a failed blur. Seventeen composed scene shaders compile/link in native Mesa GLES, including the headlight volume, ocean light and two spotlights. Native HDR pixel tests verify highlight halos and preserved game bloom during photo comparison; an isolated render of the actual cone geometry checks dusk/night strength, mist density and identical frozen repeats. Full browser scene appearance and device FPS remain unverified because a supported Sites browser QA capability is unavailable here.

Optional isolated headlight preview: `node scripts/graphics-shaders.mjs --headlight-preview > /tmp/railway-light-shaders.json`, then `python scripts/check-photo-shaders.py /tmp/railway-light-shaders.json`. The HDR beam preview with the game's ACES/sRGB conversion is written to `/tmp/railway-headlight-qa.png`.

## Fading water reflections and nighttime aurora

The supplied water reference has readable object silhouettes near their bases, softly fading reflected tips and small sideways bends along the ripples. The existing planar ocean reflection now includes a depth texture in the same reflection pass. The shader reconstructs the reflected object position with the current oblique reflection camera, then attenuates its contribution as object height and reflected reach increase. Far-depth sky pixels keep their sky reflection. Two slow, irregular wave scales introduce a restrained lateral wobble, with a smaller vertical displacement; derivative filtering suppresses that extra distortion at the horizon. The existing three-tap softening, water transparency, shallow beds, rain ripples and warm headlight footprint remain in place. Reflection targets use single-sample colour/depth so depth sampling stays consistent; no extra scene pass is added.

Three broad, translucent aurora arcs are painted directly in the sky shader. Green/teal lower folds blend into muted violet higher up, with fine vertical strands, slow drift and gentle brightness variation. Aurora appears gradually during the night transition, fades at dawn, and is attenuated by clouds, overcast weather and mist. Daylight skips its shading work. It uses the existing sky geometry and simulation clock, so it freezes with photo mode and appears naturally in the ocean's sky reflection. Manual time selection and GMT+7 synchronization both drive the same visibility.

Validation: syntax and the full CPU regression suite passed, including 39,006 integrated scene render calls. Added checks use twelve actual oblique reflection-camera matrices at three camera heights, verify recovered world positions, the single reflection pass, depth bindings across quality changes and the shared night/freeze clock. Native GLES compiles/links 18 scene programs plus one focused reflection test. Pixel tests using the actual sky geometry and shader verify visible night-only aurora, drifting curtains, cloud attenuation and frozen repeats; synthetic reflected silhouettes using the actual reflection functions verify fading tips, gently moving edges and distant ripple filtering. These are isolated shader checks, not full browser screenshots. Full browser scene appearance and device FPS remain unverified because the supported Sites browser QA capability is unavailable.

Optional focused native previews: `node scripts/graphics-shaders.mjs --sky-preview > /tmp/aurora-reflection-shaders.json`, then `python scripts/check-photo-shaders.py /tmp/aurora-reflection-shaders.json`. The sky preview is `/tmp/railway-aurora-qa.png`; the rigid/fading reflection comparison is `/tmp/railway-reflection-qa.png`.

## Clearer edges and image quality

High quality now requests 4-sample MSAA on the actual HDR scene target, rather than relying only on the antialiased display canvas. The sample count is selected from the GPU's supported RGBA16F renderbuffer formats, with an edge-adaptive display resolve available even when multisampling is unavailable. Medium requests two samples; low uses the display resolve alone, and touch devices request at most two samples. Edge smoothing and restrained texture sharpening share the existing final composite, so no extra scene/fullscreen pass or history buffer is added. Sharpening avoids strong silhouette edges and clamps to neighbouring colour bounds to prevent halos. Tone mapping still happens once; bloom and photo presets stay in the shared path, including Original comparison and PNG exports.

High gameplay targets can retain a 3840-pixel long edge, medium 2880 and low 1920, with an 8.3-million-pixel overall bound. Touch gameplay is capped at 2160 pixels and photos retain their 2880-pixel bound. Anisotropic filtering increases for tilted wood/leather textures within GPU and quality limits. The adaptive pixel ratio now has a quality-specific floor: desktop High on a 2x Retina display stays at or above 1.5x. Resolution moves in smaller 0.125 steps and recovers after sustained frame-rate headroom; hidden tabs, photo mode, loading stalls and resumed long frames do not change it. High remains the default and existing saved quality preferences are preserved.

Validation: syntax and the full CPU regression suite passed, including 39,006 integrated scene render calls. Image-quality tests cover supported format/sample selection, 3840×2160 and extreme-aspect allocation bounds, sample reallocation/cleanup, quality floors, sustained recovery and photo/visibility holds. Native GLES pixel tests verify smoother diagonal coverage, retained thin lines and flat colours, stable frozen pixels, gentle texture contrast recovery without overshoot, and the same anti-aliasing in Original/zero-intensity comparison. The existing ACES/sRGB, eight filters, bloom and colour tests also pass. The synthetic edge comparison is `/tmp/railway-aa-qa.png`, produced by `python scripts/check-photo-shaders.py`. Full browser appearance and measured device FPS remain unverified because a supported Sites browser QA capability is unavailable.

### Control Center and scene corrections (October 4)

The upper-right toolbar is now one 52 px settings icon opening a compact translucent navy Control Center. Five accordion sections organize time (manual presets, GMT+7 sync, lock/status), weather (rain/snow plus clear/mist and automatic/lock), the three independent audio channels, camera/photo presets, and quality/journey/UI settings. All existing photo tools and exports remain available. Buttons have 44 px minimum targets, viewport/safe-area sizing, reduced-motion support and native keyboard controls. The panel closes via the icon, close button, Escape or an outside click; it clears held movement and pointer look, releases pointer lock, disables orbit input and consumes the outside close click so it cannot drag the scene. The train and weather continue while editing controls.

The static window belt line is interrupted at every side doorway; matching trim belongs to each leaf and moves with it. Both boarding portals are ray-tested open and closed, while the full existing cab/gangway, collision and boarding suite is retained. Reflected snow uses a separate smaller/dimmer sprite profile, subtle water distortion, distance fade and reflection-resolution scaling; the main-camera uniforms reset before the falling flakes render.

Headlight opacity is multiplied by 0.75. Its spotlight origin is aligned with the actual lamp (Three.js lights otherwise start one metre above their parent origin), with the active leading cab following actual travel direction. The volume clips its ray interval to air above the sea, uses 24 integration samples, and is omitted from planar reflections. A single active 256/512 px spotlight shadow map occludes both the fog volume and the softer, wave-broken surface footprint; the lamp emission and shared bloom remain. Low quality disables the large sun shadow while retaining this small occlusion map. Opaque train geometry casts shadows, so the body can block a beam. Shadow allocations resize/dispose with quality and cleanup.

Distant reflected geometry is distinguished from the exact far-depth painted sky, reconstructed using the actual oblique camera matrix, and mixed into the current sea palette with low contrast, a gradual tip fade and five-tap softening. Near train/window reflections retain their own fade and ripple behavior.

Validation: npm check/test (including the full runtime journey), Control Center input/focus/rapid-toggle tests, 42 boarding portal rays, real lamp shadow projection/binding/reverse/disposal checks, and native GLES compile/link for 22 shader programs. Native component pixels verify packed-depth occlusion, reflected snow size/brightness and scaling, mountain palette/tip fade, stable frozen frames, headlight front/side/high views, and existing aurora/reflections. Full browser layout/scene appearance and FPS were not tested because the managed browser-preview capability was unavailable.


## Reference passengers and camera input recovery

Chihiro Ogino sits beside No-Face on the second carriage's right bench (seat 55, next to No-Face's seat 56). Her native 3D model uses a shaped face, separate eyes and eyelids, individually tapered brown bangs, a short tied ponytail, a cream/green half-sleeved shirt, pink shorts, hands resting on her lap, white socks and yellow shoes. Small mouse and fly-bird models perch on the actual inner window trim to her left, facing the sea. Their body motion and her blink/look follow the shared, photo-freezable simulation clock. Both character seats are reserved and their collision bounds keep the aisle open.

No-Face now has one continuous seated cloak down to the actual carriage floor, mostly concealed feet, muted hands and a slightly translucent body (88% opacity); the ivory mask stays opaque. Idle cloth motion leaves the floor hem planted.

Control Center uses wrapped native timers so its fade cannot leave camera input disabled or abort photo entry. Closing restores input before its visual fade finishes and the closing panel stops intercepting pointer hits. Rain, snow, clear and mist now share one exclusive selector; the duplicate rain/snow switches are removed. Photo mode hides first-person pointer-lock prompts, focuses its close control and enables full camera orbit/pan/zoom. Exiting drains photo damping before restoring the previous camera, lens and orbit limits.

Validation covers both occupied seats, finite character surfaces, floor/sill placement, character idle freeze/disposal, realistic timer receiver constraints, rapid menu toggles and actual OrbitControls pointer handlers after button/Esc/outside closure. The CPU game simulation also enters/exits photo mode from open controls in both views and tests orbit, Shift-pan, scroll zoom and camera restoration. Existing PNG crop/filter/encoding tests run with browser encoding mocked.

Optional native material/geometry preview: `node scripts/character-shaders.mjs > /tmp/railway-character-buffers.json`, then `python scripts/check-photo-shaders.py /tmp/railway-character-buffers.json`. It compiles the actual character material shaders and renders front, three-quarter and child close-up cutaway fixtures to `/tmp/railway-characters-qa.png`. This is component visual QA; full browser UI, actual PNG downloads and device performance remain unverified in this environment.

## Welcome, resume, hints and quiet journeys — v31

The welcome screen presents **Start / Resume**, low/medium/high image quality,
and a sound choice. Travel and scene input wait until a journey begins. A saved
journey also offers **New journey**; Settings → New journey can reopen this
screen, with Cancel/Esc returning to the current trip. The opening sound choice
unlocks browser audio; the three separate sound controls remain available.

Journey progress uses `sea-railway-journey-v1` in localStorage, separate from
`sea-railway-settings-v1`. It saves every five simulation seconds and before
page exit/hiding. Resume restores train position/direction, train seats or
station/bench position, look direction, door targets and snow accumulation.
Only valid layout positions are restored; an obsolete saved threshold returns
the player to the carriage aisle. Storage denial/quota failures do not prevent
play. This is a local browser checkpoint; it is not cross-device cloud sync.

Once-only contextual hints use `sea-railway-hints-v1`. They explain the current
view, first walking/seat/door encounter, docking, shore and photo mode. An open
menu or capture hides them. Settings can turn hints off or replay them, and a
compact journey-help disclosure keeps the essential controls available.

An occasional original passenger walks aboard through the first carriage's
side door, reserves a free seat and rides to the next stop. Departure waits for
the passenger while boarding/alighting. A player who occupies the path makes
the visitor step aside and fade, releasing the seat. The NPC has no quests,
dialogue or notification sounds. Existing birds, gradual house lights, quiet
boats and sky/platform events remain part of the ambient world.

### Six views and a short clip

Control Center → Settings → journey help offers **Save six views** and
**Record 15-second clip**. Gallery presets cover daytime exterior, evening Sea
Station, night aurora, Chihiro/No-Face inside, rainy window and snowy Far Tide.
It freezes simulation, hides UI, saves six PNGs as one standard ZIP and restores
the prior camera/time/weather after completion or failure. Gallery images fit
within a 1280px long edge and use the current screen's aspect ratio.

The silent clip uses MediaRecorder and a separate 1280px canvas at 24fps with a
2Mbps requested bitrate. Available WebM/MP4 support is detected; unsupported
browsers show a status message. Stop cancels the clip. Completing it returns to
the earlier view while keeping the train's new position. Frames are copied
immediately after scene rendering; recording tracks/timers are cleaned up.
These downloads stay on the player's device and are not automatically uploaded
to Notion. Upload captured media to the handoff page after browser review.

### Source handoff and one-file export

Source and Audio ZIPs share the `Sea-Railway-v31/` root. Merge them before
running `python3 -m http.server 8000 --directory dist` on your own computer.
No npm dependency installation is required to play; Node 24/npm are used by
the regression tests. The editable source remains directly inside `dist/`.

`python3 tools/export-single-html.py` builds `Sea-Railway-v31.html`, including
all 53 modules, three stylesheets, the original painted-sky PNG and Quiet Tide
WAV. Open in a modern browser supporting WebGL 2 and import maps. The export
requires no CDN or external assets. `SOURCE-REVISION.txt` in delivery archives
provides the revision when Git is absent.

Validation: `npm run check`, `npm test`, `node scripts/verify-showcase-png.mjs`,
`python3 tools/verify-html-export.py Sea-Railway-v31.html` and
`node --experimental-vm-modules tools/verify-html-modules.mjs Sea-Railway-v31.html`.
See `QA.md` for what was actually verified. The six latest full-game screenshots
and clip, browser gameplay/layout/audio and device FPS still require a real
browser check; the supported browser capability is unavailable here.
