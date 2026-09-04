const path = require('path');
const { chromium } = require('playwright');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'Tower.html').split(path.sep).join('/');
const OUT = process.argv[3] || __dirname;
(async () => {
  const days = parseInt(process.argv[2] || '400', 10);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/^https?:\/\//, r => r.abort());
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(FILE, { waitUntil: 'domcontentloaded' });

  // 1. Real UI flow: NEW GAME -> city modal -> pick Chicago -> name prompt -> start
  await p.click('#btnNewGame');
  const cityVisible = await p.evaluate(() => document.getElementById('cityModal').classList.contains('show'));
  await p.click('#cityGrid div:nth-child(2)');
  const promptVisible = await p.evaluate(() => document.getElementById('dialogModal').classList.contains('show') && document.getElementById('dialogMsg').textContent);
  await p.fill('#dialogInput', 'Lakefront Spire');
  await p.click('#dialogOk');
  await p.waitForTimeout(100);
  const started = await p.evaluate(() => ({ started: state.gameStarted, city: state.cityId, name: state.towerName, kind: weather.kind, day: state.day }));
  console.log('UI FLOW', JSON.stringify({ cityVisible, promptVisible, started }));

  // 2. Long run with a growing tower and a loan; sample the economy
  const r = await p.evaluate((days) => {
    state.cash = 3e6; state.scenarioNoFires = true; setSpeed(1);
    createUnitDirect('lobby', 8, 0);
    for (var f = 1; f <= 12; f++) { createUnitDirect('office', 8, f); createUnitDirect(f % 4 === 0 ? 'condo' : 'office', 12, f); createUnitDirect('hotel', 16, f); }
    createUnitDirect('shop', 16, 0); createUnitDirect('restaurant', 20, 0); createUnitDirect('parking', 8, -1); createUnitDirect('atm', 19, 1);
    for (var e = 0; e <= 12; e++) createUnitDirect('elevator', 7, e);
    for (var st = 0; st <= 2; st++) createUnitDirect('stairs', 20, st);
    rebuildElevators(); state.elevators[0].cars.push({ y: 0, floatY: 0, dir: 1, passengers: [], stopTimer: 0, queueUp: {}, queueDown: {} });
    state.demand = { condo: 60, office: 200, restaurant: 40 };
    state.stars = 2; state.pendingChoice = null;
    updatePopulation();
    var samples = [], statements = 0, sold = 0, regimes = {}, minCash = Infinity, maxWait = 0, stuck = 0;
    var abs = function() { return state.day * 1440 + state.minute; };
    for (var d = 0; d < days; d++) {
      if (d === 30) borrow(500000);
      for (var m = 0; m < 1440; m++) {
        state.minute++; if (state.minute >= 1440) { state.minute = 0; state.day++; endOfDay(); }
        simMinute();
        if (state.pendingChoice) { resolveChoice('b'); }
        var now = abs();
        for (var i = 0; i < state.agents.length; i++) { var a = state.agents[i]; if ((a.waitTicks || 0) > maxWait) maxWait = a.waitTicks; if (a._p !== a.phase) { a._p = a.phase; a._t = now; } if (now - a._t > 700 && (a.phase === 'toWork' || a.phase === 'toHome' || a.phase === 'leaving')) stuck++; }
      }
      var e = econ();
      regimes[e.regime] = (regimes[e.regime] || 0) + 1;
      minCash = Math.min(minCash, state.cash);
      if (d % 40 === 0 || d === days - 1) samples.push({ day: state.day, date: formatGameDate(state.day), cash: Math.round(state.cash), pop: state.population, val: e.valuation, prime: +(e.prime * 100).toFixed(2), cpi: +e.cpi.toFixed(3), cycle: +e.cycle.toFixed(2), apr: +(loanApr() * 100).toFixed(2), debt: state.loan.principal, limit: creditLimit(), noiA: Math.round(annualNoi()), tax: e.taxToday, util: state.lastUtility && state.lastUtility.total, wx: weather.kind + ' ' + weather.tmax + '/' + weather.tmin, stars: state.stars, units: Object.keys(state.units).length });
    }
    for (var id in state.units) if (state.units[id].sold) sold++;
    statements = econ().monthly.length;
    var last = econ().monthly[econ().monthly.length - 1];
    var mailSubjects = (state.mail || []).slice(-6).map(function(m) { return m.subject; });
    return { samples: samples, statements: statements, lastStatement: last, condosSold: sold, regimes: regimes, minCash: Math.round(minCash), maxWait: maxWait, stuck: stuck, mail: mailSubjects, log: state.log.slice(-8).map(function(l) { return 'D' + l.day + ' ' + l.text; }) };
  }, days);
  console.log('ECON', JSON.stringify(r, null, 1));

  // 3. Save/load roundtrip (v3) and legacy v2 load
  const sl = await p.evaluate(() => {
    var snap = captureSaveSnapshot();
    var json = JSON.stringify(snap);
    var back = JSON.parse(json);
    var before = { day: state.day, cash: Math.round(state.cash), city: state.cityId, kind: weather.kind, prime: econ().prime, units: Object.keys(state.units).length };
    resetGameState();
    applySaveSnapshot(back);
    var after = { day: state.day, cash: Math.round(state.cash), city: state.cityId, kind: weather.kind, prime: econ().prime, units: Object.keys(state.units).length, upcoming: weather.upcoming.length };
    // legacy v2: strip new fields
    delete back.weather; delete back.econ; delete back.cityId; back.version = 2;
    resetGameState();
    applySaveSnapshot(back);
    var legacy = { day: state.day, city: state.cityId, kind: weather.kind, econ: !!state.econ, upcoming: weather.upcoming.length, size: json.length };
    // run 2 more days on the legacy-loaded game
    for (var m = 0; m < 2880; m++) { state.minute++; if (state.minute >= 1440) { state.minute = 0; state.day++; endOfDay(); } simMinute(); }
    return { before, after, legacy, ranDays: state.day };
  });
  console.log('SAVELOAD', JSON.stringify(sl));
  await p.evaluate(() => { var so = document.querySelector('.seo-content'); if (so) so.style.display = 'none'; state.pendingChoice = null; hideModal('choiceModal'); showModal('financeModal'); });
  await p.screenshot({ path: path.join(OUT, 'shot_finance.png') });
  console.log('ERRORS', JSON.stringify(errors));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
