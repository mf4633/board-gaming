// node --test physics/test
var test = require('node:test');
var assert = require('node:assert');
var D = require('../daisy.js');

test('growth curve: peak at 22.5 C, zero outside ~5..40 C', function () {
  var p = D.params({});
  assert.ok(Math.abs(D.beta(22.5, p) - 1) < 1e-12);
  assert.ok(D.beta(5, p) > 0 && D.beta(5, p) < 0.02, D.beta(5, p));
  assert.strictEqual(D.beta(41, p), 0);
  assert.strictEqual(D.beta(4, p), 0);
});

test('Daisyworld regulates: temperature stays near 22.5 C over a wide luminosity range, then collapses', function () {
  var ab = 0.01, aw = 0.01, reg = [], bare = [];
  var lums = [];
  for (var L = 0.6; L <= 1.7; L += 0.05) lums.push(+L.toFixed(2));
  var collapsedAt = null;
  lums.forEach(function (L) {
    var r = D.equilibrate(L, ab, aw, {}, { years: 300 });
    ab = r.ab; aw = r.aw;
    reg.push(r.Te); bare.push(r.Tbare);
    if (collapsedAt === null && r.ab <= 0.011 && r.aw <= 0.011 && L > 1.0) collapsedAt = L;
  });
  // in the regulated band (L ~0.8..1.4) the planet sits within 8 K of the optimum
  // while the bare planet swings by tens of kelvin
  var inBand = lums.map(function (L, i) { return { L: L, T: reg[i], Tb: bare[i] }; }).filter(function (r) { return r.L >= 0.85 && r.L <= 1.35; });
  inBand.forEach(function (r) { assert.ok(Math.abs(r.T - 22.5) < 8, 'L ' + r.L + ' T ' + r.T); });
  var bareSpan = bare[bare.length - 1] - bare[0];
  var regSpan = Math.max.apply(null, inBand.map(function (r) { return r.T; })) - Math.min.apply(null, inBand.map(function (r) { return r.T; }));
  assert.ok(bareSpan > 60, 'bare span ' + bareSpan);
  assert.ok(regSpan < 0.3 * bareSpan, 'regulated span ' + regSpan + ' vs bare ' + bareSpan);
  assert.ok(collapsedAt !== null && collapsedAt > 1.3, 'collapse at L = ' + collapsedAt);
});

test('black daisies dominate a cold planet, white a hot one (populations carried along a luminosity ramp)', function () {
  // Daisyworld is hysteretic: seeds on an already-hot bare planet never germinate
  // (beta = 0 above 40 C), so the hot state must be reached by ramping the sun.
  var cold = D.equilibrate(0.75, 0.01, 0.01, {}, { years: 300 });
  var mid = D.equilibrate(1.0, 0.01, 0.01, {}, { years: 300 });
  var hot = D.equilibrate(1.3, mid.ab, mid.aw, {}, { years: 300 });
  assert.ok(cold.ab > cold.aw, 'cold: black ' + cold.ab + ' white ' + cold.aw);
  assert.ok(hot.aw > hot.ab, 'hot: black ' + hot.ab + ' white ' + hot.aw);
});

test('with q = 0 (no local albedo feedback) there is no regulation', function () {
  var m1 = D.equilibrate(1.0, 0.01, 0.01, { q: 0 }, { years: 300 }), m0 = D.equilibrate(1.0, 0.01, 0.01, {}, { years: 300 });
  var r = D.equilibrate(1.3, m1.ab, m1.aw, { q: 0 }, { years: 300 });
  var r0 = D.equilibrate(1.3, m0.ab, m0.aw, {}, { years: 300 });
  assert.ok(Math.abs(r.Te - 22.5) > Math.abs(r0.Te - 22.5), 'q=0 ' + r.Te + ' vs q=20 ' + r0.Te);
});

test('cover fractions stay in [seed, 1] and sum to at most 1', function () {
  var ab = 0.6, aw = 0.6;
  for (var k = 0; k < 50; k++) { var r = D.step(ab, aw, 22.5, 10); ab = r[0]; aw = r[1]; assert.ok(ab >= 0.01 && aw >= 0.01 && ab + aw <= 1.0000001); }
});
