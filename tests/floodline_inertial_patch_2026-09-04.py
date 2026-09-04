# Floodline: replace the head-difference diffusion CA with a local-inertial
# shallow-water solver (Bates et al. 2010 / de Almeida et al. 2012).
# usage: python patch_physics.py <in.html> <out.html>
import re, sys

src_path, out_path = sys.argv[1], sys.argv[2]
raw = open(src_path, 'rb').read().decode('utf-8')
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

def rep(old, new, count=1, label=None):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f'[{label or old[:60]!r}] expected {count} match(es), found {n}')
    s = s.replace(old, new)

def rep_re(pattern, new, label, count=1, flags=re.S):
    global s
    n = len(re.findall(pattern, s, flags))
    if n != count:
        raise SystemExit(f'[{label}] expected {count} regex match(es), found {n}')
    s = re.sub(pattern, new, s, flags=flags)

# ---------------------------------------------------------------- A. constants
rep("// ---------- SCS Type II hyetograph", r"""// ---------- Physical scales ----------
// The hydraulics run in SI units on a DX-metre grid. Game time is compressed:
// one game-second is TIME_SCALE real seconds, so a 180 s scenario is a 7.5 h
// storm and a flood wave crosses the 7 km valley in a visible half-minute.
const DX = 40;                 // m per cell
const TIME_SCALE = 150;        // real seconds per game-second
const GRAV = 9.81;
const Q_UNIT = 1000;           // m³/s per scenario "inflow unit"
const RIVER_BASE_DEPTH = 1.2;  // m, baseflow depth in channels at t=0
const BANK_HEIGHT = 2.0;       // m, floodplain height above the local channel bed
const PUMP_Q = 45;             // m³/s per pump station (a large municipal station)
const SIPHON_Q = 8;            // m³/s per siphon
const CFL = 0.7;               // Courant limit for the inertial scheme
const HMIN = 0.005;            // m, wet/dry threshold at a face
const THETA = 0.85;            // q-centred weighting (1 = pure Bates 2010)
// Manning's n by tile type — this is what makes a dredged channel drain faster
// than a floodplain and a concrete spillway faster still.
const MANNING = new Float32Array(17);
MANNING[0] = 0.050;  // GRASS: floodplain pasture / brush
MANNING[1] = 0.035;  // RIVER: natural channel
MANNING[2] = 0.100;  // TOWN: buildings and fences obstruct flow
MANNING[3] = 0.040;  // SANDBAG
MANNING[4] = 0.040;  // LEVEE (when overtopped)
MANNING[5] = 0.025;  // CHANNEL: dredged, maintained
MANNING[6] = 0.050;  // PUMP pad
MANNING[7] = 0.035;  // OUTLET
MANNING[8] = 0.100;  // HOSPITAL
MANNING[9] = 0.100;  // SCHOOL
MANNING[10] = 0.035; // POND
MANNING[11] = 0.015; // SPILLWAY: concrete
MANNING[12] = 0.020; // ROAD: pavement
MANNING[13] = 0.100; // EVACUATED town
MANNING[14] = 0.040; // BREACH
MANNING[15] = 0.050; // SIPHON
MANNING[16] = 0.050; // BROKEN_PUMP

// ---------- SCS Type II hyetograph""", label='constants')

# ---------------------------------------------------------------- B. state
rep("  flowY: null,         // Resultant flux y-component per cell\n",
    "  flowY: null,         // Resultant flux y-component per cell\n"
    "  qx: null,            // Unit discharge (m²/s) across each cell's EAST face, +east\n"
    "  qy: null,            // Unit discharge (m²/s) across each cell's SOUTH face, +south\n"
    "  limF: null,          // Per-cell donor limiter scratch (0..1)\n"
    "  riverMask: null,     // Uint8Array, 1 where the terrain generator carved a channel/lake\n"
    "  inflowCells: [],     // River cells in the top two rows — upstream boundary\n"
    "  outletCells: [],     // Outlet row cells — downstream boundary\n"
    "  siphonCells: [],\n"
    "  bankFull: BANK_HEIGHT,\n"
    "  hmax: 0, vmax: 0, subSteps: 1,\n", label='state fields')

# ---------------------------------------------------------------- C. indices
rep("""  const pumps = [], buildings = [], rivers = [];
  const ty = state.type;
  if (!ty) {
    state.pumpCells = pumps;
    state.buildingCells = buildings;
    state.riverCells = rivers;
    state._indicesDirty = false;
    return;
  }
  for (let i = 0; i < ty.length; i++) {
    const t = ty[i];
    if (t === T.PUMP) pumps.push(i);
    else if (t === T.TOWN || t === T.HOSPITAL || t === T.SCHOOL) buildings.push(i);
    else if (t === T.RIVER) rivers.push(i);
  }
  state.pumpCells = pumps;
  state.buildingCells = buildings;
  state.riverCells = rivers;
  state._indicesDirty = false;""",
"""  const pumps = [], buildings = [], rivers = [], inflow = [], outlets = [], siphons = [];
  const ty = state.type;
  if (!ty) {
    state.pumpCells = pumps;
    state.buildingCells = buildings;
    state.riverCells = rivers;
    state.inflowCells = inflow;
    state.outletCells = outlets;
    state.siphonCells = siphons;
    state._indicesDirty = false;
    return;
  }
  for (let i = 0; i < ty.length; i++) {
    const t = ty[i];
    if (t === T.PUMP) pumps.push(i);
    else if (t === T.SIPHON) siphons.push(i);
    else if (t === T.TOWN || t === T.HOSPITAL || t === T.SCHOOL) buildings.push(i);
    else if (t === T.RIVER) { rivers.push(i); if (i < 2 * COLS) inflow.push(i); }
    else if (t === T.OUTLET) outlets.push(i);
  }
  state.pumpCells = pumps;
  state.buildingCells = buildings;
  state.riverCells = rivers;
  state.inflowCells = inflow;
  state.outletCells = outlets;
  state.siphonCells = siphons;
  state._indicesDirty = false;""", label='indices')

# ---------------------------------------------------------------- D. terrain
for fn in ['generateValley', 'generateFlatBasin', 'generateNarrowValley', 'generateWideRiver',
           'generateDamReservoir', 'generateCascadeValley', 'generateSubSeaLevel', 'generateMountainGorge']:
    rep(f'function {fn}(elev) {{', f'function {fn}(elev, mask) {{', label=fn)
rep("      elev[i] = 5 + slope + valleyWall + river + trib + trib2 + noise1 + noise2 + noise3;\n",
    "      // Hills are noisy; the channel bed is not — damp the noise inside the\n"
    "      // river's Gaussian so the thalweg is smooth instead of a string of potholes.\n"
    "      const chan = Math.exp(-Math.pow((x - (COLS * 0.3 + Math.sin(y * 0.18) * 12)) / 5, 2));\n"
    "      elev[i] = 5 + slope + valleyWall + river + trib + trib2 + (noise1 + noise2 + noise3) * (1 - 0.9 * chan);\n"
    "      if (mask) mask[i] = river < -1.6 ? 1 : 0;\n", label='valley mask')
rep("      elev[i] = 4 + slope + b1 + b2 + noise;\n",
    "      elev[i] = 4 + slope + b1 + b2 + noise;\n"
    "      if (mask) mask[i] = (b1 < -0.75 || b2 < -0.6) ? 1 : 0;\n", label='basin mask')
