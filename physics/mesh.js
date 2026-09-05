// physics/mesh.js — Goldberg polyhedron (subdivided icosahedron dual).
// subdivide(N): geodesic vertices/faces. buildTiles(): one tile per vertex,
// polygon = ring of adjacent face centroids, edgeNeighbor[k] = tile across
// edge (verts[k] -> verts[k+1]). Also seeds a prescribed 3-cell wind field
// (to be replaced by the circulation kernel).
var BBV = (typeof module !== 'undefined' && module.exports) ? require('./vec.js') : null;
if (BBV) { var vSub=BBV.vSub, vScale=BBV.vScale, vDot=BBV.vDot, vCross=BBV.vCross, vLen=BBV.vLen, vNorm=BBV.vNorm, clamp=BBV.clamp; }
// ---------- Icosahedron ----------
var PHI = (1+Math.sqrt(5))/2;
var ICO_VERTS = [
  [-1, PHI, 0],[ 1, PHI, 0],[-1,-PHI, 0],[ 1,-PHI, 0],
  [ 0,-1, PHI],[ 0, 1, PHI],[ 0,-1,-PHI],[ 0, 1,-PHI],
  [ PHI, 0,-1],[ PHI, 0, 1],[-PHI, 0,-1],[-PHI, 0, 1]
].map(vNorm);
var ICO_FACES = [
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
  [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
  [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
];

function subdivide(N) {
  var verts = [];
  var faces = [];
  var keyMap = new Map();
  function add(v) {
    var n = vNorm(v);
    var key = Math.round(n[0]*1e6)+'_'+Math.round(n[1]*1e6)+'_'+Math.round(n[2]*1e6);
    var idx = keyMap.get(key);
    if (idx !== undefined) return idx;
    idx = verts.length;
    verts.push(n);
    keyMap.set(key, idx);
    return idx;
  }
  for (var fi = 0; fi < ICO_FACES.length; fi++) {
    var f = ICO_FACES[fi];
    var A = ICO_VERTS[f[0]], B = ICO_VERTS[f[1]], C = ICO_VERTS[f[2]];
    var grid = [];
    for (var i = 0; i <= N; i++) {
      grid[i] = [];
      for (var j = 0; j <= N - i; j++) {
        var k = N - i - j;
        grid[i][j] = add([(i*A[0]+j*B[0]+k*C[0])/N, (i*A[1]+j*B[1]+k*C[1])/N, (i*A[2]+j*B[2]+k*C[2])/N]);
      }
    }
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N - i; j++) {
        faces.push([grid[i][j], grid[i+1][j], grid[i][j+1]]);
        if (j < N - i - 1) faces.push([grid[i+1][j], grid[i+1][j+1], grid[i][j+1]]);
      }
    }
  }
  return { verts: verts, faces: faces };
}

