// Biosphere Blue end-to-end suite.
//   npm run e2e:biosphere            (web page from this repo)
//   BB_DESKTOP=1 npm run e2e:biosphere   (also checks ../biosphere-blue-build/dist: no external requests)
//
// Runs headless Chromium (playwright, devDependency) against a throwaway static
// server. Every test asserts on simulation state read through the page's own
// globals (SIM, WORLD), so a regression in physics, scenarios, missions, the
// energy budget, time scales or the UI fails here before it reaches itch or Steam.
var test = require('node:test');
var assert = require('node:assert');
var http = require('node:http');
var fs = require('node:fs');
var path = require('node:path');
var pw = require('playwright');

var ROOT = path.resolve(__dirname, '..');
var DESKTOP = path.resolve(ROOT, '../biosphere-blue-build/dist');
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

function serve(root) {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      var f = path.join(root, p);
      fs.readFile(f, function (err, data) {
        if (err) { res.statusCode = 404; res.end(); return; }
        res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', function () { resolve({ server: srv, url: 'http://127.0.0.1:' + srv.address().port }); });
  });
}

var browser, web, page, errors;
async function open(url) {
  errors = [];
  page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error' && !/CORS|net::ERR|404|giscus|analytics/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(function () { try { localStorage.setItem('simearth_first_run_done_v1', '1'); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(function () { return typeof WORLD !== 'undefined' && WORLD && WORLD.ebm; }, null, { timeout: 120000 });
  // Deterministic world: the seed "rodinia" is an Earth-like roll (36% land, ~12 C modern, 3% ice).
  // The random New-Earth path is covered by the first test before the reseed.
  await page.evaluate(function () {
    var m = document.getElementById('mainMenu'); if (m) { m.classList.add('hidden'); m.style.display = 'none'; }
    if (!window.__bbSeeded) { window.__bbSeeded = true; setWorldSeed('rodinia'); resetSim(); resetBannerFlags(); buildAndAttachWorld(); }
  });
  return page;
}
function ev(fn, arg) { return page.evaluate(fn, arg); }
function noErrors(where) { assert.deepStrictEqual(errors, [], where + ': page errors'); }

test.before(async function () {
  browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  web = await serve(ROOT);
});
test.after(async function () { await browser.close(); web.server.close(); });

test('a new Earth loads clean and is Earth-like (random seed, with the Earth-like retry)', async function () {
  errors = [];
  page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  await page.addInitScript(function () { try { localStorage.setItem('simearth_first_run_done_v1', '1'); } catch (e) {} });
  await page.goto(web.url + '/BiosphereBlue.html', { waitUntil: 'load' });
  await page.waitForFunction(function () { return typeof WORLD !== 'undefined' && WORLD && WORLD.ebm; }, null, { timeout: 120000 });
  var s = await ev(function () { return { T: SIM.globalTemp, rock: SIM.rockFrac, rain: SIM.water.meanPrecip, imb: SIM.energy.imbalance, res: SIM.energy.residual, ts: SIM.timeScale, omega: SIM.omega, tiles: WORLD.tiles.length }; });
  assert.strictEqual(s.tiles, 10242);
  assert.ok(s.T > 2 && s.T < 26, 'mean temperature ' + s.T);
  assert.ok(s.rock > 0.15 && s.rock < 0.55, 'land fraction ' + s.rock);
  assert.ok(s.rain > 1.5 && s.rain < 5, 'rain ' + s.rain + ' mm/day');
  assert.ok(Math.abs(s.imb) < 1.5, 'energy imbalance ' + s.imb + ' W/m^2');
  assert.ok(s.omega && s.omega.pool > 0, 'energy budget initialized');
  noErrors('load');
  await page.close();
});

test('physics closes: energy, water and carbon budgets are finite and balanced after 20 steps', async function () {
  await open(web.url + '/BiosphereBlue.html');
  var s = await ev(function () {
    for (var k = 0; k < 20; k++) simStep();
    var e = SIM.energy, w = SIM.water, c = SIM.carbonFlux;
    return { asr: e.meanASR, olr: e.meanOLR, res: e.residual, E: w.meanEvap, P: w.meanPrecip, volc: c.volc, weath: c.weath, co2: SIM.co2, o2: SIM.o2, ts: SIM.timeScale, dt: currentDtY(), yr: SIM.year };
  });
  assert.ok(Math.abs(s.asr - s.olr) < 2, 'radiation ' + s.asr + ' vs ' + s.olr);
  assert.ok(s.res < 5, 'solver residual ' + s.res);
  assert.ok(Math.abs(s.E - s.P) < 0.15 * s.P, 'water E ' + s.E + ' P ' + s.P);
  assert.ok(isFinite(s.volc) && isFinite(s.weath) && s.volc > 0, 'carbon fluxes');
  assert.ok(s.co2 > 100 && s.co2 < 2e6 && s.o2 >= 0 && s.o2 <= 0.35, 'atmosphere ' + s.co2 + ' ' + s.o2);
  assert.strictEqual(s.ts, 0, 'a lifeless world runs in the Geologic time scale');
  assert.strictEqual(s.dt, 1e7);
  noErrors('physics');
  await page.close();
});

