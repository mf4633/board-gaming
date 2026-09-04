/* SKYSTACK elevator/transport harness.
 * Loads Tower.html headless, builds scripted towers, runs N sim days, reports
 * trip times, stuck agents, and stalled cars. Run:
 *   NODE_PATH=<path with playwright> node tests/elevator_harness.js [scenario|all] [days]
 */
const path = require('path');
const { chromium } = require('playwright');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'Tower.html').split(path.sep).join('/');

const SCENARIOS = {
  // 15 floors, one local shaft with 1 car, two offices per floor
  single_car_15: { floors: 15, cars: 1, express: false },
  three_car_15:  { floors: 15, cars: 3, express: false },
  three_car_30:  { floors: 30, cars: 3, express: false },
  express_30:    { floors: 30, cars: 2, express: true, skylobby: 15 },
  stairs_only_4: { floors: 4, stairsOnly: true },
  mixed_condo_20:{ floors: 20, cars: 2, condos: true },
  split_shaft_15:{ floors: 15, cars: 2, splitAtDay: 2 },
  // Full occupancy stress: every desk filled, one bank of 3 cars for 30 floors
  stress_full_30:{ floors: 30, cars: 3, full: true },
  stress_full_50:{ floors: 50, cars: 4, full: true, express: true, skylobby: 25 },
  stress_1car_30:{ floors: 30, cars: 1, full: true }
};

function buildTower(cfg) {
  // runs inside the page
  resetGameState();
  state.towerName = 'Harness';
  state.cash = 1e9;
  state.stars = 5;
  costMultiplier.elevator = 0.8;
  state.insurance = true;
  state.scenarioNoFires = true;
  if (cfg.full) state.demand = { condo: 1e6, office: 1e6, restaurant: 1e6 };
  createUnitDirect('lobby', 10, 0);
  var shaftX = 9, stairsX = 18;
  for (var f = 1; f <= cfg.floors; f++) {
    if (cfg.skylobby && f === cfg.skylobby) { createUnitDirect('skylobby', 10, f); createUnitDirect('office', 16, f); }
    else if (cfg.condos && f % 3 === 0) { createUnitDirect('condo', 10, f); createUnitDirect('condo', 14, f); }
    else { createUnitDirect('office', 10, f); createUnitDirect('office', 14, f); }
  }
  if (cfg.stairsOnly) {
    for (var s = 0; s < cfg.floors; s++) createUnitDirect('stairs', stairsX, s);
  } else {
    for (var e = 0; e <= cfg.floors; e++) createUnitDirect('elevator', shaftX, e);
    if (cfg.express) for (var x = 0; x <= cfg.floors; x++) createUnitDirect('expressElevator', 8, x);
    rebuildElevators();
    for (var ei = 0; ei < state.elevators.length; ei++) {
      var el = state.elevators[ei];
      var want = el.express ? 2 : cfg.cars;
      while (el.cars.length < want) el.cars.push({ y: el.minY, floatY: el.minY, dir: 1, passengers: [], stopTimer: 0, queueUp: {}, queueDown: {} });
    }
  }
  updatePopulation();
  state.gameStarted = true;
  state.speed = 1; state.paused = false;
  window.__h = { trips: [], stuck: {}, stalls: 0, maxWait: 0, carMoves: 0, lastCarY: {}, stallTicks: {} };
}

