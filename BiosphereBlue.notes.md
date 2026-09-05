# Biosphere Blue vs. SimEarth (1990) — feature audit

Source: *SimEarth: The Living Planet* User Manual (Michael Bremer, Maxis 1990;
Macintosh edition, Internet Archive `Mac_SimEarth_manual`), plus the 2021
Manospondylus retrospective. Audited 2026-09-04 against Biosphere Blue after the
real-units physics rewrite (energy balance, water, carbon kernels).

Legend: **✓** present · **≈** present in a different form · **✗** missing

## 1. The energy budget (SimEarth's core mechanic)

| SimEarth | BB | Notes |
|---|---|---|
| Player energy pool in E.U. (Ω); starting = maximum: Easy 5000, Medium/Hard 2000, Experimental unlimited | ✗ → **built 9/4** | difficulty setting on the main menu |
| Regeneration per simulation cycle: 1 E.U. (Geologic, Evolution), 2/3/4 (Stone/Bronze/Iron), 5/6/7/8 (Industrial/Atomic/Info/Nanotech) | ✗ → **built** | tied to time scale + highest tech |
| Every tool costs energy: Set Altitude 50; Place Life 35→490 by class; cities 500→3500; terraformers 500; Monolith 2500 (even if it fails); events 50; biome 50; Model Control Panel change 30 per click, 150 per drag | ✗ → **built** | costs shown on each tool; brushes charge per click scaled by area |
| "There is no free lunch in SimEarth" — a tool you cannot afford does nothing | ✗ → **built** | |

## 2. Time scales

| SimEarth | BB | Notes |
|---|---|---|
| Geologic: 10 Myr per cycle, until multicellular life | ✗ → **built** | |
| Evolution: 500 kyr per cycle, until intelligence | ≈ | BB ran one fixed 100 kyr step for everything |
| Civilization: 10 yr per cycle, until the Industrial Revolution | ✗ → **built** | |
| Technology: 1 yr per cycle, until Exodus; then back to Evolution ("wildlife reserve") | ✗ → **built** | |
| Planet lifetime 10 Gyr, sun brightening 25% over 3.6 Gyr, the Sun burns Gaia at the end | ≈ | BB: real main-sequence brightening; no 10 Gyr death yet |
| History window spans ~1 Gyr / 70 Myr / 2,500 yr / 50 yr per scale | ≈ | |

## 3. Model Control Panels (16 settings each, 30 E.U. per click)

| Panel · slider | BB | Notes |
|---|---|---|
| Geosphere: Volcanic activity, Erosion (raises CO₂), Continental drift, Core heat, Core formation, Meteor impact, Axial tilt | ≈ | tilt slider only; the rest are code constants |
| Atmosphere: Solar input (down = sun off), Cloud albedo, Greenhouse effect, Cloud formation, Rainfall, Surface albedo, Air-sea thermal transfer | ≈ | solar slider only; BB derives greenhouse/rain/albedo from physics instead of dials |
| Biosphere: Thermal tolerance, Reproduction rate, CO₂ absorption, Advance rate, Mutation rate | ✗ | clade traits partly cover thermal tolerance |
| Civilization: Energy investment (Bioenergy, Solar/Wind, Hydro/Geo, Fossil, Nuclear) and Energy allocation (Philosophy, Science, Agriculture, Medicine, Art/Media) | ✗ → **built** | with the manual's efficiency-vs-technology table |

## 4. Tools (Edit Window)

| SimEarth | BB | Notes |
|---|---|---|
| Set Altitude raise/lower (50 E.U.) | ✓ | plus Flood |
| Place Life: 14 placeable classes (7 sea, 8 land, Carniferns evolve only) × 16 species; Extinct function | ≈ | BB clades: 9 body plans × 12 traits; "Seed animals" tool; no per-class placement or extinct-a-class |
| Place city: 7 tech levels | ✗ | civilization arises from a sapient clade only |
| Terraformers: Biome Factory, Oxygenator, N₂ Generator, Vaporator, CO₂ Generator, Ice Meteor (500 each); keep working until destroyed | ✗ → **built** | as global devices with real fluxes |
| Monolith: 1-in-3 chance to uplift, 2500 E.U. | ≈ → **priced** | BB monolith always pushes; now 1/3 and 2500 |
| Plant Biome: 7 biomes + Rock (50 E.U.) | ≈ | grass/forest/jungle seeding |
| Trigger Events (50 E.U.): Hurricane, Tidal Wave, Meteor, Volcano, Atomic Test, Fire, Earthquake (directional; pushes continental drift), Plague | ≈ → **extended** | had meteor/volcano; added hurricane, tidal wave, earthquake, atomic test, plague, fire |
| Move tool, Examine tool | ≈ | Examine = Info; no Move |
| Data layers in the edit window (biomes, life, cities, altitude/magma) and climate overlays | ≈ | view modes |

