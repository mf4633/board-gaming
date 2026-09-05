// node --test physics/test
var test = require('node:test');
var assert = require('node:assert');
var M = require('../mesh.js');
var Gm = require('../geom.js');
var EBM = require('../ebm.js');

function world(N, opts) {
  opts = opts || {};
  var s = M.subdivide(N);
  var tiles = M.buildTiles(s.verts, s.faces);
  var G = Gm.buildGeom(tiles);
  var F = EBM.allocFields(G.n);
  for (var i = 0; i < G.n; i++) {
    F.albSurf[i] = opts.albSurf != null ? opts.albSurf : 0.08;
    F.isOcean[i] = opts.ocean === false ? 0 : 1;
    F.T[i] = opts.T0 != null ? opts.T0 : 15;
  }
  return { G: G, F: F };
}
var NO_SNOW = { snowT: -1e6 };   // disables the albedo switch

// ---------- insolation ----------
test('daily-mean insolation: equator at equinox = S0/pi, polar night = 0', function () {
  var S0 = 1361;
  assert.ok(Math.abs(EBM.dailyMean(0, 0, S0) - S0 / Math.PI) < 1e-9);
  assert.strictEqual(EBM.dailyMean(80 * Math.PI / 180, -23.44 * Math.PI / 180, S0), 0);
  // polar day at the pole in summer: S0 sin(dec)
  var dec = 23.44 * Math.PI / 180;
  assert.ok(Math.abs(EBM.dailyMean(Math.PI / 2 - 1e-9, dec, S0) - S0 * Math.sin(dec)) < 1e-6);
});

test('annual-mean insolation at 23.44 deg matches the North P2 fit within 4% (the fit is itself a truncation)', function () {
  var S0 = 1361, eps = 23.44 * Math.PI / 180;
  [0, 20, 40, 60, 80].forEach(function (deg) {
    var lat = deg * Math.PI / 180;
    var a = EBM.annualMean(lat, eps, S0, 96), b = EBM.legendreMean(lat, S0);
    assert.ok(Math.abs(a / b - 1) < 0.04, deg + ' deg: ' + a + ' vs ' + b);
  });
});

test('global-mean insolation is S0/4 at any obliquity', function () {
  var w = world(16);
  [0, 0.4091, 1.0].forEach(function (eps) {
    var F = EBM.allocFields(w.G.n);
    EBM.ensureInsolation(w.G, F, EBM.params({ obliquity: eps }));
    var mean = Gm.globalMean(w.G, F.S);
    assert.ok(Math.abs(mean / (1361 / 4) - 1) < 2e-3, 'eps ' + eps + ': ' + mean);
  });
  // zero obliquity: pole gets nothing
  var F0 = EBM.allocFields(w.G.n);
  EBM.ensureInsolation(w.G, F0, EBM.params({ obliquity: 0 }));
  var minS = Infinity;
  for (var i = 0; i < w.G.n; i++) if (Math.abs(w.G.lat[i]) > 1.5 && F0.S[i] < minS) minS = F0.S[i];
  assert.ok(minS < 0.08 * 1361);
});

// ---------- radiation pieces ----------
test('CO2 doubling forcing = 3.71 W/m^2 (Myhre 1998)', function () {
  var f = EBM.forcing(EBM.params({ co2: 560 }));
  assert.ok(Math.abs(f - 3.708) < 0.01, f);
  assert.ok(Math.abs(EBM.forcing(EBM.params({}))) < 1e-12);
  // methane saturates: Archean hundreds of ppm give tens of W/m^2, not hundreds
  var f1000 = EBM.forcing(EBM.params({ ch4: 1e6 }));
  assert.ok(f1000 > 12 && f1000 < 30, '1000 ppm CH4 forcing ' + f1000);
  var below = EBM.forcing(EBM.params({ ch4: 19999 })), above = EBM.forcing(EBM.params({ ch4: 20001 }));
  assert.ok(Math.abs(above - below) < 0.01, 'continuous at the join');
});

