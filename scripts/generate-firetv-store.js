#!/usr/bin/env node
/**
 * Amazon Appstore submission art for the Fire TV app.
 *
 * Two kinds of output, both written to store/firetv/assets/:
 *   - Static art (icons, promo, TV background) drawn as SVG and rasterised by
 *     sharp, reusing the motif on the APK's leanback banner so the home-row
 *     tile and the store listing are recognisably the same app.
 *   - Screenshots captured from the real pages at 1920x1080 by Playwright,
 *     served over a local origin because the catalogue's art and links are
 *     root-relative.
 *
 * Usage:
 *   node scripts/generate-firetv-store.js            # art + screenshots
 *   node scripts/generate-firetv-store.js --art-only # skip the browser
 *
 * PW_CHROMIUM=/path/to/chrome overrides the browser binary when the container's
 * Chromium does not match the pinned Playwright build.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'store', 'firetv', 'assets');

// Must match MainActivity.kt's userAgentString suffix.
const UA = 'Mozilla/5.0 (Linux; Android 9; AFTKA) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0.0.0 Safari/537.36 BoardGamingHubTV/1.0';

const BG = '#0c1016';
const GOLD = '#f0d89c';
const SLATE = '#8098a8';
const MUTED = '#5a6874';
const LINE = '#2a3540';
const SERIF = 'Georgia, "Times New Roman", serif';

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- the motif

/**
 * The board grid with two stones and the flood line running past it — the same
 * mark as android-tv/.../drawable/banner.xml, expressed at arbitrary scale.
 * `s` scales a 320x180 design box.
 */
function motif(x, y, s) {
  const p = (a, b) => `${x + a * s},${y + b * s}`;
  return `
  <g stroke-linecap="round">
    <path d="M ${p(34, 54)} H ${x + 118 * s} M ${p(34, 90)} H ${x + 118 * s} M ${p(34, 126)} H ${x + 118 * s}
             M ${p(34, 54)} V ${y + 126 * s} M ${p(76, 54)} V ${y + 126 * s} M ${p(118, 54)} V ${y + 126 * s}"
          stroke="#3a5060" stroke-width="${2 * s}" fill="none"/>
    <circle cx="${x + 76 * s}" cy="${y + 54 * s}" r="${9 * s}" fill="${GOLD}"/>
    <circle cx="${x + 34 * s}" cy="${y + 126 * s}" r="${9 * s}" fill="${GOLD}"/>
    <circle cx="${x + 118 * s}" cy="${y + 90 * s}" r="${9 * s}" fill="${SLATE}"/>
    <path d="M ${p(150, 72)} H ${x + 296 * s}" stroke="#3a5060" stroke-width="${2 * s}" fill="none"/>
    <path d="M ${p(150, 124)} C ${p(178, 124)} ${p(186, 96)} ${p(214, 96)}
             C ${p(242, 96)} ${p(250, 120)} ${p(278, 120)}
             C ${p(288, 120)} ${p(292, 116)} ${p(296, 112)}
             L ${p(296, 152)} L ${p(150, 152)} Z"
          fill="#141c28"/>
    <path d="M ${p(150, 124)} C ${p(178, 124)} ${p(186, 96)} ${p(214, 96)}
             C ${p(242, 96)} ${p(250, 120)} ${p(278, 120)}
             C ${p(288, 120)} ${p(292, 116)} ${p(296, 112)}"
          stroke="${GOLD}" stroke-width="${4 * s}" fill="none"/>
  </g>`;
}

