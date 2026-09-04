const path = require('path');
const { chromium } = require('playwright');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'Tower.html').split(path.sep).join('/');
const OUT = process.argv[2] || __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/^https?:\/\//, r => r.abort());
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(FILE, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    state.pendingCityId = 'nyc'; resetGameState(); state.towerName = 'Halcyon Spire'; state.cash = 5e6; state.stars = 3;
    createUnitDirect('lobby', 8, 0);
    for (var f = 1; f <= 9; f++) { createUnitDirect('office', 8, f); createUnitDirect(f % 3 === 0 ? 'condo' : 'office', 12, f); createUnitDirect('hotel', 16, f); }
    createUnitDirect('shop', 16, 0); createUnitDirect('restaurant', 20, 0);
    for (var e = 0; e <= 9; e++) createUnitDirect('elevator', 7, e);
    for (var s2 = 0; s2 <= 3; s2++) createUnitDirect('stairs', 19, s2);
    rebuildElevators(); state.elevators[0].cars.push({ y: 0, floatY: 0, dir: 1, passengers: [], stopTimer: 0, queueUp: {}, queueDown: {} });
    startGameFresh();
    state.tutorialSkipped = true; skipTutorial();
    var so = document.querySelector('.seo-content'); if (so) so.style.display = 'none';
    var eod = document.getElementById('eodSummary'); if (eod) eod.classList.remove('show');
  });
  const shots = [['jun_dawn', 92, 5*60+5, 'clear'], ['jun_noon', 92, 12*60, 'clear'], ['jun_dusk', 92, 20*60+30, 'clear'], ['jun_night', 92, 23*60, 'clear'], ['dec_late_afternoon', 285, 16*60+15, 'cloudy'], ['dec_night_snow', 285, 21*60, 'snow'], ['sep_storm', 190, 15*60, 'storm'], ['nov_fog_morning', 250, 7*60+30, 'fog']];
  for (const [name, day, minute, kind] of shots) {
    await p.evaluate(({ day, minute, kind }) => {
      state.day = day; state.minute = minute; _solarCache = { day: 0 };
      weather.upcoming = []; initWeather();
      weather.kind = kind; weather.intensity = kind === 'storm' ? 1 : 0.8;
      weather.clouds = kind === 'clear' ? 0.1 : kind === 'cloudy' ? 0.85 : 0.95;
      if (kind === 'snow') { weather.snowDepth = 5; weather.tmax = 28; weather.tmin = 18; }
      if (kind === 'fog') { weather.tmax = 52; weather.tmin = 41; }
      weather.windMph = kind === 'storm' ? 34 : 9;
      for (var u in state.units) state.units[u].tenants = UNITS[state.units[u].type].capacity;
      state.pendingChoice = null; hideModal('choiceModal');
      // a few people about
      state.agents = [];
      for (var i = 0; i < 12; i++) state.agents.push({ id: state.nextAgentId++, type: i % 2 ? 'worker' : 'resident', x: 8 + (i * 1.3) % 14, y: (i * 2) % 9, phase: 'toWork', unitId: null, walkDelay: 0, stress: (i % 4) * 0.3 });
      var ln = document.getElementById('lotLabel'); 
      render(); updateHUD();
    }, { day, minute, kind });
    await p.waitForTimeout(60);
    await p.evaluate(() => { for (var k = 0; k < 3; k++) render(); });
    await p.screenshot({ path: path.join(OUT, 'shot_' + name + '.png') });
  }
  await p.evaluate(() => { toggleWeatherPanel(); render(); updateHUD(); });
  await p.screenshot({ path: path.join(OUT, 'shot_weather_panel.png') });
  console.log('ERRORS', JSON.stringify(errors));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
