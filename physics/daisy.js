// physics/daisy.js — Daisyworld (Watson & Lovelock 1983).
//
// Two daisy species share bare ground of albedo A_g. Each grows where its own
// local temperature is near 22.5 degC and dies back elsewhere:
//
//   beta(T)   = max(0, 1 - k (T_opt - T)^2),   k = 0.003265 /K^2, T_opt = 22.5 degC
//   T_i       = T_e + q (A_p - A_i)             local temperature of cover i
//   da_i/dt   = a_i (x beta(T_i) - gamma),      x = 1 - a_b - a_w (bare fraction)
//   A_p       = x A_g + a_b A_b + a_w A_w        planetary (surface) albedo
//
// q sets how much a patch's own albedo shifts its temperature from the
// effective temperature T_e (q = 20 K in the original; q = 0 makes daisies
// feel only the mean climate and regulation vanishes). gamma is the death
// rate, 0.3 per season. Black daisies (A_b = 0.25) warm themselves and the
// planet when it is cold; white daisies (A_w = 0.75) cool it when hot. The
// pair holds T_e near T_opt across a wide range of stellar luminosity and then
// collapses abruptly: Lovelock's demonstration that life can regulate a
// planet without intending to.
//
// This kernel owns the biology only. The game hands it the tile temperature
// from the energy-balance solver and takes back the surface albedo.
var DAISY = (function () {
  var DEFAULTS = {
    k: 0.003265, tOpt: 22.5, q: 20.0, gamma: 0.3,
    albGround: 0.50, albBlack: 0.25, albWhite: 0.75,
    seed: 0.01           // minimum viable cover, so a species can always recover
  };
  function params(p) { var o = {}; for (var k in DEFAULTS) o[k] = (p && p[k] != null) ? p[k] : DEFAULTS[k]; return o; }
  function beta(T, p) { var d = p.tOpt - T; var b = 1 - p.k * d * d; return b > 0 ? b : 0; }
  function albedo(ab, aw, p) { var x = 1 - ab - aw; return x * p.albGround + ab * p.albBlack + aw * p.albWhite; }

  // One time step (dt in seasons/years) for a patch with effective temperature Te.
  // Returns [ab, aw]. Sub-steps so the logistic terms stay stable for dt up to ~10.
  function step(ab, aw, Te, dt, pIn) {
    var p = params(pIn);
    var n = Math.max(1, Math.ceil(dt / 0.5));
    var h = dt / n;
    for (var s = 0; s < n; s++) {
      var Ap = albedo(ab, aw, p);
      var x = 1 - ab - aw;
      var Tb = Te + p.q * (Ap - p.albBlack);
      var Tw = Te + p.q * (Ap - p.albWhite);
      var db = ab * (x * beta(Tb, p) - p.gamma);
      var dw = aw * (x * beta(Tw, p) - p.gamma);
      ab += db * h; aw += dw * h;
      if (ab < p.seed) ab = p.seed;
      if (aw < p.seed) aw = p.seed;
      if (ab + aw > 1) { var f = 1 / (ab + aw); ab *= f; aw *= f; }
    }
    return [ab, aw];
  }

  // Zero-dimensional Daisyworld for tests and the report: the planet's
  // effective temperature from a grey-body balance, S L (1 - A_p) = sigma T^4.
  function equilibrate(L, ab, aw, pIn, opts) {
    var p = params(pIn);
    opts = opts || {};
    var S = opts.S || 917;                    // W/m^2, Watson & Lovelock's flux
    var sigma = 5.670374419e-8;
    var years = opts.years || 200, dt = 0.5;
    var Te = 0;
    for (var t = 0; t < years; t += dt) {
      var Ap = albedo(ab, aw, p);
      Te = Math.pow(S * L * (1 - Ap) / sigma, 0.25) - 273.15;
      var r = step(ab, aw, Te, dt, p);
      ab = r[0]; aw = r[1];
    }
    return { Te: Te, ab: ab, aw: aw, albedo: albedo(ab, aw, p),
             Tbare: Math.pow(S * L * (1 - p.albGround) / sigma, 0.25) - 273.15 };
  }

  return { DEFAULTS: DEFAULTS, params: params, beta: beta, albedo: albedo, step: step, equilibrate: equilibrate };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DAISY;
