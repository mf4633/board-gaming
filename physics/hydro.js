// physics/hydro.js — atmospheric water budget in real units (mm of water).
//
// State per tile: q = precipitable water in the column (mm), soil = plant-
// available soil water (mm, land only). Diagnostics: rh, evap, precip, runoff.
//
// The mesh carries a prescribed wind field (tiles[i].upwind, windSpeed). Each
// pass is an explicit upwind step of length dtDay: a tile hands the fraction
// c_i = U_i dt / dx (its Courant number) of its column to the tiles downwind
// of it, split evenly, so water is conserved exactly, and exchanges water
// with the surface for the same dt:
//
//   saturation column   W_sat(T) = wRef * exp(cc * (T - tRef))          [mm]
//       Clausius-Clapeyron ~6.7 %/K, anchored at 25 mm for 15 degC (observed:
//       ~50 mm in the tropics, ~5 mm over polar regions)
//   evaporation         E = min(E_aero, E_max)                              [mm/day]
//       E_aero = eRef * (W_sat/W_ref) * (1 - RH) * (U/uRef) * beta, the bulk-
//       aerodynamic form (vapour-pressure deficit times wind); beta = 1 over
//       ocean, soil/soilCap over land. E_max is the energy limit: latent heat
//       cannot exceed the net surface radiation, ~0.6 * ASR / (29 W/m^2 per mm/day).
//   precipitation       P = P_cond + P_rain + P_oro                       [mm/day]
//       P_cond = (q - rhCond*W_sat)/tauCond   large-scale condensation once RH > rhCond
//       P_rain = q * RH / tauRes             background rain-out, ~9-day residence time
//       P_oro  = q * max(0, dh) / hScale / dt forced ascent over rising terrain
//   soil bucket (land)  dS = (P - E) dt,  runoff = max(0, S - soilCap)/tauDrain
//       so rivers carry P - E, not P, and deserts with E > P run dry.
//   large-scale ascent  the discrete divergence of the wind field on the mesh
//       (div U > 0 where the trades and westerlies part at 30 deg: Hadley-cell
//       subsidence; div U < 0 at the ITCZ and the 60 deg storm tracks). Rising
//       air rains out faster, sinking air suppresses condensation:
//         P_rain *= 1 + ascentGain * ascent,   P *= 1 - subsideDamp * subsidence
//       with ascent = max(0, -divN), subsidence = max(0, divN), divN the
//       divergence normalized by its RMS over the sphere.
var HYDRO = (function () {
  var DEFAULTS = {
    wRef: 25.0,       // mm, saturation column at tRef
    tRef: 15.0,       // degC
    cc: 0.067,        // 1/K
    eRef: 16.5,       // mm/day at tRef, RH 0, U = uRef
    uRef: 7.0,        // m/s
    windScale: 9.0,   // m/s per unit of the mesh's dimensionless wind speed
    rhCond: 0.85,
    tauCond: 0.5,     // days
    tauRes: 9.0,      // days
    hScale: 4000,     // m
    soilCap: 150,     // mm plant-available soil water
    landE: 0.6,       // land evapotranspiration efficiency relative to open water
    tauDrain: 5,      // days, drainage of saturated soil
    ascentGain: 1.5,  // rain-out enhancement per unit normalized ascent
    subsideDamp: 0.9, // precipitation suppression per unit normalized subsidence
    dxKm: 224,        // tile spacing (sqrt of mean tile area at freq 32)
    dtDay: 0.25,      // days per pass (Courant number < 1 for U < 10 m/s)
    passes: 12        // passes per game step: the field persists, so climatology converges over steps
  };
  function params(p) {
    var out = {};
    for (var k in DEFAULTS) out[k] = (p && p[k] != null) ? p[k] : DEFAULTS[k];
    return out;
  }
  function wsat(T, p) { return p.wRef * Math.exp(p.cc * (T - p.tRef)); }

  function allocFields(n) {
    return {
      q: new Float32Array(n), soil: new Float32Array(n),
      rh: new Float32Array(n), evap: new Float32Array(n), precip: new Float32Array(n), runoff: new Float32Array(n),
      T: new Float32Array(n), elev: new Float32Array(n), isOcean: new Uint8Array(n),
      emax: null   // optional per-tile evaporation cap (mm/day) from available surface energy: ~0.6 * ASR / 29
    };
  }

  // Discrete divergence of the prescribed wind field, normalized by its RMS.
  // div_i = (1/area_i) sum_j l_ij * ((U_i + U_j)/2 . n_ij), n_ij the unit
  // vector from center i toward center j, l_ij = w_ij * d_ij the shared edge.
  function divergence(tiles, G, F) {
    var n = G.n, div = new Float32Array(n), ss = 0;
    for (var i = 0; i < n; i++) {
      var ci = tiles[i].center, ui = tiles[i].wind, s = 0;
      for (var q = G.nbStart[i]; q < G.nbStart[i + 1]; q++) {
        var j = G.nbIdx[q], cj = tiles[j].center, uj = tiles[j].wind;
        var dx = cj[0] - ci[0], dy = cj[1] - ci[1], dz = cj[2] - ci[2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);          // chord ~ arc on the unit sphere
        var um0 = 0.5 * (ui[0] + uj[0]), um1 = 0.5 * (ui[1] + uj[1]), um2 = 0.5 * (ui[2] + uj[2]);
        var flux = (um0 * dx + um1 * dy + um2 * dz) / d;          // U . n
        s += G.nbW[q] * d * flux;                                  // l_ij = w_ij * d_ij
      }
      div[i] = s / (G.area[i] / (G.R * G.R));                      // per unit-sphere area
      ss += div[i] * div[i] * G.area[i];
    }
    var rms = Math.sqrt(ss / G.totalArea) || 1;
    for (var i = 0; i < n; i++) div[i] /= rms;
    F.divN = div;
    return div;
  }

  // tiles: mesh tiles (upwind, windSpeed, wind, center). G: geometry. F:
  // fields with T (surface degC), elev (m), isOcean set by the caller.
  // Runs p.passes transits.
  function step(tiles, G, F, pIn, opts) {
    var p = params(pIn);
    opts = opts || {};
    var passes = opts.passes || p.passes;
    var n = tiles.length;
    if (!F.divN || F.divN.length !== n) divergence(tiles, G, F);
    var divN = F.divN;
    // downstream fan-out: a tile that is the upwind source of k tiles sends
    // each of them a/k of its column, so transport conserves water exactly
    if (!F._fan || F._fan.length !== n) {
      var fan = new Int32Array(n);
      for (var i = 0; i < n; i++) { var u = tiles[i].upwind; if (u >= 0 && u !== i) fan[u]++; }
      F._fan = fan;
    }
    var fanOut = F._fan;
    var emax = F.emax;
    var q = F.q, soil = F.soil;
    var qNew = F._qswap && F._qswap.length === n ? F._qswap : (F._qswap = new Float32Array(n));
    var wRef15 = wsat(p.tRef, p);
    for (var pass = 0; pass < passes; pass++) {
      for (var i = 0; i < n; i++) {
        var t = tiles[i];
        var U = Math.max(0.5, t.windSpeed * p.windScale);          // m/s
        var dt = p.dtDay;
        var up = t.upwind >= 0 ? t.upwind : i;
        var T = F.T[i];
        var Ws = wsat(T, p);
        // transport (conservative upwind flux, Courant number c = U dt / dx)
        var cOut = fanOut[i] > 0 ? Math.min(0.95, U * 86.4 * dt / p.dxKm) : 0;
        var qa = (1 - cOut) * q[i];
        if (up !== i) {
          var Uup = Math.max(0.5, tiles[up].windSpeed * p.windScale);
          qa += Math.min(0.95, Uup * 86.4 * dt / p.dxKm) * q[up] / fanOut[up];
        }
        // evaporation: bulk-aerodynamic, capped by available surface energy
        var rh = qa / Ws;
        // land: soil-water availability times a canopy/soil resistance factor
        // (land ET runs ~0.6 of open-water potential; Priestley-Taylor practice)
        var beta = F.isOcean[i] ? 1 : p.landE * Math.min(1, soil[i] / p.soilCap);
        var E = p.eRef * (Ws / wRef15) * Math.max(0, 1 - rh) * (U / p.uRef) * beta;
        if (emax && E > emax[i]) E = emax[i];
        if (!F.isOcean[i] && E * dt > soil[i]) E = soil[i] / dt;                 // land cannot evaporate water it does not hold
        if (E * dt > 0.5 * Math.max(0, Ws - qa)) E = 0.5 * Math.max(0, Ws - qa) / dt;   // cannot overshoot saturation in one transit
        qa += E * dt;
        rh = qa / Ws;
        // precipitation
        var P = 0;
        var ascent = divN[i] < 0 ? -divN[i] : 0, subsidence = divN[i] > 0 ? divN[i] : 0;
        // sinking air is dry aloft: condensation needs a higher column RH under subsidence, less under ascent
        var rhc = p.rhCond + 0.12 * Math.min(1, subsidence) - 0.10 * Math.min(1, ascent);
        if (qa > rhc * Ws) P += (qa - rhc * Ws) / p.tauCond;
        P += qa * rh / p.tauRes * (1 + p.ascentGain * Math.min(2, ascent));
        P *= Math.max(0.1, 1 - p.subsideDamp * Math.min(1, subsidence));
        if (!F.isOcean[i]) {
          var dh = F.elev[i] - (F.isOcean[up] ? 0 : F.elev[up]);
          // at most half the column per transit (Cherrapunji-class ~30 mm/day is the observed extreme)
          if (dh > 0) P += qa * Math.min(0.5, dh / p.hScale) * (U * 86.4 / p.dxKm);
        }
        if (qa - P * dt > Ws) P += (qa - P * dt - Ws) / dt;                    // supersaturation condenses at once
        if (P * dt > qa) P = qa / dt;
        qa -= P * dt;
        qNew[i] = qa;
        F.rh[i] = qa / Ws;
        F.evap[i] = E;
        F.precip[i] = P;
        // soil bucket and runoff (land)
        if (!F.isOcean[i]) {
          var S = soil[i] + (P - E) * dt;
          if (S < 0) S = 0;
          var excess = S > p.soilCap ? S - p.soilCap : 0;
          var R = excess / p.tauDrain;
          S -= R * dt;
          soil[i] = S;
          F.runoff[i] = R;
        } else {
          soil[i] = 0;
          F.runoff[i] = 0;
        }
      }
      for (var i = 0; i < n; i++) q[i] = qNew[i];
    }
  }

  // Area-weighted global means for tests and the science panel.
  function diagnostics(G, F) {
    var n = G.n, A = G.area, e = 0, pr = 0, ro = 0, land = 0, rhO = 0, oc = 0;
    for (var i = 0; i < n; i++) {
      e += F.evap[i] * A[i]; pr += F.precip[i] * A[i];
      if (F.isOcean[i]) { rhO += F.rh[i] * A[i]; oc += A[i]; } else { ro += F.runoff[i] * A[i]; land += A[i]; }
    }
    // Closure: transport conserves water, so at steady state global E = global P;
    // rivers carry the land surplus (P - E = R) back to an ocean of unlimited supply.
    return { meanEvap: e / G.totalArea, meanPrecip: pr / G.totalArea, meanRunoff: ro / G.totalArea, meanRunoffLand: land ? ro / land : 0,
             oceanRH: oc ? rhO / oc : 0, imbalance: (e - pr) / G.totalArea };
  }

  return { DEFAULTS: DEFAULTS, params: params, wsat: wsat, allocFields: allocFields, divergence: divergence, step: step, diagnostics: diagnostics };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HYDRO;