test('planetary albedo: dark ocean ~0.30, snow ~0.65 through a 0.25 atmosphere', function () {
  assert.ok(Math.abs(EBM.planetaryAlbedo(0.08, 0.25) - 0.296) < 0.005);
  assert.ok(Math.abs(EBM.planetaryAlbedo(0.60, 0.25) - 0.647) < 0.005);
});

// ---------- steady-state solver ----------
test('uniform-albedo world: global mean T equals the analytic zero-dimensional answer', function () {
  // Diffusion integrates to zero and OLR is linear, so the area-weighted
  // mean must be exactly (mean ASR - A) / B regardless of the pattern.
  var w = world(16);
  var r = EBM.solve(w.G, w.F, NO_SNOW, { tol: 1e-3 });
  var d = r.diagnostics;
  var ap = EBM.planetaryAlbedo(0.08, EBM.DEFAULTS.albAtm);
  var analytic = ((1361 / 4) * (1 - ap) - 203.3) / 2.09;
  assert.ok(Math.abs(d.meanT - analytic) < 0.05, 'meanT ' + d.meanT + ' vs ' + analytic);
  assert.ok(Math.abs(d.imbalance) < 0.01, 'imbalance ' + d.imbalance);
  assert.ok(r.maxResidual < 2e-3, 'residual ' + r.maxResidual);
  // Earth-like: warm equator, cold poles, realistic gradient
  var eq = 0, po = 0, ne = 0, np = 0;
  for (var i = 0; i < w.G.n; i++) {
    if (Math.abs(w.G.lat[i]) < 0.15) { eq += w.F.T[i]; ne++; }
    if (Math.abs(w.G.lat[i]) > 1.40) { po += w.F.T[i]; np++; }
  }
  eq /= ne; po /= np;
  assert.ok(eq > 25 && eq < 35, 'equator ' + eq);
  assert.ok(po > -25 && po < 0, 'pole ' + po);   // ice-free EBM poles are mild; snow feedback is off here
});

test('D = 0: every tile sits at its own local radiative equilibrium', function () {
  var w = world(8);
  // olrLim raised: with no transport the tropics locally exceed the
  // Simpson-Nakajima limit (ASR ~285 W/m^2 > 282), which is physically right
  // but not what this test is checking.
  EBM.solve(w.G, w.F, { D: 0, snowT: -1e6, olrLim: 1e9 }, { tol: 1e-4 });
  for (var i = 0; i < w.G.n; i++) {
    var expect = (w.F.asr[i] - 203.3) / 2.09;
    assert.ok(Math.abs(w.F.T[i] - expect) < 1e-3, i + ': ' + w.F.T[i] + ' vs ' + expect);
  }
});

test('CO2 doubling warms a no-ice world by dF/B = 1.77 K', function () {
  var w = world(8);
  var t0 = EBM.solve(w.G, w.F, NO_SNOW, { tol: 1e-3 }).diagnostics.meanT;
  var t1 = EBM.solve(w.G, w.F, { co2: 560, snowT: -1e6 }, { tol: 1e-3 }).diagnostics.meanT;
  assert.ok(Math.abs((t1 - t0) - 3.708 / 2.09) < 0.02, 'dT ' + (t1 - t0));
});

test('lapse rate: surface T drops 6.5 K per km of elevation, ocean unaffected', function () {
  var w = world(8);
  w.F.elev[0] = 5000; w.F.isOcean[0] = 0;
  w.F.elev[1] = -3000;
  EBM.solve(w.G, w.F, NO_SNOW, { tol: 1e-3 });
  assert.ok(Math.abs((w.F.T[0] - w.F.Tsurf[0]) - 32.5) < 1e-4);
  assert.ok(Math.abs(w.F.T[1] - w.F.Tsurf[1]) < 1e-6);
});

