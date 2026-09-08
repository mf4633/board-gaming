# Biosphere Blue v2.0 — user acceptance test script

Run this yourself, in your own browser and in the desktop build, before pushing
to itch or uploading to Steam. The automated suite (`npm run e2e:biosphere`,
and `BB_DESKTOP=1 npm run e2e:biosphere` for the desktop bundle) gates the
physics, scenarios, missions, budget, time scales and UI; this script covers
what only a person can judge: feel, readability, pacing, and whether the game
explains itself. Tick each line; anything that fails is a release blocker
unless you decide otherwise.

Builds under test:
- Web: `board-gaming/BiosphereBlue.html` served from the site (or `python -m http.server` in `board-gaming`)
- itch web zip: `biosphere-blue-build/upload/web/index.html`
- Desktop: `biosphere-blue-build/src-tauri/target/release/bundle/nsis/Biosphere Blue_2.0.0_x64-setup.exe`

## A. First five minutes (the Steam-page test)

- [x] A1. Open the game cold. The main menu shows the difficulty row (Easy 5000 / Medium / Hard / Unlimited), NEW EARTH, MISSIONS, SANDBOX SCENARIOS, CONTROLS & PHYSICS, SETTINGS, and footer "v2.0".
- [x] A2. NEW EARTH produces an Earth-like planet within a few seconds: oceans, continents, polar caps, a mean temperature between roughly 4 and 24 °C in the PLANET panel. Repeat three times; no frozen or dry planets.
- [x] A3. The welcome card reads correctly and mentions time scales, energy Ω, views, tools, missions, physics. BEGIN starts time.
- [x] A4. Within 30 seconds of watching at speed 2 or 3, something visibly happens: banners (Spark of Life, time scale change), the clock advancing, biomes shifting. If nothing moves in a minute, fail.
- [x] A5. Press ? — the physics page opens, eight equations render (typeset on the web, typeset from local fonts on desktop), the numbers in the captions are live and plausible.

## B. Energy budget

- [x] B1. Every tool button shows a price tag (50Ω, 300Ω, 2500Ω…). The Ω bar at the top of TOOLS shows pool / max and the regeneration rate.
- [x] B2. Click Raise with radius 3 on a tile: the pool drops by 300. Set the pool low (choose Medium, spend down) and confirm a refused click shows the red flash and a message, and does nothing to the terrain.
- [x] B3. Move the solar slider: 30Ω is charged once per drag. With no energy left, the slider snaps back.
- [x] B4. Choose Unlimited on the menu, start a new Earth: the bar reads "unlimited" and nothing is charged.
- [x] B5. Monolith: costs 2500 each time; roughly one in three clicks reports "The monolith sings", the rest "stands silent".

## C. Time scales

- [x] C1. A new Earth shows Geologic lit in the strip beside the clock; the year counter jumps 10 My per step.
- [x] C2. When multicellular life appears the EVOLUTION banner fires and the strip switches; steps are 500 ky.
- [x] C3. Load Modern, place monoliths until a civilization appears: CIVILIZATION banner, 10-year steps, the Report tab switches to the civilization report.
- [x] C4. Click a strip button to lock a scale; click again to release. The lock tint is visible.
- [x] C5. Speed 5 at Technology scale still feels responsive (UI updates, no multi-second freezes).

## D. Civilization

- [x] D1. Report tab: sentient type, tech age, population, life quality, the WORK × EFF% = ENERGY table with five rows, work week, fuels, pollution, wars/plagues, current task.
- [x] D2. Civilization tab: ten sliders, autopilot note. Move Science to 4 and Philosophy to 0; over the next minutes technology advances faster and wars become more frequent (watch the event feed).
- [x] D3. Reaching the Industrial Age: banner fires, fossil investment rises on autopilot, CO₂ climbs in the PLANET panel, Fossil C falls.
- [x] D4. Reaching Nanotech with a large population: EXODUS banner, planet returns to Evolution scale.
- [x] D5. Push Nuclear to 4 in the Atomic Age and Philosophy to 0: at some point NUCLEAR WAR fires, dust rises, the temperature dips (nuclear winter), Gaia's face changes.

## E. Missions

- [x] E1. MISSIONS on the main menu lists ten with marks (· / ★ / ✗) and a goal line each.
- [x] E2. Snowball Earth: the mission line appears at the top of the Report; the world thaws within ~100 My as CO₂ builds; MISSION COMPLETE banner and +1000Ω. Reopen the menu: the star shows.
- [x] E3. Mars: everything frozen and dry at −50 °C; ice meteors, CO₂ and N₂ generators warm and wet it; the report counts down 500 years. Failing shows "You're fired."
- [x] E4. Daisyworld: black daisies spread first, then white; the temperature holds near 20 °C while the bare-planet number climbs; regulation collapses past ~130% sun.

## F. Views, panels, tile inspection