function runDays(args) {
  var days = args.days, opts = args.opts;
  // runs inside the page; advances sim minute by minute with instrumentation
  var H = window.__h;
  var abs = function() { return state.day * 1440 + state.minute; };
  for (var d = 0; d < days; d++) {
    for (var m = 0; m < 1440; m++) {
      state.minute++;
      if (state.minute >= 1440) { state.minute = 0; state.day++; endOfDay(); }
      if (opts && opts.splitAtDay && state.day === opts.splitAtDay && state.minute === 10 * 60) {
        // Player bulldozes floor 7 of the shaft, then rebuilds it 2 hours later
        bulldozeAt(9, 7);
        H.splitDone = true;
      }
      if (opts && opts.splitAtDay && state.day === opts.splitAtDay && state.minute === 12 * 60) {
        createUnitDirect('elevator', 9, 7); rebuildElevators();
        H.rejoinDone = true;
      }
      simMinute();
      var now = abs();
      for (var i = 0; i < state.agents.length; i++) {
        var a = state.agents[i];
        if (a._t0 === undefined) { a._t0 = now; a._phase0 = a.phase; }
        if (a.phase !== a._phase0) {
          var arrived = (a.phase === 'atWork' || a.phase === 'atHome' || a.phase === 'atLunch');
          if (arrived) H.trips.push({ type: a.type, dur: now - a._t0, wait: a.waitTicks || 0, floor: (state.units[a.unitId] || {}).y });
          a._phase0 = a.phase; a._t0 = now;
        }
        if ((a.waitTicks || 0) > H.maxWait) H.maxWait = a.waitTicks;
        if (now - a._t0 > 600 && (a.phase === 'toWork' || a.phase === 'toHome' || a.phase === 'leaving' || a.phase === 'toLunch')) {
          H.stuck[a.id] = { type: a.type, phase: a.phase, y: a.y, x: +a.x.toFixed(2), inElev: !!a.inElevator, age: now - a._t0, wait: a.waitTicks, dest: desiredFloorForAgent(a) };
        }
      }
      for (var ei = 0; ei < state.elevators.length; ei++) {
        var e = state.elevators[ei];
        for (var ci = 0; ci < e.cars.length; ci++) {
          var c = e.cars[ci], k = ei + ':' + ci;
          var busy = c.passengers.length > 0 || anyCallsCar(c);
          if (H.lastCarY[k] === c.y && busy && c.stopTimer === 0) {
            H.stallTicks[k] = (H.stallTicks[k] || 0) + 1;
            if (H.stallTicks[k] === 30) H.stalls++;
          } else H.stallTicks[k] = 0;
          if (H.lastCarY[k] !== undefined && H.lastCarY[k] !== c.y) H.carMoves++;
          H.lastCarY[k] = c.y;
        }
      }
    }
  }
  var trips = H.trips;
  var byType = {};
  trips.forEach(function(t) { var b = byType[t.type] = byType[t.type] || { n: 0, sum: 0, max: 0, wsum: 0, wmax: 0 }; b.n++; b.sum += t.dur; b.max = Math.max(b.max, t.dur); b.wsum += t.wait; b.wmax = Math.max(b.wmax, t.wait); });
  for (var k in byType) { byType[k].avg = +(byType[k].sum / byType[k].n).toFixed(1); byType[k].avgWait = +(byType[k].wsum / byType[k].n).toFixed(1); delete byType[k].sum; delete byType[k].wsum; }
  var stuckList = Object.keys(H.stuck).map(function(k) { return H.stuck[k]; });
  var inFlight = state.agents.filter(function(a) { return a.phase === 'toWork' || a.phase === 'toHome' || a.phase === 'leaving'; }).length;
  return {
    days: days, pop: state.population, agentsNow: state.agents.length, inFlight: inFlight,
    trips: trips.length, byType: byType, maxWait: H.maxWait, stuck: stuckList.length,
    stuckSample: stuckList.slice(0, 5), stalls: H.stalls, carMoves: H.carMoves,
    elevators: state.elevators.map(function(e) { return { x: e.shaftX, range: [e.minY, e.maxY], cars: e.cars.map(function(c) { return { y: c.y, p: c.passengers.length, calls: anyCallsCar(c) }; }) }; }),
    split: !!H.splitDone, rejoin: !!H.rejoinDone,
    cash: Math.round(state.cash), day: state.day
  };
}

(async () => {
  const which = process.argv[2] || 'all';
  const days = parseInt(process.argv[3] || '3', 10);
  const names = which === 'all' ? Object.keys(SCENARIOS) : which.split(',');
  const b = await chromium.launch();
  const results = {};
  for (const name of names) {
    const cfg = SCENARIOS[name];
    if (!cfg) { console.log('unknown scenario', name); continue; }
    const p = await b.newPage();
    await p.route(/^https?:\/\//, r => r.abort());
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(FILE, { waitUntil: 'domcontentloaded' });
    await p.evaluate(buildTower, cfg);
    const r = await p.evaluate(runDays, { days: days, opts: { splitAtDay: cfg.splitAtDay } });
    r.errors = errors;
    results[name] = r;
    console.log('=== ' + name + ' ===');
    console.log(JSON.stringify(r, null, 1));
    await p.close();
  }
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
