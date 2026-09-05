// node --test physics/test
var test = require('node:test');
var assert = require('node:assert');
var C = require('../carbon.js');

var MODERN = { T: 14.6, landFrac: 0.29, iceFrac: 0.1, veg: 0.2, productivity: 1, age: 4.57, tectonic: 1, civBurn: 0, ch4Source: 0.15 };
function env(o) { var e = {}; for (var k in MODERN) e[k] = MODERN[k]; for (var k in o) e[k] = o[k]; return e; }
function run(st, e, steps) { for (var k = 0; k < steps; k++) C.step(st, e, 1e5); return st; }
function total(st) { return st.cEx + st.fossil + st.crust; }

test('air-sea partition inverts exactly across seven decades of pCO2', function () {
  [50, 280, 1000, 10000, 2e5, 5e6].forEach(function (ppm) {
    var cex = C.cexFromPco2(ppm, 14.6);
    var back = C.pco2FromCex(cex, 14.6);
    assert.ok(Math.abs(back / ppm - 1) < 1e-6, ppm + ' -> ' + back);
  });
  // Revelle: adding 1000 GtC to the modern pool raises pCO2 by ~ a quarter, and only ~10% of it stays in the air
  var cex0 = C.cexFromPco2(280, 14.6);
  var p1 = C.pco2FromCex(cex0 + 1000, 14.6);
  var airFrac = 2.13 * (p1 - 280) / 1000;
  assert.ok(p1 > 320 && p1 < 400, 'pCO2 after +1000 GtC: ' + p1);
  assert.ok(airFrac > 0.05 && airFrac < 0.3, 'airborne fraction ' + airFrac);
  // warming the ocean outgasses ~4 %/K: same carbon, higher pCO2 (glacial 5 K cooling -> ~230 ppm)
  var warm = C.pco2FromCex(cex0, 18), cold = C.pco2FromCex(cex0, 9.6);
  assert.ok(warm > 300 && warm < 340, 'warm ' + warm);
  assert.ok(cold > 215 && cold < 250, 'cold ' + cold);
});

test('modern Earth is a steady state: pCO2 and O2 hold at 280 ppm / 21%', function () {
  var st = C.initState(280, 14.6, 0.21);
  run(st, env({}), 200);
  assert.ok(Math.abs(st.co2 - 280) < 10, 'pCO2 drifted to ' + st.co2);
  assert.ok(Math.abs(st.o2 - 0.21) < 0.03, 'O2 drifted to ' + st.o2);
  assert.ok(st.ch4 > 400 && st.ch4 < 1000, 'CH4 ' + st.ch4 + ' ppb (preindustrial ~700)');
});

test('carbon is conserved across all reservoirs', function () {
  var st = C.initState(280, 14.6, 0.21);
  st.fossil = 3000;
  var t0 = total(st);
  run(st, env({ civBurn: 5 }), 5);
  run(st, env({ T: 25 }), 20);
  run(st, env({ T: -40, iceFrac: 1 }), 20);
  assert.ok(Math.abs(total(st) - t0) / t0 < 1e-9, 'leak ' + (total(st) - t0));
});

test('silicate thermostat: a warmer planet draws CO2 down, a colder one lets it build', function () {
  var warm = run(C.initState(280, 14.6, 0.21), env({ T: 20 }), 50);
  var cold = run(C.initState(280, 14.6, 0.21), env({ T: 8 }), 50);
  assert.ok(warm.co2 < 200, 'warm planet pCO2 ' + warm.co2);
  assert.ok(cold.co2 > 400, 'cold planet pCO2 ' + cold.co2);
  // and it is a genuine equilibrium, not a runaway: further steps barely move it
  var before = warm.co2; run(warm, env({ T: 20 }), 50);
  assert.ok(Math.abs(warm.co2 - before) < 0.1 * before, 'still drifting: ' + before + ' -> ' + warm.co2);
});

test('snowball escape: with weathering shut off, volcanism reaches 0.1 bar CO2 in a few million years', function () {
  var st = C.initState(120, -40, 0.02, null, 1);
  var steps = 0;
  while (st.co2 < 100000 && steps < 2000) { C.step(st, env({ T: -40, iceFrac: 1, tectonic: 1, productivity: 0 }), 1e5); steps++; }
  assert.ok(st.co2 >= 100000, 'never reached 0.1 bar: ' + st.co2);
  assert.ok(steps > 3 && steps < 300, 'took ' + steps + ' steps (' + steps / 10 + ' Myr) at modern outgassing with the ocean sealed');
});

test('Great Oxidation Event emerges: O2 stays near zero until the reductant sink decays, then rises', function () {
  var st = C.initState(50000, 10, 0.0001);
  var o2At = {};
  for (var age = 0; age <= 3.6; age += 0.1) {
    for (var k = 0; k < 10; k++) C.step(st, env({ T: 10, age: age, productivity: 0.35, ch4Source: 0.3, veg: 0 }), 1e6);
    o2At[age.toFixed(1)] = st.o2;
  }
  assert.ok(o2At['0.5'] < 0.002, 'O2 at 0.5 Gyr ' + o2At['0.5']);
  assert.ok(o2At['3.5'] > 0.01, 'O2 at 3.5 Gyr ' + o2At['3.5'] + ' (microbial productivity plateaus at a few % PAL: the boring billion)');
  var goe = null;
  for (var a in o2At) if (o2At[a] > 0.005) { goe = +a; break; }
  assert.ok(goe > 0.6 && goe < 3.0, 'GOE at ' + goe + ' Gyr');
});

test('methane: ~700 ppb in an oxic atmosphere, hundreds of ppm in an anoxic one', function () {
  var oxic = C.initState(280, 14.6, 0.21); C.step(oxic, env({ ch4Source: 0.15 }), 1e5);
  var anoxic = C.initState(200000, 10, 0.0005); C.step(anoxic, env({ T: 10, ch4Source: 0.3, productivity: 0.3, age: 0.5, veg: 0 }), 1e5);
  assert.ok(oxic.ch4 > 400 && oxic.ch4 < 1000, 'oxic ' + oxic.ch4);
  assert.ok(anoxic.ch4 > 50000 && anoxic.ch4 < 2e6, 'anoxic ' + anoxic.ch4 + ' ppb');
});

test('fossil pulse: burning 5000 GtC spikes pCO2 then the ocean and weathering draw it back down', function () {
  var st = C.initState(280, 14.6, 0.21);
  st.fossil = 5000;
  C.step(st, env({ civBurn: 10 }), 1e5);
  var peak = st.co2;
  assert.ok(st.fossil < 10, 'fossil left ' + st.fossil + ' (only what formed during the step)');
  assert.ok(peak > 330, 'peak pCO2 ' + peak + ' (100 kyr step averages over the spike; ocean uptake and weathering act within it)');
  run(st, env({}), 30);
  assert.ok(st.co2 < 280 + 0.3 * (peak - 280), 'after 3 Myr: ' + st.co2 + ' vs peak ' + peak);
  assert.ok(st.o2 < 0.21 && st.o2 > 0.19, 'burning consumed some O2: ' + st.o2);
});