# Houston is FLAT: 0.03 m/row was a 0.075% grade that drained the coastal
# plain like a valley. 0.01 m/row (0.025%) is closer to the real thing and
# lets bayou overflow pond instead of racing off the map.
rep("      const slope = (ROWS - y) * 0.03 + x * 0.02;\n", "      const slope = (ROWS - y) * 0.01 + x * 0.004;\n", label='basin slope')
rep("      elev[i] = 5 + slope + valleyWall + river + noise;\n",
    "      elev[i] = 5 + slope + valleyWall + river + noise;\n"
    "      if (mask) mask[i] = river < -1.25 ? 1 : 0;\n", label='narrow mask')
rep("      elev[i] = 4 + slope + river + noise;\n",
    "      elev[i] = 4 + slope + river + noise;\n"
    "      if (mask) mask[i] = river < -1.4 ? 1 : 0;\n", label='wide mask')
rep("      const spillway = (y >= ROWS * 0.30 && y <= ROWS * 0.35 && x > COLS * 0.15 && x < COLS * 0.20) ? -8 : 0;\n"
    "      const noise = Math.sin(x * 0.15) * 0.2 + Math.cos(y * 0.2) * 0.2;\n"
    "      elev[i] = base + spillway + noise;\n",
    "      // Spillway notch: 4 m into the crest, level with the toe so it passes\n"
    "      // water downhill (it used to sit 4 m BELOW the toe), and only ~240 m\n"
    "      // wide — a damaged chute that cannot pass the design flood on its own.\n"
    "      const spillway = (y >= ROWS * 0.30 && y <= ROWS * 0.35 && x > COLS * 0.16 && x < COLS * 0.185) ? -4 : 0;\n"
    "      const noise = Math.sin(x * 0.15) * 0.2 + Math.cos(y * 0.2) * 0.2;\n"
    "      elev[i] = base + spillway + noise;\n"
    "      if (mask) mask[i] = y < ROWS * 0.3 ? 1 : 0;\n", label='dam mask')
rep("        base = 8 - (y - ROWS * 0.35) * 0.25; // valley sloping down\n",
    "        base = 8 - (y - ROWS * 0.35) * 0.09; // valley sloping down (stays above datum)\n", label='dam valley slope')
rep("      else base = 6 - (y - ROWS * 0.50) * 0.18;     // downstream valley\n",
    "      else base = 6 - (y - ROWS * 0.50) * 0.07;     // downstream valley (stays above datum)\n", label='cascade slope')
rep("      elev[i] = base + wall + noise;\n",
    "      elev[i] = base + wall + noise;\n"
    "      if (mask) mask[i] = (y < ROWS * 0.15 || (y >= ROWS * 0.40 && y < ROWS * 0.45)) ? 1 : 0;\n", label='cascade mask')
rep("      elev[i] = base + noise;\n",
    "      elev[i] = base + noise;\n"
    "      if (mask) mask[i] = y < ROWS * 0.25 ? 1 : 0;\n", label='subsea mask')
rep("      elev[i] = 6 + slope + ridge + river1 + river2 + noise;\n",
    "      elev[i] = 6 + slope + ridge + river1 + river2 + noise;\n"
    "      if (mask) mask[i] = (river1 < -1.5 || river2 < -1.1) ? 1 : 0;\n", label='gorge mask')

# ---------------------------------------------------------------- E. startScenario
rep("  state.flowY = new Float32Array(COLS * ROWS);\n",
    "  state.flowY = new Float32Array(COLS * ROWS);\n"
    "  state.qx = new Float32Array(COLS * ROWS);\n"
    "  state.qy = new Float32Array(COLS * ROWS);\n"
    "  state.limF = new Float32Array(COLS * ROWS);\n"
    "  state.riverMask = new Uint8Array(COLS * ROWS);\n", label='alloc')
rep("  state.tailwaterStage = 3.2;\n", "  state.tailwaterStage = 0;\n  state.hmax = 0; state.vmax = 0; state.subSteps = 1;\n  state.bankFull = BANK_HEIGHT;\n", label='tw init')
rep("  sc.terrain(state.elev);\n", "  sc.terrain(state.elev, state.riverMask);\n", label='terrain call')

rep("""  if (sc.townBox) {
    const tb = sc.townBox;
    const floodplainElev = 4.3;
    const tcx = Math.floor(tb.x * COLS + tb.w / 2);
    const tcy = Math.floor(tb.y * ROWS + tb.h / 2);
    const radius = Math.max(tb.w, tb.h) + 4;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const dx = x - tcx, dy = y - tcy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < radius) {
          const blend = Math.max(0, 1 - d / radius);
          const i = idx(x, y);
          // Pull elevation toward floodplain level, preserving river depths
          if (state.elev[i] > floodplainElev - 0.5) {
            state.elev[i] = state.elev[i] * (1 - blend * 0.8) + floodplainElev * (blend * 0.8);
          }
        }
      }
    }
  }""",
"""  if (sc.townBox) {
    // Floodplain terrace: a flat bench BANK_HEIGHT above the channel bed of
    // the SAME ROW, running from the river bank to the far side of the town.
    // The town floods when the river stage exceeds bank-full (a relative
    // threshold), overbank flow spreads across the terrace into the streets,
    // and rain that lands on the terrace drains back to the river instead of
    // pooling in a carved pit. Rows without a channel (reservoir and bowl
    // maps) are left alone.
    // The terrace runs the FULL length of the valley (not just the town's row
    // band), so it is a continuous floodplain that drains down-valley rather
    // than a trench with walls at both ends.
    const tb = sc.townBox;
    const tcx = Math.floor(tb.x * COLS + tb.w / 2);
    const tx0 = Math.floor(tb.x * COLS), tx1 = tx0 + tb.w;
    const FRINGE = 4, FAR_HALF = 10, RISE = 0.01;
    // Per-row channel bed (mean of river cells), box-smoothed over ±6 rows and
    // forced never to rise down-valley, so the terrace is a smooth floodplain
    // rather than a copy of the channel's pool-and-riffle noise.
    const bedRow = new Float32Array(ROWS).fill(NaN), xrRow = new Int16Array(ROWS).fill(-1);
    for (let y = 0; y < ROWS; y++) {
      let sum = 0, n = 0, best = Infinity;
      for (let x = 0; x < COLS; x++) {
        const i = idx(x, y);
        if (!state.riverMask[i]) continue;
        sum += state.elev[i]; n++;
        const d = Math.abs(x - tcx);
        if (d < best) { best = d; xrRow[y] = x; }
      }
      if (n) bedRow[y] = sum / n;
    }
    const bedS = new Float32Array(ROWS).fill(NaN);
    for (let y = 0; y < ROWS; y++) {
      if (isNaN(bedRow[y])) continue;
      let sum = 0, n = 0;
      for (let k = -6; k <= 6; k++) { const v = bedRow[y + k]; if (v !== undefined && !isNaN(v)) { sum += v; n++; } }
      bedS[y] = sum / n;
    }
    for (let y = 1; y < ROWS; y++) if (!isNaN(bedS[y]) && !isNaN(bedS[y - 1]) && bedS[y] > bedS[y - 1]) bedS[y] = bedS[y - 1];
    for (let y = 0; y < ROWS; y++) {
      const bed = bedS[y], xr = xrRow[y];
      if (isNaN(bed) || xr < 0) continue;
      const townSide = tcx >= xr ? 1 : -1;
      const near = xr + townSide * Math.max(FAR_HALF, Math.abs((townSide > 0 ? tx1 : tx0) - xr) + FRINGE);
      const x0 = Math.max(0, Math.min(xr - FAR_HALF, near) - FRINGE);
      const x1 = Math.min(COLS, Math.max(xr + FAR_HALF, near) + FRINGE);
      const inner0 = Math.min(xr - FAR_HALF, near), inner1 = Math.max(xr + FAR_HALF, near);
      for (let x = x0; x < x1; x++) {
        const i = idx(x, y);
        if (state.riverMask[i]) continue;
        // Terrace rises RISE m per cell away from the channel so it drains back.
        const terrace = bed + BANK_HEIGHT + RISE * Math.abs(x - xr);
        if (state.elev[i] <= terrace) continue;
        const blend = x < inner0 ? 1 - (inner0 - x) / (FRINGE + 1) : x >= inner1 ? 1 - (x - inner1 + 1) / (FRINGE + 1) : 1;
        state.elev[i] += (terrace - state.elev[i]) * Math.max(0, blend);
      }
    }
  }""", label='floodplain carve')

