// Headless Floodline harness: loads the game's <script> into a vm with a
// permissive DOM stub, then runs scenarios with no player input.
// usage: node harness.js <path-to-Floodline.html> [scenarioId|all] [--json] [--series]
const fs = require('fs'), vm = require('vm');
const htmlPath = process.argv[2];
const which = process.argv[3] || 'all';
const html = fs.readFileSync(htmlPath, 'utf8').split('\r\n').join('\n');
const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
if (!m) throw new Error('no main <script> block');
let src = m[1];

// ---- DOM stub ----
function el() {
  const node = {
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], textContent: '', innerHTML: '', value: '', width: 800, height: 600, disabled: false, checked: false,
    addEventListener() {}, removeEventListener() {}, appendChild(c) { return c; }, removeChild() {}, remove() {},
    querySelector() { return el(); }, querySelectorAll() { return []; }, getAttribute() { return null; }, setAttribute() {},
    focus() {}, blur() {}, click() {}, closest() { return null; }, insertAdjacentHTML() {}, replaceWith() {}, cloneNode() { return el(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }, parentNode: null,
    getContext() { return ctx2d(); }, toDataURL() { return ''; },
  };
  return node;
}
function ctx2d() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return el();
      if (typeof k !== 'string') return undefined;
      return function () {
        if (k === 'measureText') return { width: 10 };
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return { addColorStop() {} };
        if (k === 'getImageData') return { data: new Uint8ClampedArray(4) };
        return undefined;
      };
    },
    set() { return true; },
  });
}
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
  clear() { for (const k in store) delete store[k]; },
};
const document = {
  getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], createElement: () => el(),
  addEventListener() {}, body: el(), documentElement: el(), head: el(), hidden: false, title: '',
};
const window = {
  addEventListener() {}, removeEventListener() {}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  location: { search: '', href: 'http://x/', hash: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage, requestAnimationFrame() {},
};
function param() { return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} }; }
class AudioCtxStub {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; }
  createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
  createOscillator() { return { frequency: param(), detune: param(), type: 'sine', connect() {}, start() {}, stop() {}, disconnect() {} }; }
  createBiquadFilter() { return { frequency: param(), Q: param(), gain: param(), type: 'lowpass', connect() {}, disconnect() {} }; }
  createBuffer(c, l, r) { return { getChannelData() { return new Float32Array(l); } }; }
  createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {}, stop() {}, disconnect() {}, playbackRate: param() }; }
  resume() { return Promise.resolve(); }
}
const sandbox = {
  document, window, localStorage,
  navigator: { userAgent: 'node', share: null, clipboard: null, language: 'en-US' },
  location: window.location, requestAnimationFrame() {}, cancelAnimationFrame() {},
  setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
  performance: { now: () => Date.now() }, console, Math, Date, JSON, Number, String, Array, Object,
  Float32Array, Float64Array, Uint8Array, Int32Array, Uint32Array, Uint8ClampedArray, Int8Array, Int16Array, Uint16Array,
  Set, Map, Promise, Proxy, Reflect, Error, parseFloat, parseInt, isFinite, isNaN, Intl,
  AudioContext: AudioCtxStub, webkitAudioContext: AudioCtxStub, Image: function () { return el(); },
  alert() {}, confirm() { return false; }, prompt() { return null; },
  URLSearchParams, encodeURIComponent, decodeURIComponent,
  fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
};
sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.window.document = document;
src += '\n;__export = { state, SCENARIOS, startScenario, step, PHYS_DT: (typeof PHYS_DT === "undefined" ? 1/60 : PHYS_DT), T, idx, getDamagePct, getInfraDamage, get COLS(){return COLS;}, get ROWS(){return ROWS;}, TOOLS, starsForPct, endGame, ctx: (typeof __ctx==="undefined"?null:__ctx) };\n';
sandbox.__export = null;
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename: 'floodline.js' }); }
catch (e) { console.error('LOAD ERROR', e.stack); process.exit(1); }
const G = sandbox.__export;
if (!G) { console.error('export failed'); process.exit(1); }

