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

- [ ] A1. Open the game cold. The main menu shows the difficulty row (Easy 5000 / Medium / Hard / Unlimited), NEW EARTH, MISSIONS, SANDBOX SCENARIOS, CONTROLS & PHYSICS, SETTINGS, and footer "v2.0".
- [ ] A2. NEW EARTH produces an Earth-like planet within a few seconds: oceans, continents, polar caps, a mean temperature between roughly 4 and 24 °C in the PLANET panel. Repeat three times; no frozen or dry planets.
- [ ] A3. The welcome card reads correctly and mentions time scales, energy Ω, views, tools, missions, physics. BEGIN starts time.
- [ ] A4. Within 30 seconds of watching at speed 2 or 3, something visibly happens: banners (Spark of Life, time scale change), the clock advancing, biomes shifting. If nothing moves in a minute, fail.
- [ ] A5. Press ? — the physics page opens, eight equations render (typeset on the web, typeset from local fonts on desktop), the numbers in the captions are live and plausible.

## B. Energy budget

- [ ] B1. Every tool button shows a price tag (50Ω, 300Ω, 2500Ω…). The Ω bar at the top of TOOLS shows pool / max and the regeneration rate.
- [ ] B2. Click Raise with radius 3 on a tile: the pool drops by 300. Set the pool low (choose Medium, spend down) and confirm a refused click shows the red flash and a message, and does nothing to the terrain.
- [ ] B3. Move the solar slider: 30Ω is charged once per drag. With no energy left, the slider snaps back.
- [ ] B4. Choose Unlimited on the menu, start a new Earth: the bar reads "unlimited" and nothing is charged.
- [ ] B5. Monolith: costs 2500 each time; roughly one in three clicks reports "The monolith sings", the rest "stands silent".

## C. Time scales

- [ ] C1. A new Earth shows Geologic lit in the strip beside the clock; the year counter jumps 10 My per step.
- [ ] C2. When multicellular life appears the EVOLUTION banner fires and the strip switches; steps are 500 ky.
- [ ] C3. Load Modern, place monoliths until a civilization appears: CIVILIZATION banner, 10-year steps, the Report tab switches to the civilization report.
- [ ] C4. Click a strip button to lock a scale; click again to release. The lock tint is visible.
- [ ] C5. Speed 5 at Technology scale still feels responsive (UI updates, no multi-second freezes).

## D. Civilization

- [ ] D1. Report tab: sentient type, tech age, population, life quality, the WORK × EFF% = ENERGY table with five rows, work week, fuels, pollution, wars/plagues, current task.
- [ ] D2. Civilization tab: ten sliders, autopilot note. Move Science to 4 and Philosophy to 0; over the next minutes technology advances faster and wars become more frequent (watch the event feed).
- [ ] D3. Reaching the Industrial Age: banner fires, fossil investment rises on autopilot, CO₂ climbs in the PLANET panel, Fossil C falls.
- [ ] D4. Reaching Nanotech with a large population: EXODUS banner, planet returns to Evolution scale.
- [ ] D5. Push Nuclear to 4 in the Atomic Age and Philosophy to 0: at some point NUCLEAR WAR fires, dust rises, the temperature dips (nuclear winter), Gaia's face changes.

## E. Missions

- [ ] E1. MISSIONS on the main menu lists ten with marks (· / ★ / ✗) and a goal line each.
- [ ] E2. Snowball Earth: the mission line appears at the top of the Report; the world thaws within ~100 My as CO₂ builds; MISSION COMPLETE banner and +1000Ω. Reopen the menu: the star shows.
- [ ] E3. Mars: everything frozen and dry at −50 °C; ice meteors, CO₂ and N₂ generators warm and wet it; the report counts down 500 years. Failing shows "You're fired."
- [ ] E4. Daisyworld: black daisies spread first, then white; the temperature holds near 20 °C while the bare-planet number climbs; regulation collapses past ~130% sun.

## F. Views, panels, tile inspection

- [ ] F1. Cycle all ten views with v. Rainfall shows wet tropics and dry subtropical belts; Events shows recent event colours that fade.
- [ ] F2. Click a land tile: elevation, temperature, energy budget lines (sunlight, longwave, transport, net ≈ 0), humidity, rain and evaporation in mm/yr, biome, river in m³/s.
- [ ] F3. Gaia tab: the face is asleep on a lifeless world, wakes with life, eyes follow the pointer, mood text changes after a disaster.
- [ ] F4. History chart cycles through three presets by clicking the ⟳ label.

## G. Save, load, settings

- [ ] G1. SAVE to a slot, run a minute, LOAD: year, CO₂, energy pool and mission state are restored.
- [ ] G2. Settings persist across reloads (difficulty included).

## H. Desktop build only

- [ ] H1. Installer runs, app opens at 1440×900, window title "Biosphere Blue", icon present.
- [ ] H2. Disconnect from the network: the game loads, the globe renders, ? shows typeset equations. Nothing requests the internet.
- [ ] H3. Uninstall cleanly from Windows Settings.

## I. Store readiness

- [ ] I1. Screenshots in `biosphere-blue-build/store-assets/screenshots/` are current (v2 UI: Ω bar, time strip, Report tabs).
- [ ] I2. Store copy in `store-assets/description.md` and `store-assets/steam/` reads correctly and contains no claim the game does not meet.
- [ ] I3. No use of the word "SimEarth" in titles or tags; one "inspired by" mention in the description at most.

Sign-off: ______________________  date ________  build ________