test('ice-albedo feedback: snowball at low S0, hysteresis on the way back up', function () {
  var w = world(8);
  EBM.solve(w.G, w.F, {}, { tol: 1e-3 });
  var down = [], up = [];
  var S0s = [];
  for (var s = 1361; s >= 950; s -= 25) S0s.push(s);
  S0s.forEach(function (s) { down.push(EBM.solve(w.G, w.F, { S0: s }, { tol: 1e-3 }).diagnostics.snowFrac); });
  var snowball = down[down.length - 1];
  assert.ok(snowball > 0.95, 'no snowball at S0=950: snowFrac ' + snowball);
  assert.ok(down[0] < 0.3, 'modern Earth should be mostly snow-free: ' + down[0]);
  S0s.slice().reverse().forEach(function (s) { up.push(EBM.solve(w.G, w.F, { S0: s }, { tol: 1e-3 }).diagnostics.snowFrac); });
  up.reverse();  // align with down[]
  // somewhere in the middle the up-branch is still frozen while the down-branch was not
  var hyst = 0;
  for (var i = 0; i < down.length; i++) hyst = Math.max(hyst, up[i] - down[i]);
  assert.ok(hyst > 0.4, 'expected hysteresis, max branch gap ' + hyst + ' down=' + down.map(function (x) { return x.toFixed(2); }) + ' up=' + up.map(function (x) { return x.toFixed(2); }));
});

test('runaway greenhouse: 1.5x sun gives a very hot but finite, converged planet', function () {
  var w = world(8);
  var r = EBM.solve(w.G, w.F, { S0: 1361 * 1.5 }, { tol: 0.01 });
  assert.ok(isFinite(r.diagnostics.meanT));
  assert.ok(r.diagnostics.meanT > 80, 'meanT ' + r.diagnostics.meanT);
  assert.ok(r.diagnostics.meanOLR > 280, 'OLR should sit at the Simpson-Nakajima limit: ' + r.diagnostics.meanOLR);
  assert.ok(r.maxResidual < 0.01, 'residual ' + r.maxResidual + ' after ' + r.newton + ' newton');
});

test('Venus-like forcing that stays below the OLR limit converges to a hot linear-branch climate', function () {
  var w = world(8);
  var r = EBM.solve(w.G, w.F, { S0: 1361 * 1.109, co2: 25000, ch4: 200 }, { tol: 1e-3 });
  assert.ok(r.maxResidual < 1e-3, 'residual ' + r.maxResidual + ' after ' + r.newton + ' newton');
  assert.ok(r.diagnostics.meanT > 30 && r.diagnostics.meanT < 60, 'meanT ' + r.diagnostics.meanT);
});

test('OLR roll-over is continuous in value and slope', function () {
  var p = EBM.params({});
  var Aeff = p.A;
  var prev = null, prevD = null;
  for (var T = -50; T <= 400; T += 0.5) {
    var o = EBM.olr(T, Aeff, p);
    var d = (EBM.olr(T + 1e-3, Aeff, p) - EBM.olr(T - 1e-3, Aeff, p)) / 2e-3;
    if (prev !== null) {
      assert.ok(Math.abs(o - prev) < 1.2 * p.B * 0.5 + 1e-6, 'jump at ' + T);
      assert.ok(Math.abs(d - prevD) < 0.2, 'slope jump at ' + T + ': ' + prevD + ' -> ' + d);
    }
    prev = o; prevD = d;
  }
  assert.ok(Math.abs(EBM.olr(0, Aeff, p) - Aeff) < 0.01, 'far below the limit OLR is the Budyko line');
  var hi = 300;
  var dHi = (EBM.olr(hi + 1, Aeff, p) - EBM.olr(hi, Aeff, p));
  assert.ok(Math.abs(dHi - p.bHot) < 0.01, 'far above the limit the slope is bHot: ' + dHi);
});