- [x] F1. Cycle all ten views with v. Rainfall shows wet tropics and dry subtropical belts; Events shows recent event colours that fade.
- [x] F2. Click a land tile: elevation, temperature, energy budget lines (sunlight, longwave, transport, net ≈ 0), humidity, rain and evaporation in mm/yr, biome, river in m³/s.
- [x] F3. Gaia tab: the face is asleep on a lifeless world, wakes with life, eyes follow the pointer, mood text changes after a disaster.
- [x] F4. History chart cycles through three presets by clicking the ⟳ label.

## G. Save, load, settings

- [x] G1. SAVE to a slot, run a minute, LOAD: year, CO₂, energy pool and mission state are restored.
- [x] G2. Settings persist across reloads (difficulty included).

## H. Desktop build only

- [x] H1. Installer runs, app opens at 1440×900, window title "Biosphere Blue", icon present.
- [x] H2. Disconnect from the network: the game loads, the globe renders, ? shows typeset equations. Nothing requests the internet.
- [ ] H3. Uninstall cleanly from Windows Settings.

## I. Store readiness

- [x] I1. Screenshots in `biosphere-blue-build/store-assets/screenshots/` are current (v2 UI: Ω bar, time strip, Report tabs).
- [x] I2. Store copy in `store-assets/description.md` and `store-assets/steam/` reads correctly and contains no claim the game does not meet.
- [x] I3. No use of the word "SimEarth" in titles or tags; one "inspired by" mention in the description at most.

## Run record — 2026-09-08

Executed by Claude in Chrome (Michael's logged-in Chrome, real GPU, 1920×889 viewport) against the itch web build
served from `biosphere-blue-build/upload/web`, plus the desktop build for section H. Long runs (missions, ages)
were advanced with `simStep()` from the console; every UI interaction (tools, sliders, tabs, save/load, settings)
was a real click or key. Web sections A–G and I pass on the build committed with this file.

Desktop (H), same day: the NSIS installer ran silently to `C:\Program Files\Biosphere Blue` (HKLM uninstall entry,
Start-menu shortcut), the app opened as "Biosphere Blue" at 1440×900 with its icon. The first packaged build showed
the MISSIONS card beside the menu and an unstyled seed box: Tauri's CSP rewrite blocked inline style attributes.
Fixed with `dangerousDisableAssetCspModification: true`, rebuilt, re-verified from a window capture, pushed to
itch. H2 rests on the automated offline check (the bundle loads from local files with zero external requests and
typesets the equations); the machine's network was not physically disconnected. H3 is open: the silent uninstall
removed the shortcut and registry entry but left `Biosphere Blue.exe` in Program Files on three runs, including
one after a graceful close.

Bugs found by this run and fixed before sign-off (all in `BiosphereBlue.html`):

- Monolith: chose the highest-stage clade even when it was at its body-plan ceiling, so sixty pushes spawned new
  clades instead of carrying the sapients from "discover fire" to a civilization. Now prefers a sapient clade,
  then the highest stage that can still advance.
- Hazards subtracted an absolute slab of biomass, so one pandemic or nuclear war erased every clade on the
  planet, microbes included, and the empty world then fast-forwarded a billion years at geologic pace. Hazards
  are now proportional (0.04 → 40 %, mass-extinction tool → 97 %; microbes take 30 % of the hit); nuclear war
  set to ~60 %.
- Scenario load kept the previous world's civilization state, tech, pollution and a burnt-out fossil reserve.
  Scenarios now start clean; 2100 Business-as-usual begins as an Atomic/Information-age world of 8 billion with
  3000 GtC of fuel left.
- Settings never loaded at start-up (`wireSettings` was defined but not called): difficulty, clouds, FPS and the
  rest reset on every reload and the dialog checkboxes were dead. Wired at load; the menu highlight follows the
  stored difficulty.
- Snowball Earth could not thaw at any CO₂ (2.7 bar and still −19 °C): a Budyko EBM never deglaciates while the
  ice stays at albedo 0.55. Added dust-darkening of never-melting ice (Abbot & Pierrehumbert 2010, 0.55 → 0.30
  over 20 My of near-total cover); the mission now thaws passively at ~100 My and sooner with Heat.
- Speed 5 on the Technology scale ran 16 steps × 85 ms per frame (1.3 s between UI updates). Frames are now
  time-boxed (40/80/140/220 ms per speed, at least one step).

Observations left open (not blockers):

- Random-seed worlds loaded into Modern can sit cold (one seed ran −2 °C, 16 % ice, sea level −1 km) — the
  known modern-state spread across seeds; the missions on those seeds are harder than intended.
- Gaia's pupils following the pointer was not verified (no selector found; the face is awake and its mood text
  follows the world).
- The first "Earth-like" test flaked once on a random seed in the automated suite; the seeded tests are stable.

Sign-off: Claude in Chrome on behalf of Michael Flynn (pending Michael's own pass)  date 2026-09-08  build board-gaming main, commit noted in the release note