rep("""  // Rivers & outlets
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      // Katrina sub-sea-level bowl (y >= 35%) stays DRY floodplain. It's not
      // a river, and it must not get pre-filled to baseStage — otherwise the
      // entire city starts submerged because its elevation is below 3.5m.
      const isKatrinaBowl = (sc.id === 'katrina2005' && y >= ROWS * 0.35);
      if (!isKatrinaBowl && state.elev[i] < 3.5 && state.type[i] === T.GRASS) state.type[i] = T.RIVER;
      if (y === ROWS - 1) state.type[i] = T.OUTLET;
    }
  }
  // River baseflow — fill all river cells to a stage of ~4.0 m so there's
  // always visible water in the channel before the storm starts.
  const baseStage = 4.0;
  for (let i = 0; i < state.water.length; i++) {
    if (state.type[i] === T.RIVER) {
      state.water[i] = Math.max(0.3, baseStage - state.elev[i]);
    }
  }
  // Katrina-specific: big lake up top
  if (sc.id === 'katrina2005') {
    for (let y = 0; y < ROWS * 0.25; y++) {
      for (let x = 0; x < COLS; x++) {
        state.water[idx(x, y)] = 1.5;
      }
    }
  }
""",
"""  // Rivers & outlets — the terrain generator marks its own channels/lakes, so
  // the river runs the full length of the valley and the upstream boundary
  // actually has river cells to receive the inflow hydrograph.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (state.riverMask[i] && state.type[i] === T.GRASS) state.type[i] = T.RIVER;
      if (y === ROWS - 1) state.type[i] = T.OUTLET;
    }
  }
  // Initial water: channels start at baseflow depth; lakes and reservoirs
  // start at the scenario's initStage (a number, or (x, y) => stage in m).
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (state.type[i] !== T.RIVER) continue;
      if (sc.initStage != null) {
        const stg = typeof sc.initStage === 'function' ? sc.initStage(x, y) : sc.initStage;
        state.water[i] = Math.max(0, stg - state.elev[i]);
      } else {
        state.water[i] = RIVER_BASE_DEPTH;
      }
    }
  }
""", label='river init')

rep("""      <div>Peak inflow:   <b>${forecast.peakInflow.toFixed(1)} units</b> @ ${formatTime(forecast.peakT)}</div>
      <div>Est. peak stage: <b style="color:${forecast.peakStage > 6 ? '#ef4444' : '#fbbf24'};">${forecast.peakStage.toFixed(1)} m</b></div>
      <div style="color:#94a3b8;font-size:10px;margin-top:2px;">Floodplain crest ≈ 4.3 m · Tailwater base 3.2 m</div>""",
"""      <div>Peak inflow:   <b>${fmtQ(forecast.peakInflow * Q_UNIT)}</b> @ ${formatTime(forecast.peakT)}</div>
      <div>${forecast.kind === 'surge' ? 'Est. peak surge depth' : forecast.kind === 'reservoir' ? 'Reservoir rise if nothing spills' : 'Est. peak channel depth'}: <b style="color:${forecast.peakStage > (forecast.kind === 'channel' ? state.bankFull : 1.0) ? '#ef4444' : '#fbbf24'};">${forecast.peakStage.toFixed(1)} m</b></div>
      <div style="color:#94a3b8;font-size:10px;margin-top:2px;">${forecast.kind === 'channel' ? `Bank-full ≈ ${state.bankFull.toFixed(1)} m · ` : ''}${DX} m cells · 1 game-sec = ${(TIME_SCALE / 60).toFixed(1)} min</div>""", label='forecast html')

