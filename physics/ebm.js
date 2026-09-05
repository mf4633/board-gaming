// physics/ebm.js — Energy-balance climate on the sphere (Budyko / Sellers / North).
//
// Governing equation, per tile, T = sea-level-equivalent surface temperature (degC):
//
//     C dT/dt = ASR - OLR + geo + D_phys * lap(T)
//
//   ASR  = S(lat) * (1 - alpha_p)            absorbed shortwave, W/m^2
//   S    = annual-mean insolation from the true daily-mean formula
//          integrated over one orbit at the given obliquity (S0/4 global mean)
//   alpha_p = planetary albedo from surface albedo through a reflecting
//          atmosphere (single-layer two-stream):
//              alpha_p = a + (1-a)^2 * as / (1 - a*as),   a = albAtm
//   OLR  = A' + B*T                            Budyko linearization of sigma*T^4
//          with water-vapor and lapse-rate feedbacks folded into B
//          (Planck-only B would be ~3.3; 2.09 is the observed effective slope)
//   A'   = A - dF,   dF = 5.35 ln(CO2/280) + 0.036 (sqrt(CH4) - sqrt(700))
//          (Myhre et al. 1998 forcing fits; CH4 in ppb, logarithmic above 20 ppm)
//          Above the Simpson-Nakajima limit OLR flattens (runaway greenhouse),
//          rolling over smoothly from slope B to slope bHot at olrLim.
//   geo  = geothermal / internal heat flux, W/m^2
//   D_phys = D * R^2 with D the North (1975) diffusion coefficient in W/m^2/K
//          on the unit sphere, so the term is in W/m^2.
//   Surface T (what biomes, ice and life feel) = T - Gamma * max(0, h)
//          with the environmental lapse rate Gamma = 6.5 K/km.
//   Snow/sea-ice albedo feedback: as -> max(as, albSnow) with a smooth
//          switch of width snowWidth centred on snowT in surface temperature.
//
// Two integrators:
//   stepExplicit  — forward Euler with heat capacity C (ocean mixed layer vs
//                   land). Sub-steps to the diffusive stability limit. Used
//                   for tests and for a future seasonal/weather mode.
//   solve         — pseudo-transient Newton (implicit Euler with an adaptive
//                   step that grows to infinity as it converges) with a
//                   preconditioned conjugate-gradient inner solve. At the
//                   game's 100 kyr step the climate is always in equilibrium
//                   (C/B ~ 6 yr for ocean), so this is the workhorse; one or
//                   two outer iterations per step track slowly varying
//                   forcing, a dozen converge a fresh world.
var EBM = (function () {
  var DEFAULTS = {
    S0: 1361.0,         // W/m^2, solar constant at 1 AU (SORCE/TSI composite)
    A: 203.3,           // W/m^2   Budyko OLR intercept at 280 ppm CO2
    B: 2.09,            // W/m^2/K Budyko OLR slope
    D: 0.55,            // W/m^2/K North diffusion coefficient (unit sphere)
    R: 6.371e6,         // m
    obliquity: 0.4091,  // rad, 23.44 deg
    co2: 280, ch4: 700, // ppm, ppb
    co2Ref: 280, ch4Ref: 700,
    albAtm: 0.22,       // atmospheric reflectance (clouds + Rayleigh); gives Bond albedo 0.30 and 14.6 degC for modern Earth
    albSnow: 0.55,      // annual-mean surface albedo of snow / sea ice (planetary ~0.62, North 1975)
    snowT: -10.0,       // degC, centre of the snow switch: North (1975) ice line, annual-mean surface T
    snowWidth: 5.0,     // K, width of the switch
    lapse: 6.5e-3,      // K/m
    geo: 0.0,           // W/m^2 internal heat flux (Earth ~0.09)
    olrLim: 282.0,      // W/m^2 Simpson-Nakajima OLR limit (Goldblatt et al. 2013)
    bHot: 0.20,         // W/m^2/K residual slope above the limit (1.5x sun -> ~400 degC, Venus-like)
    olrSmooth: 4.0,     // W/m^2 width of the roll-over into the runaway branch
    cOcean: 4.0e8,      // J/m^2/K  ~100 m mixed layer
    cLand: 1.0e7        // J/m^2/K  ~ few m of soil/rock
  };

  function params(p) {
    var out = {};
    for (var k in DEFAULTS) out[k] = (p && p[k] != null) ? p[k] : DEFAULTS[k];
    return out;
  }

  // ---- Insolation ----
  // Daily-mean insolation on a horizontal surface at latitude lat (rad) for
  // solar declination dec (rad), circular orbit, top of atmosphere:
  //   Q = (S0/pi) (h0 sin lat sin dec + cos lat cos dec sin h0)
  //   h0 = half-day length = acos(-tan lat tan dec), clamped for polar day/night.
  function dailyMean(lat, dec, S0) {
    var x = -Math.tan(lat) * Math.tan(dec);
    var h0;
    if (x >= 1) return 0;                 // polar night
    else if (x <= -1) h0 = Math.PI;       // polar day
    else h0 = Math.acos(x);
    return (S0 / Math.PI) * (h0 * Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.sin(h0));
  }
  // Annual mean at obliquity eps: dec = asin(sin eps sin lambda), lambda the
  // solar longitude, averaged over a full orbit (circular, so equal weight).
  function annualMean(lat, eps, S0, nSamp) {
    nSamp = nSamp || 48;
    var s = 0;
    for (var k = 0; k < nSamp; k++) {
      var lambda = (k + 0.5) / nSamp * 2 * Math.PI;
      var dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
      s += dailyMean(lat, dec, S0);
    }
    return s / nSamp;
  }
  // North's Legendre fit for eps = 23.44 deg: S(x) = (S0/4)(1 - 0.482 P2(x)).
  function legendreMean(lat, S0) {
    var x = Math.sin(lat);
    return (S0 / 4) * (1 - 0.482 * 0.5 * (3 * x * x - 1));
  }

  // ---- Radiation pieces ----
  // CH4: Myhre's square-root fit up to 20 ppm, then logarithmic (the band
  // saturates; Byrne & Goldblatt 2014 give ~+17 W/m^2 at 1000 ppm, this gives ~+21).
  function forcing(p) {
    var f = 5.35 * Math.log(Math.max(1e-3, p.co2) / p.co2Ref);
    var m = Math.max(0, p.ch4), m1 = 20000;
    if (m <= m1) f += 0.036 * (Math.sqrt(m) - Math.sqrt(p.ch4Ref));
    else f += 0.036 * (Math.sqrt(m1) - Math.sqrt(p.ch4Ref)) + 4.0 * Math.log(m / m1);
    return f;
  }
  function planetaryAlbedo(as, a) {
    var t = 1 - a;
    return a + t * t * as / (1 - a * as);
  }
  function snowFrac(Tsurf, p) {
    // logistic switch: 1 = full snow, 0 = bare
    return 1 / (1 + Math.exp((Tsurf - p.snowT) / (p.snowWidth / 4)));
  }
  // OLR with a smooth roll-over to the runaway branch. Below the limit it is
  // the Budyko line A' + B T; far above it the slope is bHot. The blend is a
  // softplus of width olrSmooth (W/m^2) so the derivative is continuous:
  // a hard kink makes Newton oscillate across it.
  function olr(T, Aeff, p) {
    var lin = Aeff + p.B * T;
    if (!(p.B > 0)) return lin;
    var x = (lin - p.olrLim) / p.olrSmooth;
    var sp = x > 30 ? x : Math.log(1 + Math.exp(x));
    return lin - (1 - p.bHot / p.B) * p.olrSmooth * sp;
  }
  function dOlr(T, Aeff, p) {
    if (!(p.B > 0)) return p.B;
    var lin = Aeff + p.B * T;
    var x = (lin - p.olrLim) / p.olrSmooth;
    var sig = x > 30 ? 1 : (x < -30 ? 0 : 1 / (1 + Math.exp(-x)));
    return p.B * (1 - (1 - p.bHot / p.B) * sig);
  }

  // ---- Field allocation ----
  // fields: { T (sea-level T, degC), Tsurf, elev (m above sea level; <=0 ocean),
  //           albSurf (bare surface albedo), isOcean (Uint8),
  //           S (insolation cache), alb (planetary), asr, olr, snow }
  function allocFields(n) {
    return {
      T: new Float32Array(n), Tsurf: new Float32Array(n), elev: new Float32Array(n),
      albSurf: new Float32Array(n), isOcean: new Uint8Array(n),
      S: new Float32Array(n), alb: new Float32Array(n),
      asr: new Float32Array(n), olr: new Float32Array(n), snow: new Float32Array(n),
      _obliq: NaN, _S0: NaN
    };
  }
  function ensureInsolation(G, F, p) {
    if (F._obliq === p.obliquity && F._S0 === p.S0) return;
    // cache by latitude band: many tiles share a latitude to 5e-5 rad
    var cache = new Map();
    for (var i = 0; i < G.n; i++) {
      var key = Math.round(G.lat[i] * 2e4);
      var v = cache.get(key);
      if (v === undefined) { v = annualMean(G.lat[i], p.obliquity, p.S0); cache.set(key, v); }
      F.S[i] = v;
    }
    F._obliq = p.obliquity; F._S0 = p.S0;
  }

  // Per-tile shortwave + surface temperature diagnostics from current T.
  function radiate(G, F, p) {
    var Aeff = p.A - forcing(p);
    for (var i = 0; i < G.n; i++) {
      var h = F.elev[i] > 0 ? F.elev[i] : 0;
      var Ts = F.T[i] - p.lapse * h;
      F.Tsurf[i] = Ts;
      var sf = snowFrac(Ts, p);
      F.snow[i] = sf;
      var as = F.albSurf[i] + (Math.max(F.albSurf[i], p.albSnow) - F.albSurf[i]) * sf;
      var ap = planetaryAlbedo(as, p.albAtm);
      F.alb[i] = ap;
      F.asr[i] = F.S[i] * (1 - ap);
      F.olr[i] = olr(F.T[i], Aeff, p);
    }
    return Aeff;
  }

  // g = dASR/dT at a tile (>= 0): chain rule through the snow switch and the
  // two-stream atmosphere. Warming melts snow, the surface darkens, more
  // sunlight is absorbed: a positive feedback. At the snow line g reaches
  // ~20 W/m^2/K, ten times the OLR slope B, which is why a fixed-albedo Picard sweep cannot
  // converge there: the local gain exceeds one and the iteration limit-cycles.
  // Folding the derivative into the update (a damped Newton step) restores
  // monotone convergence without changing the fixed point.
  function dAsrDT(i, F, p) {
    var sf = F.snow[i];
    var dSnow = -sf * (1 - sf) / (p.snowWidth / 4);                 // d(snow)/dT
    var dAs = Math.max(F.albSurf[i], p.albSnow) - F.albSurf[i];     // d(alpha_s)/d(snow)
    var as = F.albSurf[i] + dAs * sf;
    var t = 1 - p.albAtm;
    var dAp = t * t / ((1 - p.albAtm * as) * (1 - p.albAtm * as));  // d(alpha_p)/d(alpha_s)
    return -F.S[i] * dAp * dAs * dSnow;                             // >= 0
  }

  // ---- Steady-state solver: pseudo-transient Newton with preconditioned CG ----
  //
  // Why not Gauss-Seidel / SOR: at this resolution the diffusion coupling
  // Dp*sumW/area is ~1000x the radiative stiffness B. Point relaxation damps
  // tile-scale error in a few sweeps but the planet-scale modes (global mean,
  // pole-to-equator gradient) decay by only ~1/1000 per sweep. CG's
  // polynomial acceleration converges all modes in ~sqrt(condition number)
  // iterations.
  //
  // Why pseudo-transient: the snow-albedo feedback makes a tile's own
  // radiative slope b - g negative inside the snow-line band (the small-ice-cap
  // instability), so the true Jacobian can be indefinite and plain Newton has
  // no descent direction there. Instead of solving J dT = R we take an
  // implicit Euler step of the real heat equation,
  //     (C/dt + J) dT = R,        C = ocean / land heat capacity,
  // with dt adapted by switched evolution relaxation: dt grows as the residual
  // falls (dt -> infinity recovers Newton, quadratic convergence) and shrinks
  // when a step fails or CG meets negative curvature. Small dt makes the
  // matrix SPD and follows the physical trajectory into or out of a snowball.
  //
  // Residual, multiplied by tile area so the system is symmetric:
  //   R_i = area_i (ASR_i - OLR_i + geo) + Dp * sum_j w_ij (T_j - T_i)   [W]
  //   J   = diag(area_i (b_i - g_i) + Dp sumW_i) - Dp w_ij               (symmetric)
  //   b_i = dOLR/dT, g_i = dASR/dT (snow feedback, >= 0).
  function cgBuffers(F, n) {
    var c = F._cg;
    if (c && c.r.length === n) return c;
    c = F._cg = { r: new Float64Array(n), z: new Float64Array(n), p: new Float64Array(n),
                  Ap: new Float64Array(n), diag: new Float64Array(n), x: new Float64Array(n),
                  Tp: new Float64Array(n), st: new Float64Array(n), rhs: new Float64Array(n),
                  slopeRaw: new Float64Array(n), sumW: new Float64Array(n) };
    return c;
  }
  function solve(G, F, pIn, opts) {
    var p = params(pIn);
    opts = opts || {};
    var newton = opts.newton || 40;    // cheap when converged (early exit)
    var cgIters = opts.cgIters || 300;
    var tol = opts.tol || 0.01;         // W/m^2 max residual for early exit
    var cgTol = opts.cgTol || 1e-4;     // relative residual for the inner solve (inexact Newton)
    var budgetMs = opts.budgetMs || 0;  // wall-clock budget between iterations (0 = none)
    var dt = opts.dt0 || 1e13;          // s; ~300 kyr, effectively Newton unless trouble forces it down
    var clock = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };
    var tStart = clock();
    ensureInsolation(G, F, p);
    var Dp = p.D * p.R * p.R;
    var n = G.n, T = F.T, area = G.area, ns = G.nbStart, ni = G.nbIdx, nw = G.nbW;
    var c = cgBuffers(F, n);
    var r = c.r, z = c.z, pv = c.p, Ap = c.Ap, diag = c.diag, x = c.x, Tp = c.Tp, st = c.st,
        rhs = c.rhs, slopeRaw = c.slopeRaw, sumWv = c.sumW;
    var maxRes = Infinity, outer = 0, totalCg = 0, rms2 = 0;
    // Residual vector + Jacobian slope at the current T. Returns max |res| in
    // W/m^2; leaves the area-weighted mean-square residual in rms2 (the norm
    // CG reduces, so it is what step acceptance judges).
    function assemble() {
      var Aeff = radiate(G, F, p), m = 0, ss = 0;
      for (var i = 0; i < n; i++) {
        var sumW = 0, lap = 0;
        for (var q = ns[i]; q < ns[i + 1]; q++) { sumW += nw[q]; lap += nw[q] * (T[ni[q]] - T[i]); }
        var res = F.asr[i] - F.olr[i] + p.geo + Dp * lap / area[i];
        if (Math.abs(res) > m) m = Math.abs(res);
        ss += res * res * area[i];
        rhs[i] = res * area[i];
        slopeRaw[i] = dOlr(T[i], Aeff, p) - dAsrDT(i, F, p);
        sumWv[i] = sumW;
      }
      rms2 = ss / G.totalArea;
      return m;
    }
    function setDiag(dtNow) {
      for (var i = 0; i < n; i++) {
        var C = F.isOcean[i] ? p.cOcean : p.cLand;
        diag[i] = area[i] * (slopeRaw[i] + C / dtNow) + Dp * sumWv[i];
      }
    }
    // Jacobi-preconditioned CG on (C/dt + J) x = rhs. Returns true if a
    // direction of non-positive curvature was met (matrix not SPD at this dt).
    var cgTruncated = false;
    function cg() {
      var rz = 0, r0 = 0, indefinite = false;
      cgTruncated = true;
      for (var i = 0; i < n; i++) { r[i] = rhs[i]; x[i] = 0; z[i] = r[i] / diag[i]; pv[i] = z[i]; rz += r[i] * z[i]; r0 += r[i] * r[i]; }
      var stop = cgTol * cgTol * r0;
      for (var k = 0; k < cgIters; k++) {
        var pAp = 0;
        for (var i = 0; i < n; i++) {
          var s = diag[i] * pv[i];
          for (var q = ns[i]; q < ns[i + 1]; q++) s -= Dp * nw[q] * pv[ni[q]];
          Ap[i] = s; pAp += pv[i] * s;
        }
        if (!(pAp > 0)) { indefinite = true; break; }
        var alpha = rz / pAp;
        var rr = 0;
        for (var i = 0; i < n; i++) { x[i] += alpha * pv[i]; r[i] -= alpha * Ap[i]; rr += r[i] * r[i]; }
        totalCg++;
        if (rr < stop) { cgTruncated = false; break; }
        var rzNew = 0;
        for (var i = 0; i < n; i++) { z[i] = r[i] / diag[i]; rzNew += r[i] * z[i]; }
        var beta = rzNew / rz; rz = rzNew;
        for (var i = 0; i < n; i++) pv[i] = z[i] + beta * pv[i];
      }
      return indefinite;
    }
    // Trust region on the temperature change per iteration: no tile may jump
    // across the snow band in one step, because the linearization is only
    // valid over about half the switch width there. A tile inside the band
    // moves at most capNear; a tile outside may move up to the band edge, so
    // far from the snow line (runaway branch, deep snowball) steps are free
    // and Newton's quadratic convergence is untouched. No residual line
    // search: with positive feedback in the band a tile that is heating melts
    // snow and heats faster, so its residual rises before it falls. That is
    // the physics, and the implicit step simply follows it.
    var capNear = opts.maxStep || Math.max(2.5, p.snowWidth * 0.5);
    var converged = false, minDt = 1e4;   // s; below ~3 hours something is badly wrong
    for (var it = 0; it < newton; it++) {
      maxRes = assemble();
      if (maxRes < tol) { converged = true; break; }
      if (budgetMs > 0 && it > 0 && clock() - tStart > budgetMs) break;
      outer = it + 1;
      var before = rms2;
      setDiag(dt);
      // shrink dt until the matrix is SPD (rare: a wide band of tiles on the snow line)
      for (var tries = 0; tries < 10 && cg(); tries++) { if (dt <= minDt) break; dt *= 0.1; setDiag(dt); }
      // A truncated inner solve leaves unconverged (jagged) modes in x; take
      // half of such a step so the next iteration can clean it up instead of
      // injecting a large high-frequency residual.
      var scale = cgTruncated ? 0.5 : 1;
      for (var i = 0; i < n; i++) {
        var d = x[i] * scale;
        var dist = Math.abs(F.Tsurf[i] - p.snowT) - p.snowWidth;
        var cap = dist > capNear ? dist : capNear;
        if (d > cap) d = cap; else if (d < -cap) d = -cap;
        T[i] += d;
      }
      // switched evolution relaxation: dt follows the residual reduction, both ways
      assemble();
      var growth = Math.sqrt(before / Math.max(rms2, 1e-30));
      dt = Math.min(1e15, Math.max(minDt, dt * Math.max(0.3, Math.min(10, growth))));
    }
    if (!converged) maxRes = assemble();
    return { newton: outer, cgIters: totalCg, maxResidual: maxRes, dt: dt, diagnostics: diagnostics(G, F, p) };
  }

  // ---- Explicit integrator (heat-capacity form) ----
  function stepExplicit(G, F, pIn, dtSeconds, opts) {
    var p = params(pIn);
    opts = opts || {};
    ensureInsolation(G, F, p);
    var Dp = p.D * p.R * p.R;
    var n = G.n, T = F.T, area = G.area, ns = G.nbStart, ni = G.nbIdx, nw = G.nbW;
    // stability: dt < C_i / (B + Dp * sumW_i / area_i) for every tile (with margin)
    var dtMax = Infinity;
    for (var i = 0; i < n; i++) {
      var sumW = 0;
      for (var q = ns[i]; q < ns[i + 1]; q++) sumW += nw[q];
      var C = F.isOcean[i] ? p.cOcean : p.cLand;
      var lim = 0.5 * C / (p.B + Dp * sumW / area[i]);
      if (lim < dtMax) dtMax = lim;
    }
    var nSub = Math.max(1, Math.ceil(dtSeconds / dtMax));
    if (opts.maxSub && nSub > opts.maxSub) nSub = opts.maxSub;
    var dt = dtSeconds / nSub;
    var dT = new Float64Array(n);
    for (var s = 0; s < nSub; s++) {
      radiate(G, F, p);
      for (var i = 0; i < n; i++) {
        var lap = 0;
        for (var q = ns[i]; q < ns[i + 1]; q++) lap += nw[q] * (T[ni[q]] - T[i]);
        var C = F.isOcean[i] ? p.cOcean : p.cLand;
        dT[i] = dt * (F.asr[i] - F.olr[i] + p.geo + Dp * lap / area[i]) / C;
      }
      for (var i = 0; i < n; i++) T[i] += dT[i];
    }
    radiate(G, F, p);
    return { subSteps: nSub, dtSub: dt, diagnostics: diagnostics(G, F, p) };
  }

  // Total heat content, J (for conservation tests).
  function heatContent(G, F, pIn) {
    var p = params(pIn);
    var s = 0;
    for (var i = 0; i < G.n; i++) s += (F.isOcean[i] ? p.cOcean : p.cLand) * F.T[i] * G.area[i];
    return s;
  }

  function diagnostics(G, F, p) {
    var n = G.n, A = G.area, tot = G.totalArea;
    var t = 0, ts = 0, asr = 0, ol = 0, al = 0, sn = 0, sIn = 0;
    for (var i = 0; i < n; i++) {
      t += F.T[i] * A[i]; ts += F.Tsurf[i] * A[i];
      asr += F.asr[i] * A[i]; ol += F.olr[i] * A[i];
      al += F.alb[i] * A[i]; sn += F.snow[i] * A[i]; sIn += F.S[i] * A[i];
    }
    return {
      meanT: t / tot, meanTsurf: ts / tot,
      meanASR: asr / tot, meanOLR: ol / tot, meanS: sIn / tot,
      imbalance: (asr - ol) / tot + p.geo,     // W/m^2, ~0 at equilibrium
      meanAlbedo: al / tot, snowFrac: sn / tot,
      forcing: forcing(p)
    };
  }

  return {
    DEFAULTS: DEFAULTS, params: params,
    dailyMean: dailyMean, annualMean: annualMean, legendreMean: legendreMean,
    forcing: forcing, planetaryAlbedo: planetaryAlbedo, olr: olr, snowFrac: snowFrac,
    allocFields: allocFields, ensureInsolation: ensureInsolation, radiate: radiate,
    solve: solve, stepExplicit: stepExplicit, heatContent: heatContent, diagnostics: diagnostics
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = EBM;