test('energy budget: costs are charged, refused when poor, unlimited in experimental', async function () {
  await open(web.url + '/BiosphereBlue.html');
  var s = await ev(function () {
    var out = {};
    SIM.omega.pool = 120;
    out.raiseCost = toolCost('raise', 3);
    out.refused = !spendOmega(out.raiseCost, 'raise');
    out.afterRefuse = SIM.omega.pool;
    out.paid = spendOmega(toolCost('meteor', 1), 'meteor');
    out.afterPay = SIM.omega.pool;
    out.regen = omegaRegen();
    SIM.omega = { pool: 0, difficulty: 'experimental' };
    out.unlimited = spendOmega(99999, 'anything');
    return out;
  });
  assert.strictEqual(s.raiseCost, 300);
  assert.ok(s.refused && s.afterRefuse === 120, 'refusal leaves the pool intact');
  assert.ok(s.paid && s.afterPay === 70, 'meteor cost 50: ' + s.afterPay);
  assert.strictEqual(s.regen, 1);
  assert.ok(s.unlimited);
  noErrors('energy');
  await page.close();
});

var SCENARIO_EXPECTATIONS = {
  archean:    { steps: 20, check: function (s) { return s.T > -15 && s.T < 30 && s.co2 > 1000; } },
  modern:     { steps: 30, check: function (s) { return s.T > 2 && s.T < 26 && s.o2 > 0.12; } },
  bau2100:    { steps: 30, check: function (s) { return s.T > 5 && s.T < 30; } },
  snowball:   { steps: 3,  check: function (s) { return s.ice > 0.8 && s.T < 0; },
                then: { steps: 13, check: function (s) { return s.T > -5 || s.ice < 0.7; } } },   // frozen first; dust-darkened ice lets the volcanic CO2 thaw it within ~120 My
  carbon:     { steps: 30, check: function (s) { return s.o2 > 0.12 && s.T > -10; } },   // O2 relaxes toward the seed's own burial/oxidation balance within a few My
  venus:      { steps: 30, check: function (s) { return s.T > 150; } },
  iceage:     { steps: 30, check: function (s) { return s.ice > 0.1; } },
  daisyworld: { steps: 150, check: function (s) { return s.daisy && s.sun > 1.0 && s.T > 0 && s.T < 45; } },
  mars:       { steps: 30, check: function (s) { return s.T < -25 && s.rock > 0.95 && s.ts === 3; } },
  aquarium:   { steps: 10, check: function (s) { return s.rock < 0.02 && s.stage >= 2; } }
};
Object.keys(SCENARIO_EXPECTATIONS).forEach(function (name) {
  test('scenario ' + name + ' loads, runs and lands in the expected regime', async function () {
    await open(web.url + '/BiosphereBlue.html');
    var exp = SCENARIO_EXPECTATIONS[name];
    var s = await ev(function (a) {
      applyScenario(a.name);
      for (var k = 0; k < a.steps; k++) simStep();
      return { T: SIM.globalTemp, co2: SIM.co2, o2: SIM.o2, ice: SIM.iceFrac, rock: SIM.rockFrac, sun: SIM.sunLum, ts: SIM.timeScale, stage: SIM.lifeStage, daisy: !!SIM.daisy, mission: SIM.mission && SIM.mission.id, res: SIM.energy.residual };
    }, { name: name, steps: exp.steps });
    assert.ok(exp.check(s), name + ' state ' + JSON.stringify(s));
    assert.strictEqual(s.mission, name, 'mission attached');
    if (exp.then) {
      var s2 = await ev(function (a) {
        for (var k = 0; k < a.steps; k++) simStep();
        return { T: SIM.globalTemp, ice: SIM.iceFrac, co2: SIM.co2 };
      }, { steps: exp.then.steps });
      assert.ok(exp.then.check(s2), name + ' later state ' + JSON.stringify(s2));
    }
    noErrors(name);
    await page.close();
  });
});

test('missions: ten listed, a win is recorded, an early fail does not fire during settle', async function () {
  await open(web.url + '/BiosphereBlue.html');
  var s = await ev(function () {
    var out = {};
    out.count = MISSIONS.length;
    applyScenario('carbon'); for (var k = 0; k < 8; k++) simStep();
    out.carbonDone = SIM.mission.done;
    // Daisyworld win: hold the sun at 120% and let the daisies settle
    applyScenario('daisyworld');
    for (var k2 = 0; k2 < 200 && !SIM.mission.done; k2++) { if (SIM.sunOverride > 1.17) SIM.sunOverride = 1.17; simStep(); }
    out.cover = daisyCover();
    out.daisyBare = SIM.daisyBareT;
    out.daisyDone = SIM.mission.done; out.daisyT = SIM.globalTemp; out.sun = SIM.sunLum;
    out.record = missionRecord();
    return out;
  });
  assert.strictEqual(s.count, 10);
  assert.strictEqual(s.carbonDone, null, 'Carboniferous must not fail on load');
  assert.strictEqual(s.daisyDone, 'won', 'Daisyworld win at sun ' + s.sun + ' T ' + s.daisyT + ' bare ' + s.daisyBare + ' cover ' + s.cover);
  assert.ok(s.record.daisyworld && s.record.daisyworld.won);
  noErrors('missions');
  await page.close();
});

