// node --test physics/test
var test = require('node:test');
var assert = require('node:assert');
var M = require('../mesh.js');
var Gm = require('../geom.js');
var HYDRO = require('../hydro.js');

// Earth-like test world: 30% land in a few blobs, one mountain range, T from latitude.
function world(N, opts) {
  opts = opts || {};
  var s = M.subdivide(N);
  var tiles = M.buildTiles(s.verts, s.faces);
  var G = Gm.buildGeom(tiles);
  var F = HYDRO.allocFields(G.n);
  for (var i = 0; i < G.n; i++) {
    var lat = G.lat[i], lon = tiles[i].lon;
    var land = opts.allOcean ? false : (Math.sin(2 * lon + 0.5) * Math.cos(1.5 * lat) > 0.45);
    F.isOcean[i] = land ? 0 : 1;
    F.elev[i] = land ? (opts.mountains && Math.abs(Math.sin(2 * lon + 0.5) - 0.8) < 0.08 ? 2500 : 300) : -3000;
    F.T[i] = 27 - 45 * Math.pow(Math.sin(lat), 2) - (land ? 0.0065 * F.elev[i] : 0);
    F.q[i] = 10; F.soil[i] = land ? 50 : 0;
  }
  // energy cap from a rough net-radiation shape: ~5 mm/day at the equator, ~1 near the poles
  F.emax = new Float32Array(G.n);
  for (var i = 0; i < G.n; i++) F.emax[i] = 1 + 4.5 * Math.cos(G.lat[i]);
  return { G: G, F: F, tiles: tiles, dx: Math.sqrt(G.totalArea / G.n) / 1000 };
}
function spinUp(w, steps, p) {
  var pp = Object.assign({ dxKm: w.dx }, p || {});
  for (var k = 0; k < steps; k++) HYDRO.step(w.tiles, w.G, w.F, pp);
  return HYDRO.diagnostics(w.G, w.F);
}
function zonal(w, f, lo, hi) {
  var s = 0, a = 0;
  for (var i = 0; i < w.G.n; i++) { var l = Math.abs(w.G.lat[i]) * 180 / Math.PI; if (l >= lo && l < hi) { s += f[i] * w.G.area[i]; a += w.G.area[i]; } }
  return s / a;
}

test('saturation column follows Clausius-Clapeyron: 25 mm at 15 C, ~55 mm at 27 C, ~5 mm at -10 C', function () {
  var p = HYDRO.params({});
  assert.ok(Math.abs(HYDRO.wsat(15, p) - 25) < 1e-9);
  assert.ok(HYDRO.wsat(27, p) > 50 && HYDRO.wsat(27, p) < 60, HYDRO.wsat(27, p));
  assert.ok(HYDRO.wsat(-10, p) > 4 && HYDRO.wsat(-10, p) < 6, HYDRO.wsat(-10, p));
});

test('water balance: global evaporation equals global precipitation at steady state (rivers close the land surplus)', function () {
  var w = world(12);
  var d = spinUp(w, 120);
  assert.ok(Math.abs(d.imbalance) < 0.03 * d.meanPrecip, 'E ' + d.meanEvap + ' P ' + d.meanPrecip);
  assert.ok(d.meanPrecip > 1.8 && d.meanPrecip < 4.0, 'global mean precip ' + d.meanPrecip + ' mm/day (Earth 2.7)');
  assert.ok(d.oceanRH > 0.5 && d.oceanRH < 0.95, 'ocean column RH ' + d.oceanRH);
  for (var i = 0; i < w.G.n; i++) {
    assert.ok(w.F.q[i] >= 0 && w.F.precip[i] >= 0 && w.F.evap[i] >= 0 && w.F.runoff[i] >= 0);
    assert.ok(w.F.rh[i] <= 1.0001, 'RH above saturation ' + w.F.rh[i]);
  }
});

test('zonal pattern: wet tropics, dry subtropics, wetter mid-latitude storm track', function () {
  var w = world(16);
  spinUp(w, 40);
  var itcz = zonal(w, w.F.precip, 0, 10), sub = zonal(w, w.F.precip, 20, 32), mid = zonal(w, w.F.precip, 45, 60);
  assert.ok(itcz > 1.3 * sub, 'ITCZ ' + itcz + ' vs subtropics ' + sub);
  assert.ok(mid > sub, 'mid-lat ' + mid + ' vs subtropics ' + sub);
});

test('orographic lift: a mountain range rains more on its windward side than flat land, and dries the lee', function () {
  var flat = world(16), mtn = world(16, { mountains: true });
  spinUp(flat, 40); spinUp(mtn, 40);
  var wind = 0, leeF = 0, leeM = 0, nW = 0, nL = 0;
  for (var i = 0; i < mtn.G.n; i++) {
    if (mtn.F.elev[i] === 2500) { wind += mtn.F.precip[i] - flat.F.precip[i]; nW++; }
  }
  // tiles immediately downwind of a mountain tile
  for (var i = 0; i < mtn.G.n; i++) {
    var up = mtn.tiles[i].upwind;
    if (!mtn.F.isOcean[i] && mtn.F.elev[i] === 300 && up >= 0 && mtn.F.elev[up] === 2500) { leeM += mtn.F.precip[i]; leeF += flat.F.precip[i]; nL++; }
  }
  assert.ok(nW > 0 && nL > 0);
  assert.ok(wind / nW > 0, 'mountain tiles should gain precip: ' + wind / nW);
  assert.ok(leeM < leeF, 'lee should be drier: ' + leeM / nL + ' vs flat ' + leeF / nL);
});

test('soil bucket: bounded, and land runoff equals land P - E at steady state', function () {
  var w = world(12);
  spinUp(w, 120);
  var pe = 0, ro = 0, a = 0;
  for (var i = 0; i < w.G.n; i++) {
    if (w.F.isOcean[i]) continue;
    assert.ok(w.F.soil[i] >= 0 && w.F.soil[i] <= HYDRO.DEFAULTS.soilCap + 40 * HYDRO.DEFAULTS.tauDrain, 'soil ' + w.F.soil[i]);
    pe += (w.F.precip[i] - w.F.evap[i]) * w.G.area[i]; ro += w.F.runoff[i] * w.G.area[i]; a += w.G.area[i];
  }
  assert.ok(Math.abs(ro - pe) / Math.max(1e-9, Math.abs(pe)) < 0.15, 'runoff ' + ro / a + ' vs P-E ' + pe / a);
  assert.ok(ro / a > 0.2, 'land runoff too small ' + ro / a + ' mm/day (Earth ~0.8)');
});

test('an all-ocean warm world holds more water and rains more than a cold one', function () {
  var warm = world(8, { allOcean: true }), cold = world(8, { allOcean: true });
  for (var i = 0; i < cold.G.n; i++) cold.F.T[i] -= 15;
  var dw = spinUp(warm, 40), dc = spinUp(cold, 40);
  assert.ok(dw.meanPrecip > 1.5 * dc.meanPrecip, 'warm ' + dw.meanPrecip + ' cold ' + dc.meanPrecip);
});