# ---------------------------------------------------------------- F. step()
start = s.index("  // ---- Flux-based shallow water (8-neighbor gradient flux) ----")
end_anchor = "  [state.water, state.waterNext] = [state.waterNext, state.water];\n"
end = s.index(end_anchor) + len(end_anchor)
new_step = r"""  // ---- Physical time ----
  // Game seconds are compressed (TIME_SCALE real seconds each). Everything
  // below runs in SI units on the DX-metre grid.
  const dtReal = dt * TIME_SCALE;
  const W = state.water, EL = state.elev, SH = state.structH, TY = state.type;
  const QX = state.qx, QY = state.qy, LF = state.limF;
  const FL = state.flow, FX = state.flowX, FY = state.flowY;
  const C_ = COLS, R_ = ROWS, N_ = W.length;

  // ---- Rain + infiltration (once per game step) ----
  // Rain: mm/hr → m/s, times real seconds elapsed. Infiltration: Green-Ampt-
  // style capacity limited by antecedent saturation; SOIL_RATE is metres per
  // game-second (loam 0.0006 ≈ 14 mm/hr real, sand ≈ 29, clay ≈ 5).
  const rainDepth = (state.currentRain / 3.6e6) * dtReal;
  const SOIL_RATE = [0.0006, 0.0012, 0.0002];
  let hmax = 0;
  for (let i = 0; i < N_; i++) {
    const t = TY[i];
    if (t === T.OUTLET) continue;
    let w = W[i] + rainDepth;
    if (t === T.GRASS || t === T.EVACUATED) {
      const rate = SOIL_RATE[state.soilType[i]] * dt;
      const taken = Math.min(w, rate * (1 - state.soilSat[i]));
      w -= taken;
      state.soilSat[i] = Math.min(1, state.soilSat[i] + taken * 2);
      if (w < 0.005) state.soilSat[i] = Math.max(0, state.soilSat[i] - 0.01 * dt);
    }
    W[i] = w;
    if (w > hmax) hmax = w;
  }

  // ---- Upstream boundary ----
  // The visible map is a small part of the real drainage area. Rain on the
  // off-map basin (watershedRatio × the map) becomes rational-method runoff
  // Q = C·i·A, lagged through a linear reservoir with a one-hour time constant.
  const watershedRatio = sc.watershedRatio ?? 5;
  const basinArea = watershedRatio * C_ * R_ * DX * DX;                // m²
  const runoffQ = 0.45 * (state.currentRain / 3.6e6) * basinArea;      // m³/s
  state.watershedQ += (runoffQ - state.watershedQ) * (dtReal / 3600);  // first-order lag on discharge
  if (sc.lakeStage) {
    // Lake / tidal boundary (storm surge): hold the boundary rows of the water
    // body at a prescribed stage. The scenario's inflow units only feed the
    // hydrograph display on these maps.
    const stg = sc.lakeStage(state.time, stormMult);
    for (const i of state.riverCells) {
      const w = Math.max(0, stg - EL[i] - SH[i]);
      W[i] = w;
      if (w > hmax) hmax = w;
    }
  } else if (state.inflowCells.length) {
    const Qin = state.currentInflow * Q_UNIT + state.watershedQ;      // m³/s
    const dAdd = Qin * dtReal / (DX * DX * state.inflowCells.length);
    for (const i of state.inflowCells) {
      W[i] += dAdd;
      if (W[i] > hmax) hmax = W[i];
    }
  }

  // ---- Pumps + Siphons (rated in m³/s, drawn from the footprint by depth) ----
  const drain = (cx, cy, r, capM3) => {
    let vol = 0;
    for (let dy = -r; dy <= r; dy++) {
      const ny = cy + dy; if (ny < 0 || ny >= R_) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx; if (nx < 0 || nx >= C_) continue;
        vol += W[ny * C_ + nx];
      }
    }
    vol *= DX * DX;
    if (vol <= 0) return 0;
    const take = Math.min(capM3, vol);
    const f = 1 - take / vol;
    for (let dy = -r; dy <= r; dy++) {
      const ny = cy + dy; if (ny < 0 || ny >= R_) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx; if (nx < 0 || nx >= C_) continue;
        W[ny * C_ + nx] *= f;
      }
    }
    return take;
  };
  for (const i of state.pumpCells) {
    if (TY[i] !== T.PUMP) continue;
    state.stats.pumped += drain(i % C_, (i / C_) | 0, 2, PUMP_Q * pumpPowerMult() * dtReal);
  }
  for (const i of state.siphonCells) {
    // Siphon: passive, primes once there is > 0.1 m standing at its cell.
    if (TY[i] !== T.SIPHON || W[i] <= 0.1) continue;
    state.stats.pumped += drain(i % C_, (i / C_) | 0, 1, SIPHON_Q * dtReal);
  }

  // ---- Inertial shallow-water fluxes ----
  // Local-inertial form of the Saint-Venant momentum equation (Bates, Horritt
  // & Fewtrell 2010, J. Hydrol. 387) with the q-centred diffusion of
  // de Almeida et al. 2012 (Water Resour. Res. 48):
  //   q⁺ = [θq + ½(1−θ)(q₋ + q₊) − g·h_f·Δt·∂η/∂x] / [1 + g·Δt·n²·|q| / h_f^(7/3)]
  // q is unit discharge (m²/s) across a cell face, h_f the face flow depth
  // (max water surface − max bed), η = z + h the water surface, n Manning's
  // roughness. Friction is semi-implicit so the scheme is stable on steep dry
  // ground; Δt obeys the CFL limit Δt ≤ α·Δx/√(g·h_max) via sub-stepping.
  // This is the scheme inside LISFLOOD-FP and most modern 2D flood models.
  const MN = MANNING;
  const dtCFL = CFL * DX / Math.sqrt(GRAV * Math.max(hmax, 0.05));
  const nSub = Math.min(8, Math.max(1, Math.ceil(dtReal / dtCFL)));
  const dts = dtReal / nSub;
  const k = dts / DX;                 // converts m²/s of unit discharge to metres of depth
  state.subSteps = nSub;
  // Outlet modes: 'free' (default) — the whole bottom edge is a free outfall
  // (a valley that keeps going); 'river' — only the channel leaves the map,
  // overland flow must find it (flat coastal plain); 'closed' — a bowl.
  const closedOutlet = sc.outlet === 'closed';
  const riverOutlet = sc.outlet === 'river';
  let outQ = 0;
  for (let sub = 0; sub < nSub; sub++) {
    // East faces
    for (let y = 0; y < R_; y++) {
      const row = y * C_;
      for (let x = 0; x < C_ - 1; x++) {
        const i = row + x, j = i + 1;
        const hi = W[i], hj = W[j];
        if (hi < HMIN && hj < HMIN) { QX[i] = 0; continue; }
        const zi = EL[i] + SH[i], zj = EL[j] + SH[j];
        const ei = zi + hi, ej = zj + hj;
        const hf = (ei > ej ? ei : ej) - (zi > zj ? zi : zj);
        if (hf <= HMIN) { QX[i] = 0; continue; }
        const q = QX[i];
        const qc = THETA * q + 0.5 * (1 - THETA) * ((x > 0 ? QX[i - 1] : q) + (x < C_ - 2 ? QX[j] : q));
        const n = 0.5 * (MN[TY[i]] + MN[TY[j]]);
        const h73 = hf * hf * Math.cbrt(hf);
        let qn = (qc - GRAV * hf * dts * (ej - ei) / DX) / (1 + GRAV * dts * n * n * (q < 0 ? -q : q) / h73);
        // Froude cap: the local-inertial form is subcritical; hold faces at
        // critical flow (|q| ≤ h_f·√(g·h_f)) so a pool spilling over a cliff
        // cannot accelerate without bound.
        const qcrit = hf * Math.sqrt(GRAV * hf);
        if (qn > qcrit) qn = qcrit; else if (qn < -qcrit) qn = -qcrit;
        QX[i] = qn;
      }
      QX[row + C_ - 1] = 0;
    }
    // South faces
    for (let y = 0; y < R_ - 1; y++) {
      const row = y * C_;
      for (let x = 0; x < C_; x++) {
        const i = row + x, j = i + C_;
        const hi = W[i], hj = W[j];
        if (hi < HMIN && hj < HMIN) { QY[i] = 0; continue; }
        const zi = EL[i] + SH[i], zj = EL[j] + SH[j];
        const ei = zi + hi, ej = zj + hj;
        const hf = (ei > ej ? ei : ej) - (zi > zj ? zi : zj);
        if (hf <= HMIN) { QY[i] = 0; continue; }
        const q = QY[i];
        const qc = THETA * q + 0.5 * (1 - THETA) * ((y > 0 ? QY[i - C_] : q) + (y < R_ - 2 ? QY[j] : q));
        const n = 0.5 * (MN[TY[i]] + MN[TY[j]]);
        const h73 = hf * hf * Math.cbrt(hf);
        let qn = (qc - GRAV * hf * dts * (ej - ei) / DX) / (1 + GRAV * dts * n * n * (q < 0 ? -q : q) / h73);
        const qcrit = hf * Math.sqrt(GRAV * hf);
        if (qn > qcrit) qn = qcrit; else if (qn < -qcrit) qn = -qcrit;
        QY[i] = qn;
      }
    }
    // Donor limiter: no cell may export more than it holds in one sub-step.
    // Every face has exactly one donor (by sign), so scaling by the donor's
    // factor keeps the update exactly mass-conserving and depths ≥ 0.
    for (let y = 0; y < R_; y++) {
      const row = y * C_;
      for (let x = 0; x < C_; x++) {
        const i = row + x;
        let out = 0;
        const qe = QX[i]; if (qe > 0) out += qe;
        if (x > 0) { const qw = QX[i - 1]; if (qw < 0) out -= qw; }
        const qs = QY[i]; if (qs > 0) out += qs;
        if (y > 0) { const qn = QY[i - C_]; if (qn < 0) out -= qn; }
        const vol = out * k;
        LF[i] = vol > W[i] ? (vol > 0 ? W[i] / vol : 0) : 1;
      }
    }
    // Continuity: Δh = Δt/Δx · (Σ q_in − Σ q_out). Each cell scales and writes
    // back its own east and south faces (row-major order means the west and
    // north faces were already scaled by their owners).
    for (let y = 0; y < R_; y++) {
      const row = y * C_;
      for (let x = 0; x < C_; x++) {
        const i = row + x;
        let qe = QX[i];
        if (qe > 0) qe *= LF[i]; else if (qe < 0) qe *= LF[i + 1];
        QX[i] = qe;
        let qs = QY[i];
        if (qs > 0) qs *= LF[i]; else if (qs < 0) qs *= LF[i + C_];
        QY[i] = qs;
        let dq = -qe - qs;
        if (x > 0) dq += QX[i - 1];
        if (y > 0) dq += QY[i - C_];
        const w = W[i] + dq * k;
        W[i] = w > 0 ? w : 0;
      }
    }
    // Downstream boundary: the outlet row discharges at Manning normal depth
    // on the local bed slope (free outfall). Closed on bowl maps (Katrina),
    // where the only way out is over the levee or through a pump.
    if (!closedOutlet) {
      for (const i of state.outletCells) {
        const h = W[i];
        if (h <= HMIN) continue;
        const up = i - C_;
        if (riverOutlet && !state.riverMask[up]) continue;
        let S0 = ((EL[up] + SH[up]) - (EL[i] + SH[i])) / DX;
        if (S0 < 0.0005) S0 = 0.0005;
        let qo = h * Math.cbrt(h * h) / MN[TY[i]] * Math.sqrt(S0);
        const maxq = 0.5 * h / k;
        if (qo > maxq) qo = maxq;
        W[i] = h - qo * k;
        outQ += qo * DX;
      }
    }
  }
  state.outflowQ = state.outflowQ * 0.8 + (outQ / nSub) * 0.2;   // m³/s, smoothed
  // Tailwater readout: mean water-surface elevation along the outlet row.
  if (state.outletCells.length) {
    let tw = 0;
    for (const i of state.outletCells) tw += EL[i] + SH[i] + W[i];
    state.tailwaterStage = tw / state.outletCells.length;
  }

  // ---- Velocity diagnostics (m/s): flow arrows, sandbag erosion, tooltip ----
  let vmax = 0;
  for (let y = 0; y < R_; y++) {
    const row = y * C_;
    for (let x = 0; x < C_; x++) {
      const i = row + x;
      const h = W[i];
      if (h < 0.02) { FX[i] = 0; FY[i] = 0; FL[i] = 0; continue; }
      const vx = 0.5 * ((x > 0 ? QX[i - 1] : 0) + QX[i]) / h;
      const vy = 0.5 * ((y > 0 ? QY[i - C_] : 0) + QY[i]) / h;
      FX[i] = vx; FY[i] = vy;
      const v = Math.sqrt(vx * vx + vy * vy);
      FL[i] = v;
      if (v > vmax) vmax = v;
    }
  }
  state.vmax = vmax;
  state.hmax = hmax;
"""
s = s[:start] + new_step + s[end:]