function text(x, y, str, { size, fill = GOLD, spacing = 0, weight = 400, anchor = 'start' }) {
  const esc = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<text x="${x}" y="${y}" fill="${fill}" font-family='${SERIF}' font-size="${size}"` +
    ` font-weight="${weight}" letter-spacing="${spacing}" text-anchor="${anchor}">${esc}</text>`;
}

// ------------------------------------------------------------------- pieces

// Square icon, drawn for the square rather than cropped from the wide banner:
// one centred grid with the flood line running through it. No wordmark, because
// at 114px a word is mush, and nothing near the edge, because Amazon masks the
// icon into a circle on some surfaces.
function iconSvg(size) {
  const u = size / 512;          // design is authored at 512
  const g0 = 128 * u, g1 = 384 * u, gm = (g0 + g1) / 2;
  const cell = (g1 - g0) / 2;
  const grid = 10 * u, stone = 30 * u;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${18 * u}" y="${18 * u}" width="${size - 36 * u}" height="${size - 36 * u}"
        rx="${40 * u}" fill="none" stroke="${LINE}" stroke-width="${6 * u}"/>
  <g stroke="#3a5060" stroke-width="${grid}" stroke-linecap="round" fill="none">
    <path d="M ${g0},${g0} H ${g1} M ${g0},${gm} H ${g1} M ${g0},${g1} H ${g1}"/>
    <path d="M ${g0},${g0} V ${g1} M ${gm},${g0} V ${g1} M ${g1},${g0} V ${g1}"/>
  </g>
  <circle cx="${gm}" cy="${g0}" r="${stone}" fill="${GOLD}"/>
  <circle cx="${g0}" cy="${gm}" r="${stone}" fill="${SLATE}"/>
  <path d="M ${g0 - cell * 0.42},${g1 - 6 * u}
           C ${g0 + cell * 0.30},${g1 - 6 * u} ${g0 + cell * 0.42},${g1 - 62 * u} ${gm},${g1 - 62 * u}
           C ${g1 - cell * 0.42},${g1 - 62 * u} ${g1 - cell * 0.30},${g1 - 6 * u} ${g1 + cell * 0.42},${g1 - 6 * u}"
        stroke="${GOLD}" stroke-width="${16 * u}" stroke-linecap="round" fill="none"/>
</svg>`;
}

// Merchandising banner. Amazon crops this at the edges on some surfaces, so
// everything that must survive sits inside the middle 80%.
function promoSvg() {
  const W = 1024, H = 500;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="0" width="${W}" height="5" fill="${GOLD}"/>
  ${text(72, 200, 'BOARD GAMING HUB', { size: 52, spacing: 6, weight: 700 })}
  ${text(74, 252, '36 games. One app. One remote.', { size: 28, fill: '#a8b0c0', spacing: 1 })}
  ${text(74, 432, 'FIRE TV', { size: 22, fill: MUTED, spacing: 7 })}
  <g transform="translate(676,262) scale(0.82)">${motif(0, 0, 1)}</g>
</svg>`;
}

// Fire TV detail-page background. Amazon lays its own text and buttons over
// this, so it stays dark and off-centre with nothing important in the middle.
function tvBackgroundSvg() {
  const W = 1920, H = 1080;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1016"/>
      <stop offset="55%" stop-color="#101822"/>
      <stop offset="100%" stop-color="#0a0e14"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  <g opacity="0.30" transform="translate(1120,300) scale(2.2)">${motif(0, 0, 1)}</g>
  <g opacity="0.10" transform="translate(120,620) scale(1.4)">${motif(0, 0, 1)}</g>
</svg>`;
}

// ------------------------------------------------------------------ writing

async function writeArt() {
  const jobs = [
    ['icon-512.png', iconSvg(512)],
    ['icon-114.png', iconSvg(114)],
    ['promo-1024x500.png', promoSvg()],
    ['tv-background-1920x1080.png', tvBackgroundSvg()],
  ];
  for (const [name, svg] of jobs) {
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, name));
    console.log('art       :', name);
  }
}

// -------------------------------------------------------------- screenshots

const TYPES = { '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml',
                '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg',
                '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

// Clean slug -> source file, exactly as netlify.toml redirects it in production.
const SLUGS = (() => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
  const map = { '/': '/index.html', '/tv': '/tv.html', '/play': '/play.html' };
  for (const g of data.games) map['/' + g.slug] = '/' + g.sourceHtml;
  return map;
})();

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (SLUGS[rel]) rel = SLUGS[rel];
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

