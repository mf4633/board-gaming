# BONNEVILLE SPILLWAY OPERATOR — itch.io Page Copy

## Title
Bonneville Spillway Operator

## Tagline
Run the Columbia River dam. Balance grid load, salmon runs, TDG limits, and barge lockages — every shift is a different crisis.

## Short description
Operate a model of the Bonneville Dam: adjust turbines and spillway gates in real time to hit grid targets, protect salmon, stay under TDG limits, and keep navigation running. 10-shift campaign with Bronze/Silver/Gold ratings.

---

## Full description (Markdown)

**BONNEVILLE SPILLWAY OPERATOR** puts you behind the control panel of a stylized Columbia River hydroelectric dam.

You are not building anything. You are operating an existing system with competing demands — and every decision trades off against the others.

### The tensions

**Grid demand** changes minute to minute. Industrial load spikes, EV charger banks come online, wind generation drops. You control how much water flows through the turbines. Too little and frequency drops. Too much and you're wasting storage.

**Salmon migration** requires minimum flow through fish ladders during the run season. Open the spillway for fish passage and TDG climbs. Every fish that doesn't make the quota is a fine.

**Total Dissolved Gas (TDG)** rises when water plunges over the spillway. Above 110% it stresses fish; above 120% it kills them. The regulatory limit is hard. Deflector upgrades help, but they cost capital.

**Navigation lockages** — grain barges and container vessels need the lock cycled while you're managing everything else. Each lockage takes 4–6 minutes and disrupts your flow schedule.

**Inflow uncertainty** — the Columbia's snowmelt doesn't follow a clean forecast. Surprises happen. Your reservoir is your buffer, but it has limits.

### Campaign structure
10 shifts. Each shift is a new scenario:

1. Commissioning — learn the controls, light load
2. First Snowmelt — inflow rising fast, establish rhythm
3. Spring Smolt Run — salmon quota active, TDG tight
4. Summer Peak Demand — grid under pressure, reservoir low
5. Gorge Wind Integration — intermittent wind disrupts your dispatch plan
6–10. Increasing complexity, stacked crises

Your aggregate score earns **Career Bronze, Silver, or Gold**.

### Upgrades (spend capital between shifts)
- **Francis Turbine Unit** — +60 kcfs turbine capacity
- **Kaplan Retrofit** — higher efficiency (η 0.90)
- **Tainter Spillway Gate** — +40 kcfs spill capacity
- **Flip-lip Deflectors** — reduces TDG formation (critical for salmon season)
- **Fish Ladder** — unlocks salmon passage + per-fish income
- **Juvenile Bypass System** — routes smolts around spillway; 5× less TDG harm
- **Navigation Lock** — unlocks barge commerce and lockage events
- **Automatic Generation Control** — auto-trims frequency drift

### Based on real engineering
Reservoir geometry, turbine count, and spillway capacity follow public USACE data for the actual Bonneville Dam (Cascade Locks, OR). The TDG model, fish passage flow requirements, and grid frequency mechanics reflect real constraints dam operators face during spring runoff.

---

## Tags
simulation, engineering, dam, hydroelectric, strategy, river, management, historical, singleplayer, browser

## Category
Simulation

## Platforms
Web (HTML5), Windows (download)

## Price
$2.00  *(or $1 at launch with early access framing)*

## Links
- Play free preview: https://boardgaminghub.com/BonnevilleSpillwayOperator.html

---

## Screenshots needed
1. Main control view with gauges and spillway canvas
2. Spring Smolt Run shift — TDG alarm active
3. Navigation lockage in progress
4. End-of-shift summary screen
5. Upgrade shop between shifts

## Upload checklist
- [ ] Create game page at itch.io (kind: HTML, genre: Simulation)
- [ ] Set slug: `bonneville-spillway-operator`
- [ ] Upload BonnevilleSpillwayOperator.html as game file ("play in browser")
- [ ] Upload cover image (bonneville-cover.png, 630×500)
- [ ] Upload screenshots
- [ ] Set price: $2.00
- [ ] Add tags
- [ ] Run: butler push BonnevilleSpillwayOperator.html hydroengineer/bonneville-spillway-operator:html-web