# Storm profiles can dip negative on the recession limb (sine tails); rain is never negative.
rep("  state.currentRain = state.storming ? profile.rain * stormMult : 0;\n",
    "  state.currentRain = state.storming ? Math.max(0, profile.rain * stormMult) : 0;\n", label='rain clamp')

# Sandbags erode under real velocity now (m/s), not a unit-less flux.
rep("          if (state.flow[i] > 0.15) {\n", "          if (state.flow[i] > 1.0) {\n", label='sandbag erosion')

# ---------------------------------------------------------------- G. forecast
rep_re(r"function computePeakForecast\(sc\) \{.*?\n\}\n",
r"""function computePeakForecast(sc) {
  let peakRain = 0, peakInflow = 0, peakT = 0;
  const dur = sc._effectiveDuration ?? sc.duration;
  const mult = stormIntensityFor(state.campaign);
  let peakSurge = 0;
  for (let t = 0; t < dur; t += 1) {
    const p = sc.stormProfile(t);
    const inflow = p.inflow * mult;
    if (inflow > peakInflow) { peakInflow = inflow; peakT = t; }
    peakRain = Math.max(peakRain, p.rain * mult);
    if (sc.lakeStage) peakSurge = Math.max(peakSurge, sc.lakeStage(t, mult));
  }
  // Manning normal depth in the inlet channel at peak discharge (river inflow
  // plus rational-method runoff from the off-map basin at peak rain):
  //   h = (q·n / √S)^(3/5),  q = Q / channel width
  let peakStage = 0, kind = 'channel';
  if (state.riverMask) {
    let w0 = 0, z0 = 0, w1 = 0, z1 = 0;
    for (let x = 0; x < COLS; x++) {
      if (state.riverMask[x]) { w0++; z0 += state.elev[x]; }
      const j = idx(x, ROWS - 2);
      if (state.riverMask[j]) { w1++; z1 += state.elev[j]; }
    }
    if (sc.lakeStage) {
      kind = 'surge';
      peakStage = w0 ? Math.max(0, peakSurge - z0 / w0) : 0;
    } else if (sc.initStage != null) {
      // Reservoir: total storm inflow volume over the pool area = rise if
      // nothing spills (the spillway is the player's problem).
      kind = 'reservoir';
      const basinArea = (sc.watershedRatio ?? 5) * COLS * ROWS * DX * DX;
      let volume = 0;
      for (let t = 0; t < dur; t += 1) {
        const p = sc.stormProfile(t);
        volume += (p.inflow * mult * Q_UNIT + 0.45 * (Math.max(0, p.rain * mult) / 3.6e6) * basinArea) * TIME_SCALE;
      }
      let pool = 0;
      for (let i = 0; i < state.riverMask.length; i++) if (state.riverMask[i]) pool++;
      peakStage = pool ? volume / (pool * DX * DX) : 0;
    } else if (w0 > 0) {
      const basinArea = (sc.watershedRatio ?? 5) * COLS * ROWS * DX * DX;
      const Q = peakInflow * Q_UNIT + 0.45 * (peakRain / 3.6e6) * basinArea;
      const S = Math.max(0.0005, w1 ? ((z0 / w0) - (z1 / w1)) / ((ROWS - 2) * DX) : 0.001);
      peakStage = Math.pow((Q / (w0 * DX)) * 0.035 / Math.sqrt(S), 0.6);
    }
  }
  return { peakRain, peakInflow, peakT, peakStage, kind };
}
""", label='forecast fn')

# fmtQ helper next to fmt$
rep("function fmt$(n) {", "function fmtQ(q) {\n  return q >= 10000 ? `${(q / 1000).toFixed(1)}k m³/s` : `${Math.round(q).toLocaleString()} m³/s`;\n}\nfunction fmt$(n) {", label='fmtQ')

# ---------------------------------------------------------------- H. save/resume
rep("const SAVE_VERSION = 2;", "const SAVE_VERSION = 3;", label='save version')
rep("  state.waterNext = new Float32Array(state.water.length);\n  state.contourSegs = null;",
    "  state.waterNext = new Float32Array(state.water.length);\n"
    "  state.qx = new Float32Array(state.water.length);\n"
    "  state.qy = new Float32Array(state.water.length);\n"
    "  state.limF = new Float32Array(state.water.length);\n"
    "  state.contourSegs = null;", label='resume alloc')

# ---------------------------------------------------------------- I. tooltip
rep("    `Elev: ${elev} m · Depth: ${depth} m<br>` +\n",
    "    `Elev: ${elev} m · Depth: ${depth} m` + (state.flow && state.flow[i] > 0.05 ? ` · ${state.flow[i].toFixed(2)} m/s` : '') + `<br>` +\n", label='tooltip')

# ---------------------------------------------------------------- J. arrows (flowX/Y are now velocities in m/s)
rep("        const scale = Math.min(cw * 1.5, mag * 80);\n", "        const scale = Math.min(cw * 1.5, mag * 10);\n", label='arrow 2d')
rep("        if (mag < 0.01 || state.water[i] < 0.02) continue;\n        const e = state.elev[i] + state.structH[i] + state.water[i] + 0.05;\n        const p0 = isoProject(gx + 0.5, gy + 0.5, e);\n        const tip = isoProject(gx + 0.5 + fx / mag * Math.min(1.2, mag * 8),\n                                 gy + 0.5 + fy / mag * Math.min(1.2, mag * 8), e);",
    "        if (mag < 0.05 || state.water[i] < 0.02) continue;\n        const e = state.elev[i] + state.structH[i] + state.water[i] + 0.05;\n        const p0 = isoProject(gx + 0.5, gy + 0.5, e);\n        const tip = isoProject(gx + 0.5 + fx / mag * Math.min(1.2, mag * 0.5),\n                                 gy + 0.5 + fy / mag * Math.min(1.2, mag * 0.5), e);", label='arrow iso')