test('time scales switch with life: monolith to civilization moves the clock to 10-year steps', async function () {
  await open(web.url + '/BiosphereBlue.html');
  var s = await ev(function () {
    applyScenario('modern'); for (var k = 0; k < 4; k++) simStep();
    var before = SIM.timeScale, tries = 0;
    while (SIM.lifeStage < 6 && tries < 40) { monolithPush(); simStep(); tries++; }
    // the last step to civilization is a slow random gate (fire, tools); the test is about the clock, so take the console's shortcut
    if (SIM.lifeStage < 7) { var top = livingClades().sort(function (a, b) { return b.stage - a.stage; })[0]; top.stage = 7; top.isSapient = true; top.hasCiv = true; recomputeLifeStage(); simStep(); }
    for (var k2 = 0; k2 < 30; k2++) simStep();
    var c = ensureCiv();
    return { before: before, after: SIM.timeScale, dt: currentDtY(), stage: SIM.lifeStage, pop: c.population, E: c.energy, sliders: 0, tech: SIM.civTech };
  });
  assert.strictEqual(s.before, 1);
  assert.strictEqual(s.stage, 7, 'civilization reached');
  assert.strictEqual(s.after, 2, 'Civilization time scale');
  assert.strictEqual(s.dt, 10);
  assert.ok(s.pop > 0 && s.E > 0, 'civilization produces energy');
  noErrors('timescales');
  await page.close();
});

test('UI: every view mode renders, report tabs work, tools carry prices, save/load round-trips', async function () {
  await open(web.url + '/BiosphereBlue.html');
  var s = await ev(function () {
    var out = { views: [] };
    ['elevation', 'temperature', 'moisture', 'rivers', 'wind', 'biome', 'plate', 'vegetation', 'rain', 'events'].forEach(function (m) { setViewMode(m); recolorAll(); out.views.push(m); });
    document.querySelector('#reportPanel .tab-btn[data-tab="civ"]').click();
    out.civSliders = document.querySelectorAll('#civPanelBody input[type=range]').length;
    document.querySelector('#reportPanel .tab-btn[data-tab="gaia"]').click();
    out.gaia = GAIA.msg.length > 0;
    document.querySelector('#reportPanel .tab-btn[data-tab="report"]').click();
    out.report = document.getElementById('reportBody').innerText.length > 20;
    out.costs = document.querySelectorAll('#toolPanel .cost').length;
    out.strip = document.querySelectorAll('#timeScaleStrip .ts-btn').length;
    for (var k = 0; k < 3; k++) simStep();
    var co2 = SIM.co2, year = SIM.year, pool = SIM.omega.pool;
    saveWorld(0);
    for (var k2 = 0; k2 < 3; k2++) simStep();
    loadWorld(0);
    out.roundTrip = Math.abs(SIM.co2 - co2) < 1e-6 && SIM.year === year && SIM.omega && SIM.omega.pool === pool;
    toggleHelp(true);
    out.equations = document.getElementById('liveEquations').children.length;
    toggleHelp(false);
    return out;
  });
  assert.strictEqual(s.views.length, 10);
  assert.strictEqual(s.civSliders, 10);
  assert.ok(s.gaia && s.report);
  assert.ok(s.costs >= 20, 'tool price tags ' + s.costs);
  assert.strictEqual(s.strip, 4);
  assert.ok(s.roundTrip, 'save/load round trip');
  assert.strictEqual(s.equations, 8);
  noErrors('ui');
  await page.close();
});

if (process.env.BB_DESKTOP) {
  test('desktop build: loads from local files only, no external requests, equations render offline', async function () {
    assert.ok(fs.existsSync(path.join(DESKTOP, 'index.html')), 'run `npm run copy-game` in biosphere-blue-build first');
    var d = await serve(DESKTOP);
    var external = [];
    errors = [];
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('request', function (r) { if (!r.url().startsWith(d.url)) external.push(r.url()); });
    page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
    await page.addInitScript(function () { try { localStorage.setItem('simearth_first_run_done_v1', '1'); } catch (e) {} });
    await page.goto(d.url + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction(function () { return typeof WORLD !== 'undefined' && WORLD && WORLD.ebm; }, null, { timeout: 120000 });
    var s = await ev(function () { toggleHelp(true); return { standalone: window.BB_STANDALONE, build: window.BB_BUILD, katexBase: window.KATEX_BASE }; });
    await page.waitForFunction(function () { return !!window.katex; }, null, { timeout: 15000 });
    var eq = await ev(function () { return document.querySelectorAll('#liveEquations .katex').length; });
    assert.strictEqual(s.standalone, 'desktop');
    assert.ok(s.katexBase && s.katexBase.indexOf('vendor') >= 0);
    assert.ok(eq >= 8, 'KaTeX rendered locally: ' + eq);
    assert.deepStrictEqual(external, [], 'external requests from the desktop build');
    assert.deepStrictEqual(errors, []);
    await page.close();
    d.server.close();
  });
}