## 5. Events (11; 3 uncontrollable)

| SimEarth | BB |
|---|---|
| Hurricane (warm oceans; rain), Tidal wave (coasts), Meteor (dust on land / vapor at sea), Volcano (dust + CO₂; islands), Atomic test (radiation, dust, nuclear winter), Fire (O₂ > 25%), Earthquake (plate boundaries; changes drift), Plague (low-tech cities; Medicine) | ≈ → **extended** |
| War (fuel competition; Philosophy), Pollution (fossil use), Exodus (win condition, planet becomes a reserve) | ✓ war/exodus; pollution ✗ → **built** |
| Dust in the atmosphere (volcanoes, fires, nukes, meteors) blocks the sun | ✗ → **built** as a decaying aerosol forcing |

## 6. Atmosphere and climate

| SimEarth | BB |
|---|---|
| N₂, O₂ (life 15–25%), CO₂ (<0.1% plants die, >1% greenhouse), CH₄, water vapor, dust, atmospheric pressure (retains heat) | ≈: O₂/CO₂/CH₄/H₂O real; N₂ + pressure ✗ → **built** (pressure broadening forcing) |
| Air currents from "thermal disequilibrium and Coriolis"; ocean currents; sea temperature changes slowly; ice caps need cold oceans | ≈: prescribed 3-cell wind; no ocean currents; sea temperature = climate T |
| Sun's heat steadily increasing | ✓ |

## 7. Life and evolution

| SimEarth | BB |
|---|---|
| Life forms only in deep ocean; sea life needs shelves; land life needs CO₂, O₂, pressure, temperature, biome | ≈ |
| Advancement (species step) vs Mutation (class jump); competition: more advanced wins a tile | ≈ (clade fitness, speciation, mutation) |
| Any class but Prokaryote/Eukaryote can become intelligent; ranking of likelihood; needs land for fire and forges | ✓ (clades; land-gated) |
| Biomass, Diversity, Viability (O₂ + dust), Growth (CO₂) ratings; IQ race top-3 | ≈ → **report built** |
| Daisyworld: black/white daisies, growth ∝ 1 − 0.003265(22.5 − T)², regulation against a brightening sun, breakdown point | ✗ → **built** (Watson & Lovelock 1983) |

## 8. Civilization

| SimEarth | BB |
|---|---|
| 7 ages, cities with 3 densities + travelling population; Nanotech 4 densities | ≈ (tech arc, city lights) |
| Energy production = work hours × efficiency(tech, source), resource depletion of fossil/atomic fuel; allocation ratios drive war, science, food, plague, quality of life (Hellish → Heavenly); Habitats rating | ✗ → **built** |
| Fossil fuel reserves accumulate in Evolution time and are consumed; too early a Monolith → collapse | ✓ (carbon kernel reserve) |

## 9. Windows

| SimEarth | BB |
|---|---|
| Map layers: Terrain, Events, Drift/magma, Hide oceans, Ocean temp, Ocean currents, Air temp, Rainfall, Air currents, Biomes, Life, Civilization | ≈ (elevation, temperature, moisture, rivers, winds, biomes, plates, vegetation; rainfall ✗ → **built**, events ✗ → **built**) |
| Gaia window: the planet's face, moods from bliss to horror, eyes follow the pointer, the Sun grows | ✗ → **built** |
| History window: 15 series (CO₂ O₂ CH₄, sea/air T, rainfall, population, biomass, diversity, fossil fuel, atomic fuel, food, war, plague, pollution), 4 at a time | ≈ (4 series) → **extended** |
| Report window per time scale: viability/biomass/highest life/current task; IQ race; civilization report with work × efficiency = energy and allocation | ✗ → **built** |
| Graphs: biome ratio, atmospheric composition, life-class ratio, technology ratio | ≈ (stats panel, clade list) |
| Glossary, tutorials, help mode | ≈ (help overlay, console) |

## 10. Scenarios

| SimEarth | BB |
|---|---|
| Random planet; Aquarium (no continents); Stag Nation (Stone Age island); Earth Cambrian (scripted drift); Earth Modern; Mars (terraform in 500 yr, panels disabled, no spontaneous life); Venus (477 °C); Daisyworld | Archean, Modern, BAU 2100, Snowball, Carboniferous, Venus-like, Pleistocene → **added Daisyworld, Mars, Aquarium** |

## What made it work (retrospective)
"Only when the spheres were linked together did the simulations reach long-lived,
stable conditions." Everything is coupled, you need not intervene at all, every run
is a different contingent story (mollusks stuck pre-industrial for lack of fossil
fuel; carniferns nuking themselves), and any multicellular class can reach
civilization. The frustrations were the 220-page manual and the window-heavy UI.

Biosphere Blue's answer: the coupling is now real physics rather than tuned
tables, which makes the contingency stronger, not weaker. The energy budget and
time scales are what turn the simulation back into a game.