function buildTiles(verts, faces) {
  var n = verts.length;
  var vertFaces = new Array(n);
  for (var i = 0; i < n; i++) vertFaces[i] = [];
  for (var fi = 0; fi < faces.length; fi++) {
    var f = faces[fi];
    vertFaces[f[0]].push(fi);
    vertFaces[f[1]].push(fi);
    vertFaces[f[2]].push(fi);
  }
  var faceCentroids = new Array(faces.length);
  var faceCircum = new Array(faces.length);
  for (var fi = 0; fi < faces.length; fi++) {
    var f = faces[fi];
    var a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
    faceCentroids[fi] = vNorm([(a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3, (a[2]+b[2]+c[2])/3]);
    // Spherical circumcenter = normal of the triangle's plane. The ring of
    // circumcenters around a vertex is that vertex's Voronoi cell, whose
    // edges are perpendicular to the center-to-center segments. The physics
    // Laplacian needs that orthogonality; rendering keeps the centroid ring.
    var cc = vNorm(vCross(vSub(b, a), vSub(c, a)));
    if (vDot(cc, a) < 0) cc = vScale(cc, -1);
    faceCircum[fi] = cc;
  }
  var tiles = new Array(n);
  for (var vi = 0; vi < n; vi++) {
    var center = verts[vi];
    var fs = vertFaces[vi];
    var nrm = center;
    var c0 = faceCentroids[fs[0]];
    var t0 = vSub(c0, vScale(nrm, vDot(c0, nrm)));
    var u = vNorm(t0);
    var v = vCross(nrm, u);
    var ang = new Array(fs.length);
    for (var k = 0; k < fs.length; k++) {
      var c = faceCentroids[fs[k]];
      var t = vSub(c, vScale(nrm, vDot(c, nrm)));
      ang[k] = { fi: fs[k], a: Math.atan2(vDot(t, v), vDot(t, u)) };
    }
    ang.sort(function(p, q){ return p.a - q.a; });
    var L = ang.length;
    var poly = new Array(L), dual = new Array(L);
    for (var k = 0; k < L; k++) { poly[k] = faceCentroids[ang[k].fi]; dual[k] = faceCircum[ang[k].fi]; }
    // edgeNeighbor[k] = tile across polygon edge (poly[k] -> poly[k+1])
    var edgeNeighbor = new Array(L);
    for (var k = 0; k < L; k++) {
      var f1 = faces[ang[k].fi];
      var f2 = faces[ang[(k+1) % L].fi];
      var nb = -1;
      for (var a = 0; a < 3; a++) {
        if (f1[a] === vi) continue;
        if (f2[0] === f1[a] || f2[1] === f1[a] || f2[2] === f1[a]) { nb = f1[a]; break; }
      }
      edgeNeighbor[k] = nb;
    }
    var lat = Math.asin(clamp(center[1], -1, 1));
    var lon = Math.atan2(center[2], center[0]);
    tiles[vi] = {
      center: center, verts: poly, dualVerts: dual, neighbors: [], edgeNeighbor: edgeNeighbor,
      lat: lat, lon: lon
    };
  }

  var seen = new Set();
  for (var fi = 0; fi < faces.length; fi++) {
    var f = faces[fi];
    for (var e = 0; e < 3; e++) {
      var x = f[e], y = f[(e+1)%3];
      var lo = x < y ? x : y, hi = x < y ? y : x;
      var k = lo*1000003 + hi;
      if (seen.has(k)) continue;
      seen.add(k);
      tiles[x].neighbors.push(y);
      tiles[y].neighbors.push(x);
    }
  }

  // Wind field (simplified 3-cell atmospheric circulation) + upwind neighbor per tile.
  // Zonal wind from latitude: trade easterlies 0-30 deg, westerlies 30-60, polar easterlies >60.
  // Converted to a 3D tangent vector via the east/north basis at each tile.
  function zonalWind(lat) {
    var aL = Math.abs(lat), sgn = lat < 0 ? -1 : 1;
    if (aL < Math.PI/6)       return [-0.75, -sgn * 0.25];   // trade winds
    else if (aL < Math.PI/3)  return [ 0.95,  sgn * 0.30];   // westerlies
    else                      return [-0.45, -sgn * 0.20];   // polar easterlies
  }
  for (var vi2 = 0; vi2 < tiles.length; vi2++) {
    var t = tiles[vi2];
    var la = t.lat, lo = t.lon;
    var uv = zonalWind(la);
    var cla = Math.cos(la), sla = Math.sin(la);
    var clo = Math.cos(lo), slo = Math.sin(lo);
    var eastHat  = [ -slo,        0,      clo       ];
    var northHat = [ -sla*clo,    cla,   -sla*slo   ];
    t.wind = [
      uv[0]*eastHat[0] + uv[1]*northHat[0],
      uv[0]*eastHat[1] + uv[1]*northHat[1],
      uv[0]*eastHat[2] + uv[1]*northHat[2]
    ];
    t.windSpeed = Math.sqrt(uv[0]*uv[0] + uv[1]*uv[1]);
    var nbs = t.neighbors, bestD = -Infinity, bestNb = -1;
    for (var j = 0; j < nbs.length; j++) {
      var dir = vSub(tiles[nbs[j]].center, t.center);
      var len = vLen(dir);
      if (len < 1e-9) continue;
      var dot = -((t.wind[0]*dir[0] + t.wind[1]*dir[1] + t.wind[2]*dir[2]) / len);
      if (dot > bestD) { bestD = dot; bestNb = nbs[j]; }
    }
    t.upwind = bestNb >= 0 ? bestNb : (nbs.length > 0 ? nbs[0] : vi2);
  }
  return tiles;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { subdivide: subdivide, buildTiles: buildTiles, ICO_VERTS: ICO_VERTS, ICO_FACES: ICO_FACES };
}
