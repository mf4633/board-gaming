// physics/carbon.js — long-term carbon, oxygen and methane cycle in GtC and years.
//
// Reservoirs (GtC):
//   cEx     exchangeable carbon = atmosphere + ocean (surface + deep DIC)
//   fossil  recoverable organic carbon (coal, oil, gas) that a civilization can burn
//   crust   everything else (carbonate + kerogen); tracked only for conservation tests
//
// Partition of cEx between air and sea (solved by bisection each step):
//   atm(pCO2)   = gtcPerPpm * pCO2                                    [2.13 GtC per ppm]
//   ocean(pCO2) = oceanC0 * (pCO2 / (280 e^{k(T-T0)}))^(1/R)         R = Revelle factor ~10,
//                                                                    k = 4 %/K CO2 solubility (on pCO2 at fixed DIC)
//   cEx = atm + ocean   (monotone in pCO2, so bisection is safe over 1..1e7 ppm)
// At small perturbations the ocean absorbs ~90 % of added carbon (Revelle);
// at Archean levels the atmosphere dominates because the ocean saturates.
//
// Fluxes (GtC/yr):
//   volcanic      F_v = volc0 * tectonic                             0.1 GtC/yr modern
//   weathering    F_w = volc0 (pCO2/280)^0.3 exp((T-T0)/13.7)        Walker-Hays-Kasting 1981
//                       * land/0.29 * (1 + gVeg veg)/(1 + gVeg veg0)  * (1 - 0.85 ice) * liquid(T)
//   organic burial F_b = burial0 * productivity                      source of O2
//   oxidative weathering F_ox = oxWeath0 sqrt(O2/0.21) land/0.29 liquid   sink of O2, returns C
//   fossil burn   F_f = min(fossil/dt, demand)                       civilization
//   fossil decay  fossil / fossilTau                                  reserves plateau ~ fossilFrac*burial*tau
//   reductant sink of O2: reductant0 exp(-age/tau)                   reduced volcanic gases, Fe2+
//                                                                    (why the Great Oxidation waited ~2 Gyr)
// Oxygen: 1 GtC buried releases 8.33e13 mol O2; the atmosphere holds 1.77e20 mol of air.
// Methane: steady state ch4 = source * lifetime, lifetime ~ 9 yr * (0.21/O2) capped at
//   10 kyr (OH oxidation needs O2), 1 GtC of CH4 = 480 ppb.
var CARBON = (function () {
  var DEFAULTS = {
    gtcPerPpm: 2.13,
    oceanC0: 38000, revelle: 10, solub: 0.04, T0: 14.6, pco2_0: 280,
    volc0: 0.1,
    weathT: 13.7, weathCO2: 0.3, land0: 0.29, ice0: 0.10, gVeg: 2.0, veg0: 0.2,   // veg0 = land-mean cover of the reference (modern) surface
    burial0: 0.06, oxWeath0: 0.06, fossilFrac: 5e-4, fossilTau: 5e8,   // ~10,000 GtC recoverable out of ~2e7 buried since the Carboniferous; plateau 15,000
    reductant0: 0.10, reductantTau: 1.0,
    molPerGtC: 8.33e13, airMol: 1.77e20, o2Max: 0.35,
    ch4Life0: 9, ch4LifeMax: 10000, ch4PpbPerGtC: 480,
    subStepYr: 10000
  };
  function params(p) {
    var out = {};
    for (var k in DEFAULTS) out[k] = (p && p[k] != null) ? p[k] : DEFAULTS[k];
    return out;
  }
  // Solubility acts on the partial pressure at fixed DIC (Takahashi: ~4 %/K),
  // so the ocean's carbon for a given pCO2 is that of a cooler-equivalent pCO2.
  // Sea water sits at or above its freezing point whatever the air does, and
  // sea ice seals the exchange: an ice-covered fraction of the ocean holds
  // its carbon but takes no more (the snowball escape mechanism).
  function oceanC(pco2, T, p, ice) {
    var Tw = T < -2 ? -2 : T;
    var open = 1 - (ice || 0);
    if (open < 0.02) open = 0.02;
    return p.oceanC0 * open * Math.pow(pco2 / (p.pco2_0 * Math.exp(p.solub * (Tw - p.T0))), 1 / p.revelle);
  }
  function cexFromPco2(pco2, T, pIn, ice) {
    var p = params(pIn);
    return p.gtcPerPpm * pco2 + oceanC(pco2, T, p, ice);
  }
  // Bisection: f(pco2) = cex(pco2) - target is monotone increasing.
  function pco2FromCex(cEx, T, pIn, ice) {
    var p = params(pIn);
    var lo = 1, hi = 1e7;
    if (cexFromPco2(hi, T, p, ice) < cEx) return hi;
    for (var k = 0; k < 60; k++) {
      var mid = Math.sqrt(lo * hi);              // geometric bisection: pco2 spans 7 decades
      if (cexFromPco2(mid, T, p, ice) < cEx) lo = mid; else hi = mid;
      if (hi / lo < 1 + 1e-9) break;
    }
    return Math.sqrt(lo * hi);
  }
  function initState(pco2, T, o2, pIn, ice) {
    return { cEx: cexFromPco2(pco2, T, pIn, ice), fossil: 0, crust: 0, o2: o2, ch4: 700, co2: pco2, flux: null };
  }
  function ch4Lifetime(o2, p) {
    var life = p.ch4Life0 * (0.21 / Math.max(o2, 1e-6));
    return life > p.ch4LifeMax ? p.ch4LifeMax : life;
  }
  // env: { T (global mean degC), landFrac, iceFrac (all tiles: weathering), seaIce (ocean fraction: sealing),
  //        veg (0..1 land mean), productivity (0..1),
  //        age (Gyr), tectonic (1 = modern), civBurn (GtC/yr demand), ch4Source (GtC/yr),
  //        pulseC (GtC added this step, e.g. volcano/fire), pulseO2 (fraction of air removed) }
  // Within a step the climate equilibrates in years while CO2 changes over
  // millennia, so the temperature the fluxes see tracks pCO2 through the
  // zero-dimensional sensitivity dT = climSens * 5.35 ln(pCO2 / pCO2 at step start)
  // (climSens ~ 1/B = 0.48 K per W/m^2, no ice feedback: deliberately mild).
  // Substeps are also refined so no substep moves more than 5 % of cEx.
  function step(st, env, dtY, pIn) {
    var p = params(pIn);
    var nSub = Math.max(1, Math.ceil(dtY / p.subStepYr));
    var dt = dtY / nSub;
    var ice = env.seaIce != null ? env.seaIce : (env.iceFrac || 0);   // fraction of the OCEAN under ice seals the exchange
    var T0step = env.T, pco2Start = pco2FromCex(st.cEx, T0step, p, ice);
    var sens = env.climSens != null ? env.climSens : 0.48;
    var T = T0step, liquid = (T > 0 && T < 100) ? 1 : 0;
    var landF = (env.landFrac != null ? env.landFrac : p.land0) / p.land0;
    var iceF = Math.max(0.05, 1 - 0.85 * (env.iceFrac || 0)) / (1 - 0.85 * p.ice0);   // normalized to modern ice cover
    var vegF = (1 + p.gVeg * (env.veg || 0)) / (1 + p.gVeg * p.veg0);
    var prod = (env.productivity || 0) * (T > -2 && T < 60 ? 1 : 0);   // no photosynthesis on a frozen or boiling planet
    var red = p.reductant0 * Math.exp(-(env.age || 0) / p.reductantTau);
    var demand = env.civBurn || 0;
    var acc = { volc: 0, weath: 0, burial: 0, oxid: 0, fossil: 0, reductant: red };
    var o2Mol = st.o2 * p.airMol;
    if (env.pulseC) st.cEx += env.pulseC;
    if (env.pulseO2) o2Mol -= env.pulseO2 * p.airMol;
    var done = 0;
    for (var s = 0; done < dtY - 1e-9 && s < 400; s++) {
      var pco2 = pco2FromCex(st.cEx, T, p, ice);
      T = T0step + sens * 5.35 * Math.log(Math.max(1e-3, pco2) / Math.max(1e-3, pco2Start));
      liquid = (T > 0 && T < 100) ? 1 : 0;
      var Fv = p.volc0 * (env.tectonic != null ? env.tectonic : 1);
      var Fw = liquid * p.volc0 * Math.pow(pco2 / p.pco2_0, p.weathCO2) * Math.exp((T - p.T0) / p.weathT) * landF * vegF * iceF;
      var Fb = p.burial0 * prod;
      var Fox = liquid * p.oxWeath0 * Math.sqrt(Math.max(0, st.o2) / 0.21) * landF;
      var Ff = Math.min(st.fossil / dt, demand);   // dt here is the nominal substep; the reserve floor below keeps it non-negative
      // engineered carbon removal, to the crust; a civilization stops at its
      // preindustrial baseline rather than draining the ocean for 100 kyr
      var Fcap = (env.capture || 0) * Math.min(1, Math.max(0, (pco2 - p.pco2_0) / 100));
      var Fdecay = st.fossil / p.fossilTau;
      var net = Fv - Fw - Fb + Fox + Ff - Fcap;
      var dtSub = Math.min(dt, dtY - done);
      if (Math.abs(net) * dtSub > 0.05 * st.cEx) dtSub = Math.max(dtY / 400, 0.05 * st.cEx / Math.abs(net));
      dt = dtSub;
      st.cEx += net * dt;
      st.fossil += (p.fossilFrac * Fb - Ff - Fdecay) * dt;
      if (st.fossil < 0) { st.cEx += st.fossil; st.fossil = 0; }
      st.crust += (Fw + (1 - p.fossilFrac) * Fb - Fv - Fox + Fdecay + Fcap) * dt;
      o2Mol += (Fb - Fox - Ff - red) * p.molPerGtC * dt;
      if (o2Mol < 0) o2Mol = 0;
      if (o2Mol > p.o2Max * p.airMol) o2Mol = p.o2Max * p.airMol;
      st.o2 = o2Mol / p.airMol;
      acc.volc += Fv * dt; acc.weath += Fw * dt; acc.burial += Fb * dt; acc.oxid += Fox * dt; acc.fossil += Ff * dt;
      done += dt;
      dt = dtY / nSub;
    }
    for (var k in acc) if (k !== 'reductant') acc[k] /= dtY;   // time-weighted mean fluxes, GtC/yr
    st.co2 = pco2FromCex(st.cEx, T0step, p, ice);
    // methane: lifetime << step, so it sits at its steady state
    var life = ch4Lifetime(st.o2, p);
    var ch4Gt = (env.ch4Source || 0) * life;
    st.ch4 = Math.max(1, ch4Gt * p.ch4PpbPerGtC);
    acc.ch4Life = life;
    st.flux = acc;
    return st;
  }
  return { DEFAULTS: DEFAULTS, params: params, cexFromPco2: cexFromPco2, pco2FromCex: pco2FromCex,
           initState: initState, step: step, ch4Lifetime: ch4Lifetime };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CARBON;
