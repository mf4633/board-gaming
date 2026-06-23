# FLOODLINE — itch.io Page Copy

## Title
Floodline

## Tagline (160 chars max)
Build levees, redirect rivers, save the town. A flood-defense engineering sim with real US rainfall data and historical disasters.

## Short description (itch.io "description" field, ~250 chars)
Engineer your way through real flood disasters. Place levees and pump stations, dig channels, call evacuations — before the water wins. Driven by real NOAA rainfall data across 50 US cities and modeled on actual events.

---

## Full description (Markdown, itch.io body)

**FLOODLINE** is a flood-defense engineering simulator where you race rising water with a limited budget and toolkit.

### What you're doing
Water is coming. You have money, a set of tools, and a clock. Place infrastructure strategically to keep damage below the threshold — or lose the town.

### Tools
| Tool | What it does |
|------|-------------|
| **Levee** | Tall earth wall; stops water but can breach if overtopped |
| **Sandbag** | Fast, cheap bump — buys time |
| **Channel** | Diverts water 2× faster downstream |
| **Pump Station** | Actively removes water from a 5×5 zone |
| **Siphon** | Passive slow drain — no power required |
| **Retention Pond** | Excavates a basin to absorb surge |
| **Spillway** | Controlled overflow into a designated safe zone |
| **Evacuate** | Removes population; no damage counted for evacuated cells |
| **Emergency Cut** | Deliberately cut a levee to relieve upstream pressure |

### Scenarios
Based on real US flood events with NOAA rainfall depth data:

- **Training Ground** — flat valley, steady river, light storm. Learn the physics.
- **Cedar Rapids 2008** — the Cedar River crest that inundated 1,300 city blocks. A duration fight, not a flash flood.
- **Hurricane Harvey (Houston)** — 60 hours of rainfall, stalled system, record accumulation
- **Johnstown 1889** — dam failure, cascading wall of debris-laden water
- **Hurricane Katrina (New Orleans)** — storm surge + levee breach + pumping system failure
- **Mississippi 1927** — weeks of upstream saturation, then the great crest
- **Oroville 2017** — emergency spillway failure, rapid drawdown decision
- **Edenville Dam 2020** — modern structural failure, instant release
- **Hurricane Helene (Asheville)** — mountainous terrain, trapped valley, no escape route
- **+ 5 more including Sandbox, Daily Challenge, and Endless mode**

### Modifiers (for extra challenge)
- **Hardcore** — 60% budget
- **No Levees** — primary tool disabled
- **Hold the Line** — evacuations not allowed
- **Speedrun** — storm compressed to 66% duration
- **No Pumps** — active removal disabled

### Real physics
Water follows elevation gradients, accumulates in low spots, and overtops barriers. Levee stress builds under sustained load and can breach spontaneously. Channels redirect but don't remove. Every tool has tradeoffs.

---

## Tags
flood, simulation, engineering, strategy, water, disaster, physics, historical, singleplayer, browser

## Category
Simulation

## Platforms
Web (HTML5), Windows (download)

## Price
$2.00

## Links
- Play free preview (2 scenarios): https://boardgaminghub.com/Floodline.html

---

## Screenshots needed
1. Scenario select screen
2. Mid-game: flooded grid with levees holding back water
3. Pump station in action
4. End screen (win/loss)
5. Cedar Rapids map at peak flood

## Upload checklist
- [ ] Create game page at itch.io (kind: HTML, genre: Simulation)
- [ ] Set slug: `floodline`
- [ ] Upload Floodline.html as the game file (mark "This file will be played in the browser")
- [ ] Upload cover image (floodline-cover.png, 630×500)
- [ ] Upload screenshots
- [ ] Set price: $2.00
- [ ] Add tags
- [ ] Set "Demo" label for boardgaminghub version link
- [ ] Run: butler push Floodline.html hydroengineer/floodline:html-web