// Capture at the CSS width the television actually lays out at, then let
// deviceScaleFactor bring it up to 1920x1080 — which is what the WebView does
// on the device. Shooting straight at 1920 CSS px is the wrong picture: it
// renders every game at desktop scale, stranding it in empty margin and
// understating how large things really are from a sofa.
//
// A 1080p Fire TV reports density 2.0, so a page asking for width=device-width
// gets 960 CSS px. tv.html pins width=1280 and is captured at that instead.
const SHOTS = [
  { file: 'screenshot-1-catalogue.png', url: '/tv', css: [1280, 720], scale: 1.5, settle: 1200 },
  { file: 'screenshot-2-floodline.png', url: '/floodline', css: [960, 540], scale: 2, settle: 2600 },
  { file: 'screenshot-3-bonneville.png', url: '/bonnevillespillwayoperator', css: [960, 540], scale: 2, settle: 2600 },
  // Chess lays its controls above the board, so the board is below the fold
  // at 540 css px; scroll to it rather than ship a screenshot of buttons.
  { file: 'screenshot-4-chess.png', url: '/chess', css: [960, 540], scale: 2, settle: 1800, scrollY: 300 },
  { file: 'screenshot-5-go.png', url: '/go', css: [960, 540], scale: 2, settle: 2000, scrollY: 180 },
  { file: 'screenshot-6-solitaire.png', url: '/solitaire', css: [960, 540], scale: 2, settle: 1800 },
];

async function writeScreenshots() {
  const { chromium } = require('playwright');
  const { server, port } = await serve();
  const exe = process.env.PW_CHROMIUM;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const base = 'http://127.0.0.1:' + port;
  const failures = [];

  for (const shot of SHOTS) {
    const page = await browser.newPage({
      viewport: { width: shot.css[0], height: shot.css[1] },
      deviceScaleFactor: shot.scale,
      // Wear the app's user agent so the pages render exactly as they do inside
      // it — nav.js drops the mouse-driven site header for this UA.
      userAgent: UA,
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      const resp = await page.goto(base + shot.url, { waitUntil: 'load', timeout: 30000 });
      if (!resp || resp.status() !== 200) {
        throw new Error(`HTTP ${resp ? resp.status() : 'none'} for ${shot.url}`);
      }
      await page.waitForTimeout(shot.settle);
      if (shot.scrollY) {
        await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
        await page.waitForTimeout(350);
      }
      // A 404 page screenshots just as happily as a game does, so check that
      // something actually rendered before trusting the file.
      const painted = await page.evaluate(() => document.body.innerText.trim().length +
        document.querySelectorAll('canvas,svg,button,table,#board,.board').length * 50);
      if (painted < 40) throw new Error(`page looks blank (score ${painted})`);
      const file = path.join(OUT, shot.file);
      await page.screenshot({ path: file });
      const meta = await sharp(file).metadata();
      if (meta.width !== 1920 || meta.height !== 1080) {
        throw new Error(`got ${meta.width}x${meta.height}, expected 1920x1080`);
      }
      console.log('screenshot:', shot.file, `${shot.css[0]}css x${shot.scale}`,
        errors.length ? `(page errors: ${errors.length})` : '');
    } catch (err) {
      failures.push(`${shot.file}: ${err.message}`);
      console.log('screenshot: FAILED', shot.file, '-', err.message);
    }
    await page.close();
  }

  await browser.close();
  server.close();

  if (failures.length) {
    console.error('\nScreenshot failures:\n  ' + failures.join('\n  '));
    process.exitCode = 1;
  }
}

(async () => {
  await writeArt();
  if (!process.argv.includes('--art-only')) await writeScreenshots();
  console.log('\nWrote to', path.relative(ROOT, OUT));
})();