test('snow feedback on, mixed land/ocean: solver converges below 0.05 W/m^2 from two different starts to the same answer', function () {
  function earthlike() {
    var w = world(16);
    for (var i = 0; i < w.G.n; i++) {
      var land = Math.sin(3 * Math.atan2(0, 1) + 5 * w.G.lat[i] + i * 0.37) > 0.3;
      w.F.isOcean[i] = land ? 0 : 1; w.F.albSurf[i] = land ? 0.22 : 0.08; w.F.elev[i] = land ? 600 : -3000;
      w.F.T[i] = 25 - 40 * Math.pow(Math.sin(w.G.lat[i]), 2);
    }
    return w;
  }
  var a = earthlike(), b = earthlike();
  for (var i = 0; i < b.G.n; i++) b.F.T[i] += 6;   // warm start on the same branch
  var ra = EBM.solve(a.G, a.F, {}, { tol: 0.05 });
  var rb = EBM.solve(b.G, b.F, {}, { tol: 0.05 });
  assert.ok(ra.maxResidual < 0.05, 'residual ' + ra.maxResidual + ' after ' + ra.newton + ' newton / ' + ra.cgIters + ' cg');
  assert.ok(rb.maxResidual < 0.05, 'residual ' + rb.maxResidual + ' after ' + rb.newton + ' newton / ' + rb.cgIters + ' cg');
  assert.ok(Math.abs(ra.diagnostics.meanT - rb.diagnostics.meanT) < 0.05, 'start-dependent answer: ' + ra.diagnostics.meanT + ' vs ' + rb.diagnostics.meanT);
  assert.ok(ra.newton <= 12 && ra.cgIters < 1500, 'too slow: ' + ra.newton + ' newton / ' + ra.cgIters + ' cg');
  assert.ok(ra.diagnostics.snowFrac < 0.4, 'snowFrac ' + ra.diagnostics.snowFrac);
  assert.ok(ra.diagnostics.meanTsurf > 8 && ra.diagnostics.meanTsurf < 20, 'meanTsurf ' + ra.diagnostics.meanTsurf);
});

// ---------- explicit integrator ----------
test('explicit step: pure diffusion conserves heat content to round-off and smooths the field', function () {
  var w = world(8);
  var p = { S0: 0, A: 0, B: 0, snowT: -1e6, geo: 0 };
  var seed = 7;
  for (var i = 0; i < w.G.n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; w.F.T[i] = -30 + 60 * seed / 0x7fffffff; }
  var H0 = EBM.heatContent(w.G, w.F, p);
  function variance() { var m = Gm.globalMean(w.G, w.F.T), v = 0; for (var i = 0; i < w.G.n; i++) v += (w.F.T[i] - m) * (w.F.T[i] - m) * w.G.area[i]; return v / w.G.totalArea; }
  var v0 = variance();
  var r = EBM.stepExplicit(w.G, w.F, p, 30 * 86400, { maxSub: 200 });
  var H1 = EBM.heatContent(w.G, w.F, p);
  assert.ok(Math.abs(H1 - H0) / Math.abs(H0) < 1e-6, 'heat leak ' + (H1 - H0) / H0 + ' over ' + r.subSteps + ' substeps');
  assert.ok(variance() < 0.5 * v0, 'variance did not fall: ' + v0 + ' -> ' + variance());
});

test('explicit step: heat content change equals integrated net radiation', function () {
  var w = world(8);
  var p = { snowT: -1e6 };
  for (var i = 0; i < w.G.n; i++) w.F.T[i] = 0;
  var H0 = EBM.heatContent(w.G, w.F, p);
  var dt = 86400;
  // integrate the flux ourselves with the same substepping so the comparison is exact
  var r = EBM.stepExplicit(w.G, w.F, p, dt, { maxSub: 50 });
  var H1 = EBM.heatContent(w.G, w.F, p);
  // net radiation after the step is a fair proxy for the mean over a 1-day step (T moves < 0.1 K)
  var net = 0;
  for (var i = 0; i < w.G.n; i++) net += (w.F.asr[i] - w.F.olr[i]) * w.G.area[i];
  assert.ok(Math.abs((H1 - H0) - net * dt) / Math.abs(net * dt) < 0.02, 'dH ' + (H1 - H0) + ' vs ' + net * dt);
});

test('explicit and steady solvers agree on the equilibrium', function () {
  var w1 = world(6), w2 = world(6);
  var p = { snowT: -1e6, cOcean: 1e6, cLand: 1e6 };   // tiny C so the explicit run converges fast
  var eq = EBM.solve(w1.G, w1.F, p, { tol: 1e-4 }).diagnostics.meanT;
  for (var k = 0; k < 40; k++) EBM.stepExplicit(w2.G, w2.F, p, 5e6, { maxSub: 400 });
  var ex = EBM.diagnostics(w2.G, w2.F, EBM.params(p)).meanT;
  assert.ok(Math.abs(eq - ex) < 0.1, 'steady ' + eq + ' explicit ' + ex);
});
