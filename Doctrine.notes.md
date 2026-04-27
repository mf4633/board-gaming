# Doctrine — Dev Notes

Pickup-doc for the geopolitical sim. Last updated 2026-04-27 (v0.2, commit 744ac59).

## Vision

Aerobiz Supersonic mechanics, reskinned to statecraft. Quarterly turns became annual for v0.1 (61 turns, 1990–2050). Four asymmetric playable powers compete for finite alignment slots in 12 contested middle powers. Events shift the board every year. Same satisfying loop of "expand into Lagos this turn or shore up Saudi before the rival undercuts me," with defense pacts and trade deals instead of 747s.

## File

`Doctrine.html` — single file, ~1190 lines. d3-geo + topojson loaded from `cdn.jsdelivr.net` (world-atlas@2/countries-110m.json, ~95KB). No build step; opens in any browser.

## What's built (v0.2)

### Powers (1990 starting state, in `POWER_INIT`)
| Power | GDP $B | Debt/GDP | Rate | Growth | Mil | Tempo | Notes |
|---|---|---|---|---|---|---|---|
| USA | 5963 | 54% | 8.0 | 2.5 | 100 | 3 | Reserve currency, 11 carriers, NATO+JP+KR |
| CHN |  361 | 16% | 9.0 | 9.0 |  35 | 3 | No allies, manufacturing rising |
| RUS |  506 | 45% | 14.0 | -3.0 |  70 | 3 | Post-collapse, nukes, oil/gas |
| EU  | 6800 | 55% | 7.5 | 2.0 |  65 | 2 | Fragmented = lower tempo |

### Middle powers (12, in `COUNTRIES`)
SAU, IRN, TUR, EGY, IND, PAK, IDN, VNM, BRA, MEX, NGA, ZAF — each has initial alignment toward each bloc, GDP, growth, traits (oil, chokepoint:hormuz, nuclear, rising, sanctioned, etc).

### Instruments (6, in `ACTIONS`)
| Action | Tempo | $ one-shot | $/yr upkeep | Swing | Notes |
|---|---|---|---|---|---|
| Loan       | 1 | 5 | 0 | +18 | Big short-term goodwill |
| Trade Deal | 1 | 0 | 0 | +10 | +0.5/yr drift while in force |
| Forward Base | 2 | 8 | 4 | +14 | +0.4/yr drift |
| Carrier Group | 2 | 0 | 6 | +12 | Requires available carrier |
| Intel Op   | 1 | 2 | 0 | +8 | 60% success / 15% blowback / 25% nothing |
| Defense Pact | 2 | 0 | 2 | +25 | Requires alignment ≥55, locks |

### Events
- **Scripted (`SCRIPTED_EVENTS`):** Gulf War '91, USSR collapse '92, Asian crisis '97, 9/11 '01, GFC '08, Arab Spring '11, Crimea '14, pandemic '20
- **Random (`RANDOM_EVENTS`, weighted, 2-yr cooldown):** Hormuz closure, Taiwan crisis, tech breakthrough, climate disaster, coup, oil spike

### Win/lose (`checkEnd()`)
- **Win:** end-2050 highest influence score, OR ≥80% weighted alignment for 5 consecutive years
- **Lose:** debt/GDP > 250% AND rate > 12%, OR approval < 20% for 3 consecutive years

### Score (`computeScore`)
`Σ(country.alignment[me] × country.gdp) + own.gdp×0.5 + own.military×5`

## Code map

Inline `<script>` sections, top to bottom:
1. Constants — POWERS, POWER_COLOR, POWER_INIT, COUNTRIES, ISO_TO_CODE, CHOKE_LATLON, ACTIONS
2. Map data globals — WORLD_DATA, PROJECTION, PATH_GEN
3. State — global `S`, populated by `newGame(playerPower)`
4. Helpers — clamp, fmt$, log, aliShift, neutral, dominantPower
5. Scoring — computeScore, weightedAlignmentShare
6. Actions — canAct, doAction (player + AI both go through this)
7. Economy — annualEconomy() (GDP growth, deficit, approval)
8. Events — SCRIPTED_EVENTS, RANDOM_EVENTS, tickEvents()
9. AI — aiTurn(power) — one-line heuristic right now
10. Turn loop — endYear, checkEnd, endGame
11. Map render — featureForCode, renderMap, loadWorld (async on init)
12. Panels — renderTopbar/Domestic/Budget/Forces/Rivals/Selected/Log/Events
13. Init — modal pick handler, end-turn button, window-bound handlers

## Known cuts (the punch list when picking up)

### Balance
- **AI is too passive** — `aiTurn()` is a single greedy heuristic. Needs regional affinity (US→MENA+Asia, RUS→post-Soviet+Vietnam, CHN→SE Asia+Africa) and willingness to contest pacted countries via intel ops
- **Economy numbers untuned** — extreme budget settings produce unrealistic outcomes; haven't done a full balance pass
- **Rate dial under-punished** — low rate should hit approval via inflation, high rate should crash growth harder
- **Score weighting** — middle-power GDP dominates; own military barely matters

### Missing systems
- No tech tree — just one random breakthrough event. Should be a Cold War → post-Cold War → drone era → AI era progression with unlocks
- No nuclear escalation path — nukes flavor only
- No tariff war / trade deal teardown — trade deals are permanent once signed
- No EU fragmentation mechanic beyond lower tempo
- Chokepoint closures only do GDP shocks — they don't actually block carrier deployment to the affected region
- Allies (NATO, CSTO) are listed flavor — don't grant bonuses
- No deeper-than-Pact alignment (could add: Satellite, Annexation)

### UX
- No confirmation on permanent moves (Pact)
- No undo / save state / localStorage persistence
- "Play Again" reloads page (cheap restart)
- Mobile layout untested

## Roadmap ideas

**v0.3 — make it feel right**
1. Tune AI with regional priorities + contestation logic
2. Full economy tuning pass after a few playthroughs
3. Tech tree (4 eras, 8–12 unlock nodes)
4. Make chokepoints actually block carrier moves to the affected region

**v0.4 — depth**
- Tariff wars (declare → both lose GDP, rival's trade deals break)
- Internal political tracks per power (Hawk↔Dove for US, Reform↔Hardline for China) that shift over time and gate available actions
- Election years for democracies (penalty if approval too low at cycle end)
- Coup mechanic for autocracies (high tax + low growth → regime change risk)

**v1.0**
- Sound (CRT clicks, alert tones)
- localStorage save/load
- Difficulty tiers
- Replay/timeline view

## Inspirations
- **Aerobiz Supersonic** (1993, SNES) — turn structure, asymmetric kits, AI rivals competing for finite slots
- Crisis in the Kremlin / Ostalgie — political dilemmas
- Suzerain — choice framing
- Paradox grand strategy — for ideas, not depth

## Pickup checklist for next session

1. Open `Doctrine.html` in a browser, play one 60-year campaign as USA, then as China
2. Note what's bored/broken/imbalanced in a scratch list
3. Pick highest-impact item from the punch list above
4. Iterate. Single file, no build step — just edit and refresh.