rep("        if (mag < 0.01 || state.water[i] < 0.02) continue;\n        const scale", "        if (mag < 0.05 || state.water[i] < 0.02) continue;\n        const scale", label='arrow 2d thresh')

# ---------------------------------------------------------------- K. absolute-elevation floors on tools
rep("    state.structH[i] = -0.5;\n    state.elev[i] = Math.max(2, state.elev[i] - 0.5);\n    if (!sb)", "    state.structH[i] = -0.5;\n    state.elev[i] -= 0.5;\n    if (!sb)", label='breach tool floor')
rep("              state.structH[i] = -0.5;\n              state.elev[i] = Math.max(2, state.elev[i] - 0.5);\n", "              state.structH[i] = -0.5;\n              state.elev[i] -= 0.5;\n", label='breach event floor')
rep("state.type[i] = T.CHANNEL; state.structH[i] = -1.2; state.elev[i] = Math.max(2, state.elev[i] - 1);", "state.type[i] = T.CHANNEL; state.structH[i] = -1.2; state.elev[i] -= 1;", label='channel floor')
rep("state.type[i] = T.POND; state.structH[i] = -2.0; state.elev[i] = Math.max(1, state.elev[i] - 2);", "state.type[i] = T.POND; state.structH[i] = -2.0; state.elev[i] -= 2;", label='pond floor')
rep("        state.elev[ni] = Math.max(1.5, Math.min(state.elev[ni], state.elev[ni] + amount));", "        state.elev[ni] = Math.min(state.elev[ni], state.elev[ni] + amount);", label='grade floor')

# ---------------------------------------------------------------- L. HUD tooltips
rep('title="Maximum water-surface elevation along the river channel"', 'title="Deepest water in the river channel (m)"', label='stage title')
rep('title="Downstream boundary water-surface elevation (backs up when discharge is high)"', 'title="Mean water-surface elevation along the outlet row (free outfall at Manning normal depth)"', label='tw title')

# ---------------------------------------------------------------- L2. water rendering threshold
# Manning-governed overland flow leaves a centimetre or two of rain sheet on
# every hillslope; that is physically right but must not paint the map blue.
# Draw water only above WATER_VIS (4 cm) and ramp opacity from there.
rep("const MANNING = new Float32Array(17);", "const WATER_VIS = 0.04;        // m, minimum depth drawn as standing water\nconst MANNING = new Float32Array(17);", label='water vis const')
rep("""  if (wv > 0.005) {
    const wN = Math.min(1, wv * 2 + 0.3);
    const shimmer = Math.sin(state.time * 3 + (i % 31) * 0.5) * 0.05;""",
"""  if (wv > WATER_VIS) {
    const wN = Math.min(1, (wv - WATER_VIS) * 2 + 0.3);
    const shimmer = Math.sin(state.time * 3 + (i % 31) * 0.5) * 0.05;""", label='2d water threshold')
rep("""      if (wv > 0.005) {
        const ws = e + Math.max(0.15, wv * 1.5);""",
"""      if (wv > WATER_VIS) {
        const ws = e + Math.max(0.15, wv * 1.5);""", label='iso water threshold')
rep("        const alpha = Math.min(0.92, wv * 3 + 0.55);\n", "        const alpha = Math.min(0.92, (wv - WATER_VIS) * 3 + 0.5);\n", label='iso alpha')
rep("""      if (wv > 0.02) {
        const wN = Math.min(1, wv * 0.8 + 0.3);""",
"""      if (wv > WATER_VIS * 1.5) {
        const wN = Math.min(1, wv * 0.8 + 0.3);""", label='minimap threshold')
rep("""  // Total water volume (cells × depth × nominal cell area 100 m²)
  let vol = 0;
  if (state.water) for (let i = 0; i < state.water.length; i++) vol += state.water[i];
  const m3 = vol * 100; // each cell = 10m × 10m = 100 m²""",
"""  // Total water volume on the map (depth × DX² per cell)
  let vol = 0;
  if (state.water) for (let i = 0; i < state.water.length; i++) vol += state.water[i];
  const m3 = vol * DX * DX;""", label='vol hud')
rep('title="Total water volume on the map (assumes 10 m cells)"', 'title="Total water volume on the map (40 m cells)"', label='vol title')

# ---------------------------------------------------------------- M. explainer
old_expl = re.search(r"  <h2>How the model works — the real hydrology</h2>.*?</a> for stormwater design software\.</p>\n\n", s, re.S)
if old_expl:
    s = s[:old_expl.start()] + s[old_expl.end():]
