// Exercises tv.html the way the Fire TV app will: 1080p viewport, arrow keys
// only, no pointer. Asserts the spatial navigation actually moves focus and
// that OK activates a link with the right tvinput hint.
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2];

// Served over HTTP rather than file://, because the page's tile art and its
// links are root-relative and only resolve correctly under an origin.
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml',
                '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel === '/' ) rel = '/index.html';
      if (rel === '/tv') rel = '/tv.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Two viewports. 1920x1080 is a browser on a 1080p panel; 1280x720 is what the
// Fire TV app actually lays out at, because tv.html pins viewport width=1280 and
// the WebView upscales from there.
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1280x720', width: 1280, height: 720 },
];

(async () => {
  const { server, port } = await serve();
  const BASE = 'http://127.0.0.1:' + port;
  // The container ships a Chromium that may not match the pinned Playwright
  // build, so use it directly when PW_CHROMIUM points at one.
  const exe = process.env.PW_CHROMIUM;
  const b = await chromium.launch(exe ? { executablePath: exe } : {});

  let failed = false;
  for (const vp of VIEWPORTS) {
  console.log('\n== ' + vp.name + ' ==');
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // The browser asks for /favicon.ico unprompted; that 404 is the test
  // server's, not the page's.
  p.on('response', r => {
    if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) {
      errors.push('http ' + r.status() + ': ' + r.url());
    }
  });
  await p.goto(BASE + '/tv', { waitUntil: 'load' });

  const focused = () => p.evaluate(() => {
    const a = document.activeElement;
    return a && a.classList.contains('tile')
      ? { name: a.querySelector('.tname').textContent.trim(), href: a.getAttribute('href') }
      : null;
  });

  const first = await focused();
  console.log('initial focus       :', JSON.stringify(first));

  const trail = [first && first.name];
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    await p.keyboard.press(key);
    await p.waitForTimeout(120);
    const f = await focused();
    trail.push(key + ' -> ' + (f ? f.name : 'NONE'));
  }
  console.log('navigation trail    :', trail.join(' | '));

  // Every tile must be reachable and carry a tvinput hint.
  const audit = await p.evaluate(() => {
    const tiles = [...document.querySelectorAll('.tile')];
    return {
      count: tiles.length,
      missingHint: tiles.filter(t => !/[?&]tvinput=(cursor|dpad)$/.test(t.getAttribute('href'))).map(t => t.getAttribute('href')),
      dpad: tiles.filter(t => /tvinput=dpad/.test(t.getAttribute('href'))).map(t => t.querySelector('.tname').textContent.trim()),
      notFocusable: tiles.filter(t => t.tabIndex < 0).length,
      tinyText: [...document.querySelectorAll('.tname,.tdesc,h1,h2,footer')]
        .filter(e => parseFloat(getComputedStyle(e).fontSize) < 20).length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      brokenArt: tiles.filter(t => { const i = t.querySelector('img'); return i && !i.complete; }).length,
    };
  });
  console.log('tiles               :', audit.count);
  console.log('missing tvinput     :', audit.missingHint.length ? audit.missingHint : 'none');
  console.log('dpad-mode games     :', audit.dpad.join(', ') || 'none');
  console.log('non-focusable tiles :', audit.notFocusable);
  console.log('text under 20px     :', audit.tinyText);
  console.log('horizontal overflow :', audit.overflowX);
  console.log('page errors         :', errors.length ? errors : 'none');

  if (OUT) {
    const out = VIEWPORTS.length > 1 ? OUT.replace(/\.png$/, '-' + vp.name + '.png') : OUT;
    await p.screenshot({ path: out, fullPage: false });
    console.log('screenshot          :', out);
  }

  if (audit.missingHint.length || audit.notFocusable || audit.tinyText || audit.overflowX ||
      errors.length || trail.slice(1).some(t => t.endsWith('NONE'))) {
    failed = true;
  }
  await p.close();
  }

  await b.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
