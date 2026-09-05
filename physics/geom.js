// physics/geom.js — spherical finite-volume geometry for a Goldberg tile mesh.
//
// Every kernel that needs a Laplacian, a flux across an edge, or an
// area-weighted global mean reads this structure instead of re-deriving it.
//
//   G = buildGeom(tiles, R)     (uses tiles[i].dualVerts, the Voronoi ring of
//                                triangle circumcenters, so center-to-center
//                                segments cross cell edges orthogonally)
//     G.n         tile count
//     G.R         planet radius (m)
//     G.area[i]   tile area (m^2), spherical polygon area, sums to 4 pi R^2
//     G.nbStart   CSR row pointer (Int32Array n+1)
//     G.nbIdx     CSR neighbor index
//     G.nbW       CSR edge weight  w_ij = l_ij / d_ij (dimensionless):
//                 shared-edge arc length over center-to-center arc length.
//                 Symmetrized so that w_ij === w_ji exactly, which is what
//                 makes the discrete Laplacian conservative.
//     G.lat[i]    latitude (rad)
//
// Discrete Laplacian (finite volume, Voronoi-like dual):
//     (lap T)_i = (1/area_i) * sum_j w_ij * (T_j - T_i)         [1/m^2 * T]
// Summed over the closed sphere with area weights this is identically zero.
var BBV = (typeof module !== 'undefined' && module.exports) ? require('./vec.js') : null;
if (BBV) { var vDot=BBV.vDot, vCross=BBV.vCross, vLen=BBV.vLen, clamp=BBV.clamp; }

// Great-circle arc between two unit vectors (rad). atan2 form is accurate
// for both tiny and near-antipodal separations, unlike acos(dot).
function arcLen(a, b) {
  return Math.atan2(vLen(vCross(a, b)), vDot(a, b));
}

// Solid angle of the spherical triangle (a,b,c) on the unit sphere
// (Van Oosterom & Strackee 1983). Signed; orientation-consistent fans give
// one sign throughout.
function triSolidAngle(a, b, c) {
  var num = vDot(a, vCross(b, c));
  var den = 1 + vDot(a, b) + vDot(b, c) + vDot(c, a);
  return 2 * Math.atan2(num, den);
}

function buildGeom(tiles, R) {
  R = R || 6.371e6;
  var n = tiles.length;
  var area = new Float64Array(n);
  var lat = new Float64Array(n);
  var deg = new Int32Array(n);
  for (var i = 0; i < n; i++) {
    var t = tiles[i];
    var poly = t.dualVerts || t.verts, L = poly.length;
    var sa = 0;
    for (var k = 0; k < L; k++) sa += triSolidAngle(t.center, poly[k], poly[(k + 1) % L]);
    area[i] = Math.abs(sa) * R * R;
    lat[i] = t.lat;
    deg[i] = L;
  }
  var nbStart = new Int32Array(n + 1);
  for (var i = 0; i < n; i++) nbStart[i + 1] = nbStart[i] + deg[i];
  var nbIdx = new Int32Array(nbStart[n]);
  var nbW = new Float64Array(nbStart[n]);
  // First pass: each tile's own estimate of w for each of its edges.
  for (var i = 0; i < n; i++) {
    var t = tiles[i];
    var poly = t.dualVerts || t.verts, L = poly.length;
    for (var k = 0; k < L; k++) {
      var j = t.edgeNeighbor[k];
      var l = arcLen(poly[k], poly[(k + 1) % L]);
      var dcc = arcLen(t.center, tiles[j].center);
      nbIdx[nbStart[i] + k] = j;
      nbW[nbStart[i] + k] = l / dcc;
    }
  }
  // Second pass: symmetrize. Both tiles see the same two face centroids as
  // the edge endpoints, so the two estimates agree to rounding; averaging
  // makes them bit-identical, which keeps sum_i sum_j w_ij (T_j - T_i) == 0.
  for (var i = 0; i < n; i++) {
    for (var p = nbStart[i]; p < nbStart[i + 1]; p++) {
      var j = nbIdx[p];
      if (j < i) continue;
      var q = -1;
      for (var r = nbStart[j]; r < nbStart[j + 1]; r++) if (nbIdx[r] === i) { q = r; break; }
      if (q < 0) throw new Error('geom: asymmetric adjacency ' + i + '->' + j);
      var w = 0.5 * (nbW[p] + nbW[q]);
      nbW[p] = w; nbW[q] = w;
    }
  }
  var total = 0;
  for (var i = 0; i < n; i++) total += area[i];
  return { n: n, R: R, area: area, lat: lat, nbStart: nbStart, nbIdx: nbIdx, nbW: nbW, totalArea: total };
}

// Area-weighted global mean of a per-tile field.
function globalMean(G, f) {
  var s = 0;
  for (var i = 0; i < G.n; i++) s += f[i] * G.area[i];
  return s / G.totalArea;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildGeom: buildGeom, globalMean: globalMean, arcLen: arcLen, triSolidAngle: triSolidAngle };
}