new_expl = r"""  <h2>How the model works — the real hydrology</h2>
  <p>Floodline routes water with the <strong>local-inertial shallow-water scheme</strong> of Bates, Horritt &amp; Fewtrell (2010) — the solver inside LISFLOOD-FP and most modern 2D flood-inundation models — on a 40 m grid, in SI units, with Manning's roughness per land cover. It is not a full Saint-Venant / HEC-RAS 2D solver (the convective acceleration term is dropped, so it does not resolve supercritical shocks), but momentum, depth-dependent conveyance, backwater and wave propagation are all real. Everything below is exactly what the code does.</p>

  <h3>Momentum: unit discharge across each cell face</h3>
  <p>Each cell holds a water depth <em>h</em> above its bed <em>z</em> (terrain plus any structure). Between every pair of neighbouring cells the solver carries a unit discharge <em>q</em> (m²/s) that persists from step to step — this is the momentum. Each sub-step it is updated with</p>
  <p style="text-align:center;font-family:monospace;">q⁺ = [ θ·q + ½(1−θ)(q₋ + q₊) − g·h<sub>f</sub>·Δt·∂η/∂x ] / [ 1 + g·Δt·n²·|q| / h<sub>f</sub><sup>7/3</sup> ]</p>
  <ul>
    <li><strong>η = z + h</strong> is the water-surface elevation; its gradient across the face drives the flow.</li>
    <li><strong>h<sub>f</sub></strong>, the face flow depth, is max(η<sub>i</sub>, η<sub>j</sub>) − max(z<sub>i</sub>, z<sub>j</sub>) — so a levee crest higher than the water surface on both sides carries no flow at all, and overtopping depth is what governs flow once it does.</li>
    <li><strong>n</strong> is Manning's roughness, averaged across the face: river 0.035, dredged channel 0.025, concrete spillway 0.015, floodplain 0.05, pavement 0.02, built-up town 0.10. Conveyance scales as h<sup>5/3</sup>/n, which is why a 3 m flood wave moves an order of magnitude faster than a 10 cm sheet of runoff and why cutting a channel drains a bowl.</li>
    <li>The friction term is <strong>semi-implicit</strong> (it divides rather than subtracts), which keeps the scheme stable on steep dry hillslopes, and the <strong>θ = 0.85 q-centred average</strong> of de Almeida et al. (2012) damps grid-scale checkerboarding.</li>
  </ul>

  <h3>Continuity &amp; conservation</h3>
  <p>Depths update from the face discharges: <strong>Δh = Δt/Δx · (Σ q<sub>in</sub> − Σ q<sub>out</sub>)</strong>. Before that, a donor limiter scales every outgoing face of any cell whose scheduled export exceeds what it holds, so depths never go negative and total volume is conserved to floating-point precision — water enters only as rain, inflow or surge and leaves only through infiltration, pumps and the outlet. The time step obeys the CFL condition <strong>Δt ≤ 0.7·Δx / √(g·h<sub>max</sub>)</strong> by sub-stepping whenever the deepest water demands it.</p>

  <h3>Sources, sinks &amp; boundaries</h3>
  <ul>
    <li><strong>Time compression:</strong> one game-second is 150 real seconds, so a 180 s scenario is a 7½-hour storm and a flood wave crosses the 7 km valley in a visible half-minute.</li>
    <li><strong>Rain</strong> is added as depth every step: (mm/hr ÷ 3.6·10⁶) × real seconds elapsed.</li>
    <li><strong>Off-map watershed runoff:</strong> rational-method Q = C·i·A with C = 0.45 over a virtual basin watershedRatio× the visible map (5× by default), lagged through a linear reservoir with a one-hour time constant — the delayed limb of the hydrograph.</li>
    <li><strong>River inflow</strong> enters through the channel cells in the top two rows of the map at 1 000 m³/s per scenario inflow unit; Cedar Rapids peaks near 2 600 m³/s, close to the 4 000 m³/s the Cedar River actually delivered in June 2008 scaled to this channel.</li>
    <li><strong>Infiltration</strong> is a Green-Ampt-style sink limited by antecedent saturation: taken = min(depth, rate·(1 − saturation)), with rate ≈ 14 mm/hr loam, 29 sand, 5 clay. Pre-wet soil (high AMC in historical scenarios) absorbs far less, so rain wins during a storm.</li>
    <li><strong>Pumps</strong> are rated at 45 m³/s (a large municipal flood station), drawn from a 5×5 footprint in proportion to depth; <strong>siphons</strong> pass 8 m³/s over 3×3 once primed by 10 cm of standing water.</li>
    <li><strong>Downstream boundary:</strong> the outlet row is a free outfall discharging at Manning normal depth on the local bed slope. Bowl maps below sea level (Katrina) close the outlet — the only ways out are over the levee or through a pump.</li>
    <li><strong>Storm surge</strong> is a stage boundary: the lake rows are held at a prescribed water-surface elevation through the surge hydrograph, and the inertial solver decides what overtops.</li>
  </ul>

  <h3>Levee stress &amp; overtopping</h3>
  <p>Levees do not fail on a simple height check — they accumulate stress while overtopped. When any neighbour's water surface exceeds the levee crest, stress builds as <strong>stress += dt · rate · (1 + 3·overtopping depth)</strong>, where rate = 1.0 (0.5 if reinforced), so deeper overtopping fails a levee faster. A breach fires when stress crosses 5 (10 if reinforced); the crest drops 0.5 m and the solver's momentum equation produces the resulting breach wave. When not overtopped, stress relaxes at −0.5·dt. Sandbags erode under real flow velocity (&gt; 1 m/s), not static head. Damage follows HAZUS-style depth–damage curves.</p>

  <p>Scenarios are calibrated against published USGS, DWR and USACE post-event reports, but the model stays first-order: treat it as an intuition-builder for routing, storage and levee risk, not as a certified flood forecast.</p>

  <p style="margin-top:18px;color:#8098a8;font-size:0.95em;line-height:1.6;">Built by a practicing water-resources engineer. For the professional versions of this math, see the free <a href="https://pe-calc.com/tools/mannings?utm_source=boardgaminghub&amp;utm_medium=sim-model&amp;utm_campaign=floodline" target="_blank" rel="noopener">open-channel &amp; hydrology calculators at pe-calc.com</a>, or <a href="https://hydrocomplete.com/?utm_source=boardgaminghub&amp;utm_medium=sim-model&amp;utm_campaign=floodline" target="_blank" rel="noopener">HydroComplete</a> for stormwater design software.</p>

"""
rep("  <h3>Related games</h3>\n", new_expl + "  <h3>Related games</h3>\n", label='explainer insert')
rep_re(r'(<details><summary>How accurate is the hydrology\?</summary><p>)[^<]*(</p></details>)',
       r'\1Water is routed with the local-inertial shallow-water scheme used by LISFLOOD-FP (Bates et al. 2010) on a 40 m grid with Manning roughness per land cover, so flood waves, backwater and levee overtopping behave like the real thing. Pump and gate response curves are simplified. Scenarios are calibrated against published post-event reports from USGS, DWR and USACE.\2', label='faq details')
rep_re(r'("name":"How accurate is the hydrology\?","acceptedAnswer":\{"@type":"Answer","text":")[^"]*(")',
       r'\1Water is routed with the local-inertial shallow-water scheme used by LISFLOOD-FP (Bates et al. 2010) on a 40 m grid with Manning roughness per land cover. Pump and gate response curves are simplified. Scenarios are calibrated against published post-event reports from USGS, DWR and USACE.\2', label='faq jsonld')

# ---------------------------------------------------------------- N0. scenario hydrographs in real units (1 unit = 1 000 m³/s)
rep("      inflow: 0.5 + 0.2 * Math.max(0, Math.sin(Math.PI * (t - 30) / 60)),\n",
    "      inflow: 0.5 + 2.6 * Math.max(0, Math.sin(Math.PI * (t - 30) / 60)),   // peaks ≈ 3 100 m³/s, over a metre above bank-full\n", label='training inflow')
rep("      inflow: 0.4 + 1.8 * Math.max(0, Math.sin(Math.PI * (t - 40) / 140)),\n",
    "      inflow: 0.4 + 3.6 * Math.max(0, Math.sin(Math.PI * (t - 40) / 140)),   // peaks ≈ 4 000 m³/s — the Cedar River's 140 000 cfs crest\n", label='cedar inflow')
rep("    peakFlow: 0.7,\n    peakRain: 20,", "    peakFlow: 3.1,\n    peakRain: 20,", label='training peakFlow')
# Pumped volume is real cubic metres now; 50 m³ is one second of one pump.
rep("desc: 'Move 50 m³ of water',                 check: s => s.stats.pumped >= 50 }",
    "desc: 'Pump 500,000 m³ of water',            check: s => s.stats.pumped >= 500000 }", label='pump achievement')
rep("  html += `<div>Pumped: <b>${state.stats.pumped.toFixed(1)} m³</b></div>`;",
    "  html += `<div>Pumped: <b>${fmtVol(state.stats.pumped)}</b></div>`;", label='pumped results')
rep("    ['Water pumped', `${state.stats.pumped.toFixed(1)} m³`],", "    ['Water pumped', fmtVol(state.stats.pumped)],", label='pumped stats')
rep("    ['Water pumped',         `${(c.pumped || 0).toFixed(0)} m³`],", "    ['Water pumped',         fmtVol(c.pumped || 0)],", label='pumped career')
rep("function fmtQ(q) {", "function fmtVol(v) {\n  return v >= 1e6 ? `${(v / 1e6).toFixed(2)}M m³` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k m³` : `${Math.round(v)} m³`;\n}\nfunction fmtQ(q) {", label='fmtVol')
rep("    peakFlow: 2.2,\n    peakRain: 25,", "    peakFlow: 4.0,\n    peakRain: 25,", label='cedar peakFlow')

