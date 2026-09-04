/* Runs a game for N days per city headless, checks for page errors, prints weather stats,
 * verifies sunrise/sunset sanity, and saves screenshots at dawn/noon/dusk/night. */
const path = require('path');
const { chromium } = require('playwright');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'Tower.html').split(path.sep).join('/');
const OUT = process.argv[3] || __dirname;
(async () => {
  const days = parseInt(process.argv[2] || '60', 10);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/^https?:\/\//, r => r.abort());
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FILE, { waitUntil: 'domcontentloaded' });
  for (const cityId of ['nyc','chi','mia','sea','den','phx','lon','tyo']) {
    const r = await p.evaluate(({ cityId, days }) => {
      state.pendingCityId = cityId;
      resetGameState(); state.towerName = 'WX ' + cityId; state.cash = 5e6; state.scenarioNoFires = true;
      createUnitDirect('lobby', 10, 0);
      for (var f = 1; f <= 8; f++) { createUnitDirect('office', 10, f); createUnitDirect('condo', 14, f); }
      for (var e = 0; e <= 8; e++) createUnitDirect('elevator', 9, e);
      createUnitDirect('hotel', 18, 1); createUnitDirect('shop', 18, 2);
      rebuildElevators(); updatePopulation();
      startGameFresh();
      var kinds = {}, tmaxs = [], tmins = [], precip = 0, snowMax = 0, utilSum = 0, holidays = [];
      var sunCheck = [];
      for (var d = 0; d < days; d++) {
        for (var m = 0; m < 1440; m++) {
          state.minute++; if (state.minute >= 1440) { state.minute = 0; state.day++; endOfDay(); }
          simMinute();
        }
        kinds[weather.kind] = (kinds[weather.kind] || 0) + 1;
        tmaxs.push(weather.tmax); tmins.push(weather.tmin); precip += weather.precipIn;
        snowMax = Math.max(snowMax, weather.snowDepth || 0);
        if (state.lastUtility) utilSum += state.lastUtility.total;
        if (state.holiday) holidays.push(formatGameDate(state.day) + ' ' + state.holiday);
        if (d % 30 === 0) { var si = solarInfo(state.day); sunCheck.push(formatGameDate(state.day) + ' rise ' + formatClock(si.sunrise) + ' set ' + formatClock(si.sunset) + (si.dst ? ' DST' : '') + ' moon ' + moonPhaseName(moonPhase(state.day))); }
      }
      var avg = function(a) { return (a.reduce(function(x, y) { return x + y; }, 0) / a.length).toFixed(1); };
      return { city: city().name, days: days, kinds: kinds, tmaxAvg: avg(tmaxs), tminAvg: avg(tmins), tmaxMax: Math.max.apply(null, tmaxs), tminMin: Math.min.apply(null, tmins),
               precipTotal: precip.toFixed(1), snowMax: snowMax, utilPerDay: Math.round(utilSum / days), holidays: holidays.slice(0, 6), sun: sunCheck, cash: Math.round(state.cash), pop: state.population,
               endDate: formatGameDate(state.day), forecast: [1,2,3].map(forecastFor), temp: Math.round(currentTempF()) };
    }, { cityId, days });
    console.log(JSON.stringify(r));
  }
  // Screenshots for NYC at several times of day in early June and mid-December
  await p.evaluate(() => { state.pendingCityId = 'nyc'; resetGameState(); state.towerName = 'Shots'; state.cash = 5e6; createUnitDirect('lobby', 10, 0);
    for (var f = 1; f <= 8; f++) { createUnitDirect('office', 10, f); createUnitDirect('condo', 14, f); } for (var e = 0; e <= 8; e++) createUnitDirect('elevator', 9, e); rebuildElevators(); startGameFresh(); state.paused = true; });
  const shots = [['jun_dawn', 92, 5*60+10], ['jun_noon', 92, 12*60], ['jun_dusk', 92, 20*60+25], ['jun_night', 92, 23*60], ['dec_late_afternoon', 285, 16*60+20], ['dec_night_snow', 285, 21*60]];
  for (const [name, day, minute] of shots) {
    await p.evaluate(({ day, minute, name }) => {
      state.day = day; state.minute = minute; _solarCache = { day: 0 };
      weather.upcoming = []; initWeather();
      if (name.indexOf('snow') >= 0) { weather.kind = 'snow'; weather.intensity = 0.8; weather.snowDepth = 5; weather.clouds = 0.9; weather.tmax = 28; weather.tmin = 18; }
      if (name.indexOf('jun') >= 0) { weather.kind = 'clear'; weather.clouds = 0.15; }
      for (var u in state.units) state.units[u].tenants = UNITS[state.units[u].type].capacity;
      render(); updateHUD();
    }, { day, minute, name });
    await p.waitForTimeout(80);
    await p.evaluate(() => { render(); });
    await p.screenshot({ path: path.join(OUT, 'shot_' + name + '.png') });
  }
  await p.evaluate(() => { toggleWeatherPanel(); render(); updateHUD(); });
  await p.screenshot({ path: path.join(OUT, 'shot_weather_panel.png') });
  console.log('ERRORS', JSON.stringify(errors));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