function volume(st) { let v = 0; const w = st.water; for (let i = 0; i < w.length; i++) v += w[i]; return v; }
function riverRow0(st, T, COLS) { let n = 0; for (let x = 0; x < COLS; x++) if (st.type[x] === T.RIVER) n++; return n; }

function run(sc) {
  const st = G.state;
  st.campaign = { active: false, index: 0 };
  G.startScenario(sc);
  const COLS = G.COLS, ROWS = G.ROWS;
  const out = { id: sc.id, cols: COLS, rows: ROWS, riverRow0: riverRow0(st, G.T, COLS), riverCells: st.riverCells.length, v0: volume(st) };
  st.storming = true;
  if (process.argv.includes('--peak')) {
    const dur = sc._effectiveDuration ?? sc.duration; let pr = 0, pi = 0, pt = 0;
    for (let t = 0; t < dur; t += 1) { const p = sc.stormProfile(t); if (p.rain > pr) pr = p.rain; if (p.inflow > pi) { pi = p.inflow; pt = t; } }
    console.log(sc.id, 'peakRain', pr.toFixed(1), 'peakInflow', pi.toFixed(2), 'at', pt, 'dur', dur, 'inflowCells', st.inflowCells.length, 'forecast', JSON.stringify(st.scenarioForecast));
    process.exit(0);
  }
  if (process.argv.includes('--profile')) {
    const tb = sc.townBox; const cy = Math.floor(tb.y * ROWS + tb.h / 2); const cx = Math.floor(tb.x * COLS + tb.w / 2);
    const names = Object.keys(G.T);
    console.log('-- row profile y=' + cy + ' (x: elev type water)');
    let line = [];
    for (let x = 0; x < COLS; x++) { const i = cy * COLS + x; line.push(x + ':' + st.elev[i].toFixed(1) + names[st.type[i]][0] + (st.riverMask && st.riverMask[i] ? '*' : '')); }
    console.log(line.join(' '));
    console.log('-- col profile x=' + cx);
    line = [];
    for (let y = 0; y < ROWS; y++) { const i = y * COLS + cx; line.push(y + ':' + st.elev[i].toFixed(1) + names[st.type[i]][0] + (st.riverMask && st.riverMask[i] ? '*' : '')); }
    console.log(line.join(' '));
    process.exit(0);
  }
  const dur = sc._effectiveDuration ?? sc.duration;
  const dt = G.PHYS_DT;
  let peakStage = 0, peakVol = 0, maxDepth = 0, maxDepthTown = 0, t = 0, steps = 0, nan = false;
  const series = [];
  const t0 = Date.now();
  while (t < dur) {
    st.time += dt; G.step(dt); t += dt; steps++;
    if (steps % 60 === 0) {
      const dmg = G.getDamagePct();
      const vol = volume(st);
      if (!isFinite(vol)) { nan = true; break; }
      let md = 0, mdt = 0;
      for (let i = 0; i < st.water.length; i++) { if (st.water[i] > md) md = st.water[i]; if ((st.type[i] === G.T.TOWN) && st.water[i] > mdt) mdt = st.water[i]; }
      maxDepth = Math.max(maxDepth, md); maxDepthTown = Math.max(maxDepthTown, mdt);
      peakStage = Math.max(peakStage, st.stage); peakVol = Math.max(peakVol, vol);
      if (steps % 600 === 0) {
        const band = (y0, y1) => { let n = 0, sum = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < COLS; x++) { const i = y * COLS + x; if (st.riverMask ? st.riverMask[i] : st.type[i] === G.T.RIVER) { n++; sum += st.water[i]; } } return n ? +(sum / n).toFixed(2) : -1; };
        let tn = 0, ts = 0; for (let i = 0; i < st.water.length; i++) if (st.type[i] === G.T.TOWN) { tn++; ts += st.water[i]; }
        series.push({ t: Math.round(t), rain: +st.currentRain.toFixed(1), inflow: +st.currentInflow.toFixed(2), wsQ: Math.round(st.watershedQ || 0), outQ: Math.round(st.outflowQ || 0), stage: +st.stage.toFixed(2), rIn: band(2, 5), rMid: band((ROWS / 2) | 0, ((ROWS / 2) | 0) + 3), rOut: band(ROWS - 5, ROWS - 2), tw: +st.tailwaterStage.toFixed(2), vol: Math.round(vol), dmg: +dmg.toFixed(1), md: +md.toFixed(2), townMean: tn ? +(ts / tn).toFixed(2) : 0, mdt: +mdt.toFixed(2), breaches: st.stats.breaches, vmax: +(st.vmax || 0).toFixed(2), sub: st.subSteps || 0 });
      }
    }
  }
  out.ms = Date.now() - t0; out.steps = steps; out.nan = nan;
  out.finalDamage = +G.getDamagePct().toFixed(1);
  out.hosp = +G.getInfraDamage(G.T.HOSPITAL).toFixed(1); out.school = +G.getInfraDamage(G.T.SCHOOL).toFixed(1); out.town = +G.getInfraDamage(G.T.TOWN).toFixed(1);
  out.winDamage = sc.winDamage; out.stars = G.starsForPct(out.finalDamage);
  out.peakStage = +peakStage.toFixed(2); out.maxDepth = +maxDepth.toFixed(2); out.maxDepthTown = +maxDepthTown.toFixed(2);
  out.peakVol = Math.round(peakVol); out.vEnd = Math.round(volume(st)); out.breaches = st.stats.breaches;
  out.series = series;
  return out;
}
const pad = (v, n) => String(v).padEnd(n);
const rowFmt = r => pad(r.id, 14) + pad(r.cols + 'x' + r.rows, 9) + pad(r.riverRow0, 6) + pad(r.riverCells, 6) + pad(Math.round(r.v0), 8) + pad(r.peakVol, 9) + pad(r.vEnd, 8) + pad(r.peakStage, 7) + pad(r.maxDepth, 6) + pad(r.maxDepthTown, 7) + pad(r.finalDamage, 7) + pad(r.winDamage, 5) + pad(r.stars, 2) + pad(r.hosp, 6) + pad(r.school, 5) + pad(r.town, 6) + pad(r.breaches, 5) + pad(r.nan ? 'Y' : '', 4) + r.ms;
const ids = which === 'all' ? G.SCENARIOS.map(s => s.id) : which.split(',');
const results = [];
for (const id of ids) {
  const sc = G.SCENARIOS.find(s => s.id === id);
  if (!sc) { console.error('no scenario', id); continue; }
  try { const r = run(sc); results.push(r); if (process.argv.includes('--live')) { console.log(rowFmt(r)); if (process.argv.includes('--series')) for (const x of r.series) console.log(JSON.stringify(x)); } } catch (e) { console.error('RUN ERROR', id, e.stack); }
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(results, null, 1)); }
else {
  console.log(pad('id', 14) + pad('grid', 9) + pad('rivR0', 6) + pad('rivN', 6) + pad('v0', 8) + pad('peakVol', 9) + pad('vEnd', 8) + pad('stage', 7) + pad('maxD', 6) + pad('maxDT', 7) + pad('dmg%', 7) + pad('win', 5) + pad('*', 2) + pad('hosp', 6) + pad('sch', 5) + pad('town', 6) + pad('brch', 5) + pad('nan', 4) + 'ms');
  for (const r of results) {
    console.log(pad(r.id, 14) + pad(r.cols + 'x' + r.rows, 9) + pad(r.riverRow0, 6) + pad(r.riverCells, 6) + pad(Math.round(r.v0), 8) + pad(r.peakVol, 9) + pad(r.vEnd, 8) + pad(r.peakStage, 7) + pad(r.maxDepth, 6) + pad(r.maxDepthTown, 7) + pad(r.finalDamage, 7) + pad(r.winDamage, 5) + pad(r.stars, 2) + pad(r.hosp, 6) + pad(r.school, 5) + pad(r.town, 6) + pad(r.breaches, 5) + pad(r.nan ? 'Y' : '', 4) + r.ms);
  }
  if (process.argv.includes('--series')) for (const r of results) { console.log('--', r.id); for (const s of r.series) console.log(JSON.stringify(s)); }
}

process.exit(0);