# ---------------------------------------------------------------- N. premium-only scenario tuning (no-ops on the demo)
if "id: 'katrina2005'," in s:
    # Local design storm: SCS unit-hydrograph response into game units (1 unit = 1 000 m³/s).
    rep("  const inflowScaled = inflow * 0.002;\n", "  const inflowScaled = inflow * 0.03;\n", label='localstorm scale')
    # Lumberton: the Lumber River's Matthew crest; the old value never reached the town.
    rep("      inflow: 0.4 + 2.2 * Math.max(0, Math.sin(Math.PI * (t - 40) / 140)),\n",
        "      inflow: 0.4 + 4.8 * Math.max(0, Math.sin(Math.PI * (t - 40) / 140)),\n", label='lumberton inflow')
    rep("    peakFlow: 2.5,\n    peakRain: 30,", "    peakFlow: 5.2,\n    peakRain: 30,", label='lumberton peakFlow')
    # Mississippi 1927: the river ran ~30× a normal spring flow. 15 000 m³/s on
    # this 700 m channel puts 3 m over the floodplain, which is the point.
    rep("      inflow: 0.6 + 2.8 * Math.max(0, Math.sin(Math.PI * (t - 30) / 180)) + (t > 100 ? Math.min(1.5, (t - 100) * 0.02) : 0),\n",
        "      inflow: 0.6 + 9.8 * Math.max(0, Math.sin(Math.PI * (t - 30) / 180)) + (t > 100 ? Math.min(5.2, (t - 100) * 0.07) : 0),\n", label='mississippi inflow')
    rep("    peakFlow: 4.3,\n    peakRain: 30,", "    peakFlow: 15,\n    peakRain: 30,", label='mississippi peakFlow')
    rep("""    terrain: generateSubSeaLevel,
    townBox: { x: 0.30, y: 0.45, w: 30, h: 20 },""",
"""    terrain: generateSubSeaLevel,
    // Lake Pontchartrain is a stage boundary: base 1.5 m, surge peaking 4 m
    // higher (levee ridge ≈ 4 m, so ~1.5 m of overtopping at the crest of the
    // surge). The bowl has no outfall — pumps or perish.
    initStage: 1.5,
    lakeStage: (t, m) => 1.5 + m * (t > 30 && t < 80 ? 4.0 * Math.sin(Math.PI * (t - 30) / 50) : 0),
    outlet: 'closed',
    townBox: { x: 0.30, y: 0.45, w: 30, h: 20 },""", label='katrina boundary')
    rep("""    terrain: generateFlatBasin,
    townBox: { x: 0.35, y: 0.45, w: 28, h: 16 },""",
"""    terrain: generateFlatBasin,
    outlet: 'river',   // coastal plain: only the bayous leave the map, sheet flow has to find them
    townBox: { x: 0.35, y: 0.45, w: 28, h: 16 },""", label='harvey outlet')
    rep("""    terrain: generateDamReservoir,
    townBox: { x: 0.40, y: 0.65, w: 22, h: 8 },""",
"""    terrain: generateDamReservoir,
    initStage: 10.5,   // reservoir 1.5 m below crest, spillway (notch at 8 m) already running
    townBox: { x: 0.40, y: 0.65, w: 22, h: 8 },""", label='oroville stage')
    rep("""    terrain: generateCascadeValley,
    townBox: { x: 0.45, y: 0.70, w: 18, h: 10 },""",
"""    terrain: generateCascadeValley,
    initStage: (x, y) => (y < ROWS * 0.2 ? 8.5 : 7.0),   // upper pool 1.5 m below crest, middle 1 m below
    townBox: { x: 0.45, y: 0.70, w: 18, h: 10 },""", label='edenville stage')

# ---------------------------------------------------------------- O. port demo-only fixes into the premium file (no-ops on the demo)
if "state.infraOrigCount = {};" not in s:
    rep("""function buildObjectives() {
  const sc = state.scenario;
""", """function buildObjectives() {
  const sc = state.scenario;
  // Record the original count of each protected building type. getInfraDamage()
  // uses this as a fixed denominator so evacuating (or otherwise losing) all
  // protected cells can't shrink the denominator to zero and auto-satisfy a
  // "protect the hospital/school" objective.
  state.infraOrigCount = {};
  for (let i = 0; i < state.type.length; i++) {
    const t = state.type[i];
    if (t === T.HOSPITAL || t === T.SCHOOL) {
      state.infraOrigCount[t] = (state.infraOrigCount[t] || 0) + 1;
    }
  }
""", label='port infraOrigCount')
    rep("""function getInfraDamage(tileType) {
  let tot = 0, dmg = 0;
  for (let i = 0; i < state.type.length; i++) {
    if (state.type[i] === tileType) { tot++; dmg += state.damage[i]; }
  }
  return tot > 0 ? (100 * dmg / tot) : 0;
}""", """function getInfraDamage(tileType) {
  let cur = 0, dmg = 0;
  for (let i = 0; i < state.type.length; i++) {
    if (state.type[i] === tileType) { cur++; dmg += state.damage[i]; }
  }
  const orig = state.infraOrigCount ? state.infraOrigCount[tileType] : undefined;
  if (orig && orig > 0) {
    // Cells that are no longer of this type were evacuated/abandoned. Count each
    // as fully damaged (against the ORIGINAL count) so evacuation reads as
    // "not protected" rather than auto-passing via an empty denominator. This
    // distinguishes "fully evacuated" from "still standing and undamaged".
    const lost = Math.max(0, orig - cur);
    return 100 * (dmg + lost) / orig;
  }
  return cur > 0 ? (100 * dmg / cur) : 0;
}""", label='port getInfraDamage')
if "const PHYS_DT" not in s:
    rep("""let lastT = performance.now();
function loop(t) {
  const dt = Math.min(0.1, (t - lastT) / 1000) * state.speed;
  lastT = t;

  if (!state.gameOver && state.storming) {
    state.time += dt;
    step(dt);
    runTutorial();
    if (state.time >= (state.scenario._effectiveDuration ?? state.scenario.duration)) endGame();
  } else if (!state.storming) {
    // Prep phase: count down to auto-start, unless countdown is already running
    if (state.scenario && !state.gameOver && state.countdown === 0 && state.prepTimer > 0) {
      state.prepTimer = Math.max(0, state.prepTimer - dt);""",
"""let lastT = performance.now();
// Fixed physics timestep (game-seconds) with an accumulator, so the solver's
// sub-stepping and CFL logic see the same Δt at every frame rate and speed.
const PHYS_DT = 1 / 60;
const MAX_SUBSTEPS = 120; // safety cap so a slow frame can't spiral

function loop(t) {
  const frameDelta = Math.min(0.1, (t - lastT) / 1000) * state.speed;
  lastT = t;

  if (!state.gameOver && state.storming) {
    state._physAccum = (state._physAccum || 0) + frameDelta;
    let subSteps = 0;
    const duration = state.scenario._effectiveDuration ?? state.scenario.duration;
    while (state._physAccum >= PHYS_DT && subSteps < MAX_SUBSTEPS) {
      state.time += PHYS_DT;
      step(PHYS_DT);
      state._physAccum -= PHYS_DT;
      subSteps++;
      if (state.time >= duration) { endGame(); break; }
    }
    runTutorial();
  } else if (!state.storming) {
    // Not storming: drop any accumulated physics time so the sim doesn't burst
    // forward on the first storm frame.
    state._physAccum = 0;
    // Prep phase: count down to auto-start, unless countdown is already running
    if (state.scenario && !state.gameOver && state.countdown === 0 && state.prepTimer > 0) {
      state.prepTimer = Math.max(0, state.prepTimer - frameDelta);""", label='port fixed dt loop')
else:
    rep("""// Fixed physics timestep (game-seconds). The flux solver, river inflow, storm
// surge, pumps and siphons move a fixed amount of water per step() call and are
// NOT dt-scaled, so their per-game-second throughput depends purely on how many
// times step() runs per game-second. Running the physics at a FIXED number of
// sub-steps per game-second (1/PHYS_DT) decouples it from frame rate and speed,
// so total water routed / injected / pumped per game-second is identical at
// every speed — consistent with the dt-scaled rain/infiltration/stress terms.
// 1/60 preserves the throughput of the original 60fps / speed-1 case.
""", """// Fixed physics timestep (game-seconds) with an accumulator, so the solver's
// sub-stepping and CFL logic see the same Δt at every frame rate and speed.
""", label='dt comment')

out = s.replace('\n', '\r\n') if crlf else s
open(out_path, 'wb').write(out.encode('utf-8'))
print('patched ->', out_path, 'crlf' if crlf else 'lf', len(out))
