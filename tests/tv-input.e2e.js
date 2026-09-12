// Does the Fire TV input model actually drive these games?
//
// MainActivity.kt turns an OK press into a synthesised touchscreen gesture at
// the virtual pointer: ACTION_DOWN, optional ACTION_MOVEs, ACTION_UP. The
// WebView turns that into touchstart/pointerdown/mousedown/click. The whole app
// rests on that chain reaching handlers written for a mouse.
//
// This dispatches real touch events at real controls, at the viewport and user
// agent the television uses, and asserts the page actually reacted. It is not
// hardware — it cannot prove Fire OS's WebView behaves identically — but it
// does test the assumption on the same event path, which beats assuming.
//
//   PW_CHROMIUM=/path/to/chrome node tests/tv-input.e2e.js
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const UA = 'Mozilla/5.0 (Linux; Android 9; AFTKA) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0.0.0 Safari/537.36 BoardGamingHubTV/1.0';

const TYPES = { '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml',
                '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg' };
const SLUGS = (() => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
  const m = { '/': '/index.html', '/tv': '/tv.html', '/play': '/play.html' };
  for (const g of d.games) m['/' + g.slug] = '/' + g.sourceHtml;
  return m;
})();

function serve() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (SLUGS[rel]) rel = SLUGS[rel];
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end('nf'); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve({ s, port: s.address().port }));
  });
}

// Each case names a control a person would actually aim the pointer at.
const CASES = [
  { name: 'Floodline — Free Play', url: '/floodline', text: 'Free Play' },
  { name: 'Chess — 2 Players', url: '/chess', text: '2 Players' },
  { name: 'Solitaire — New Deal', url: '/solitaire', text: 'NEW DEAL' },
  // Tapping a board intersection is the real interaction; "Reset Game" on an
  // already-empty board correctly changes nothing, which tests nothing.
  { name: 'Go — place a stone', url: '/go', sel: '#board .cell', nth: 40 },
  { name: 'Bonneville — Bonneville Dam', url: '/bonnevillespillwayoperator', text: 'Bonneville Dam' },
  // 2048 is marked tvinput=dpad, so the arrows are handed to the page
  // untouched. Testing a tap here would exercise a path it never gets.
  { name: '2048 — ArrowLeft (D-pad mode)', url: '/2048', key: 'ArrowLeft' },
];

(async () => {
  const { s, port } = await serve();
  const base = 'http://127.0.0.1:' + port;
  const exe = process.env.PW_CHROMIUM;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let failed = 0;

  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2,
      userAgent: UA,
      hasTouch: true,          // so tap() dispatches real touch events
      isMobile: false,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(base + c.url, { waitUntil: 'load' });
      await page.waitForTimeout(1800);

      if (c.key) {
        const read = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
        const was = await read();
        await page.keyboard.press(c.key);
        await page.waitForTimeout(600);
        const now = await read();
        if (was === now) throw new Error(`${c.key} produced no change`);
        console.log(`ok   ${c.name.padEnd(34)} ${c.key} moved the board`);
        await ctx.close();
        continue;
      }

      // Locate the control by its visible text, the way a person aiming a
      // pointer would find it.
      const box = await page.evaluate(({ needle, sel, nth }) => {
        if (sel) {
          const list = [...document.querySelectorAll(sel)];
          const el = list[nth || 0];
          if (!el) return null;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return null;
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        const els = [...document.querySelectorAll('button,a,[role=button],div,span,td')];
        const hit = els.find((e) => {
          const t = (e.textContent || '').trim();
          if (!t || t.length > 60 || !t.includes(needle)) return false;
          const r = e.getBoundingClientRect();
          return r.width > 8 && r.height > 8 && r.top >= 0 && r.top < window.innerHeight;
        });
        if (!hit) return null;
        const r = hit.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, { needle: c.text, sel: c.sel, nth: c.nth });

      if (!box) throw new Error(`target ${c.sel || `"${c.text}"`} not found on screen`);

      const before = await page.evaluate(() => document.body.innerHTML.length);
      // This is the app's gesture: a touch down and up at the pointer.
      await page.touchscreen.tap(box.x, box.y);
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => document.body.innerHTML.length);

      if (before === after) throw new Error('tap produced no change in the DOM');
      console.log(`ok   ${c.name.padEnd(34)} tap at ${Math.round(box.x)},${Math.round(box.y)}  DOM ${before} -> ${after}`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${c.name.padEnd(34)} ${err.message}`);
    }
    await ctx.close();
  }

  // Hover is the other half of the input layer: the app sends ACTION_HOVER_MOVE
  // from a mouse source so games that draw a preview under the pointer keep
  // doing so. Go marks its preview with .hover-stone, which makes it checkable.
  {
    const ctx = await browser.newContext({
      viewport: { width: 960, height: 540 }, deviceScaleFactor: 2,
      userAgent: UA, hasTouch: true,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(base + '/go', { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const box = await page.evaluate(() => {
        const el = [...document.querySelectorAll('#board .cell')][44];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (!box) throw new Error('no board cell to hover');
      // 81 .hover-stone elements exist from the start, one per cell, revealed
      // by CSS :hover — so measure the hovered one's opacity, not its presence.
      const opacityOf = () => page.evaluate(() => {
        const cell = [...document.querySelectorAll('#board .cell')][44];
        const stone = cell && cell.querySelector('.hover-stone');
        return stone ? parseFloat(getComputedStyle(stone).opacity) : -1;
      });
      const before = await opacityOf();
      await page.mouse.move(box.x, box.y);
      await page.waitForTimeout(400);
      const after = await opacityOf();
      if (before < 0) throw new Error('no .hover-stone inside the target cell');
      if (!(after > before)) throw new Error(`hover preview did not light up (opacity ${before} -> ${after})`);
      console.log(`ok   ${'Go — hover preview'.padEnd(34)} opacity ${before} -> ${after} under the pointer`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${'Go — hover preview'.padEnd(34)} ${err.message}`);
    }
    await ctx.close();
  }

  await browser.close();
  s.close();
  const total = CASES.length + 1;
  console.log(failed ? `\n${failed} of ${total} failed` : `\nall ${total} checks passed: taps and hover both reach the games`);
  process.exit(failed ? 1 : 0);
})();
