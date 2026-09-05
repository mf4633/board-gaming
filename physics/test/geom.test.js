// node --test physics/test
var test = require('node:test');
var assert = require('node:assert');
var M = require('../mesh.js');
var Gm = require('../geom.js');

function mesh(N) {
  var s = M.subdivide(N);
  return M.buildTiles(s.verts, s.faces);
}

test('goldberg mesh: 10N^2+2 tiles, exactly 12 pentagons', function () {
  var tiles = mesh(8);
  assert.strictEqual(tiles.length, 10 * 64 + 2);
  var pent = 0;
  for (var i = 0; i < tiles.length; i++) if (tiles[i].verts.length === 5) pent++;
  assert.strictEqual(pent, 12);
});

test('tile areas sum to 4 pi R^2', function () {
  [4, 8, 32].forEach(function (N) {
    var G = Gm.buildGeom(mesh(N), 6.371e6);
    var exact = 4 * Math.PI * G.R * G.R;
    assert.ok(Math.abs(G.totalArea / exact - 1) < 1e-9, 'N=' + N + ' rel err ' + (G.totalArea / exact - 1));
    for (var i = 0; i < G.n; i++) assert.ok(G.area[i] > 0);
  });
});

test('edge weights are symmetric and positive', function () {
  var G = Gm.buildGeom(mesh(8));
  for (var i = 0; i < G.n; i++) {
    for (var p = G.nbStart[i]; p < G.nbStart[i + 1]; p++) {
      var j = G.nbIdx[p];
      assert.ok(G.nbW[p] > 0);
      var found = false;
      for (var q = G.nbStart[j]; q < G.nbStart[j + 1]; q++) {
        if (G.nbIdx[q] === i) { assert.strictEqual(G.nbW[q], G.nbW[p]); found = true; }
      }
      assert.ok(found);
    }
  }
});

function laplacian(G, T) {
  var out = new Float64Array(G.n);
  for (var i = 0; i < G.n; i++) {
    var s = 0;
    for (var p = G.nbStart[i]; p < G.nbStart[i + 1]; p++) s += G.nbW[p] * (T[G.nbIdx[p]] - T[i]);
    out[i] = s / G.area[i];
  }
  return out;
}

test('discrete Laplacian conserves: area-weighted sum is zero for any field', function () {
  var G = Gm.buildGeom(mesh(16));
  var T = new Float64Array(G.n);
  var seed = 12345;
  for (var i = 0; i < G.n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; T[i] = 100 * seed / 0x7fffffff; }
  var L = laplacian(G, T);
  var sum = 0, mag = 0;
  for (var i = 0; i < G.n; i++) { sum += L[i] * G.area[i]; mag += Math.abs(L[i]) * G.area[i]; }
  assert.ok(Math.abs(sum) / mag < 1e-10, 'relative leak ' + Math.abs(sum) / mag);
  // constant field -> zero
  var C = new Float64Array(G.n).fill(7);
  var LC = laplacian(G, C);
  for (var i = 0; i < G.n; i++) assert.ok(Math.abs(LC[i]) < 1e-30);
});

test('discrete Laplacian of sin(lat) approximates -2 sin(lat) / R^2', function () {
  // Y_1^0 is an eigenfunction of the sphere Laplacian with eigenvalue -l(l+1)/R^2 = -2/R^2
  var G = Gm.buildGeom(mesh(32));
  var T = new Float64Array(G.n);
  for (var i = 0; i < G.n; i++) T[i] = Math.sin(G.lat[i]);
  var L = laplacian(G, T);
  var num = 0, den = 0;
  for (var i = 0; i < G.n; i++) {
    var exact = -2 * Math.sin(G.lat[i]) / (G.R * G.R);
    num += (L[i] - exact) * (L[i] - exact) * G.area[i];
    den += exact * exact * G.area[i];
  }
  var rmsRel = Math.sqrt(num / den);
  assert.ok(rmsRel < 0.01, 'RMS relative error ' + rmsRel);
});
