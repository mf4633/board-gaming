/* Syncs PAX 2.0, the tribute to Len Dorfman's PAX Chess, into boardgaminghub.
 *
 * Source of truth is ~/pax-chess, the public repo that deploys to
 * https://mf4633.github.io/pax-chess/. Override it with PAX_SRC. This copies
 * the page, engine and art into /pax/ and applies what the hub needs:
 *
 *   - head tags: title, canonical, Open Graph, the shared site nav
 *   - the 13.7 MB opening book (his MARK10 data) is fetched from GitHub Pages
 *     instead of being copied, so there is one copy of it (CORS there is *)
 *   - the tic-tac-toe link points at the GitHub Pages copy
 *   - a credits line linking the repo, where his family can ask for changes
 *
 * Run scripts/stamp-og-meta.js afterwards to restore the OG card tags.
 *
 *   node scripts/sync-pax.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SRC = process.env.PAX_SRC || path.join(os.homedir(), 'pax-chess');
const DEST = path.join(ROOT, 'pax');
const CANONICAL = 'https://boardgaminghub.com/pax/';
const PAGES = 'https://mf4633.github.io/pax-chess/';
const REPO = 'https://github.com/mf4633/pax-chess';

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
  console.error('source not found: ' + SRC);
  process.exit(1);
}

function mustReplace(html, from, to, label) {
  if (html.indexOf(from) === -1) {
    console.error('sync-pax: expected text not found (' + label + '): ' + from);
    process.exit(1);
  }
  return html.split(from).join(to);
}

/* ---- index.html ---- */
let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

const TITLE = 'PAX Chess — A Tribute to Len Dorfman | Board Gaming Hub';
const DESC = "Play PAX 2.0, a tribute to Len Dorfman's PAX Chess (2001): his opening book, his original art, and the learning he planned. Free, in the browser.";

const head = [
  '<title>' + TITLE + '</title>',
  '<link rel="canonical" href="' + CANONICAL + '">',
  '<meta property="og:type" content="website">',
  '<meta property="og:url" content="' + CANONICAL + '">',
  '<meta property="og:title" content="' + TITLE + '">',
  '<meta property="og:description" content="' + DESC + '">',
].join('\n');

if (html.indexOf('rel="canonical"') === -1) {
  html = mustReplace(html, '</head>', head + '\n</head>', 'head');
}

// The book stays on GitHub Pages; engine.js, tables.json and art/ are copied.
html = mustReplace(html, "fetch('mark10w.txt')", "fetch('" + PAGES + "mark10w.txt')", 'book fetch');
html = mustReplace(html, 'href="tictactoe.html"', 'href="' + PAGES + 'tictactoe.html"', 'tic-tac-toe link');

const CREDITS = '<p class="foot">Source and credits: <a href="' + REPO + '">github.com/mf4633/pax-chess</a>. ' +
  "PAX Chess, its opening book, art and text are Len Dorfman's work, shared here unchanged as a tribute. " +
  'If you are a member of his family and want anything changed or removed, please open an issue there and it will be done.</p>';
if (html.indexOf(REPO) === -1) {
  // The page ends with one wrapper </div> before its <script>; credits go inside it.
  const i = html.lastIndexOf('</div>', html.indexOf('<script>', html.indexOf('class="foot"')));
  if (i === -1) { console.error('sync-pax: footer anchor not found'); process.exit(1); }
  html = html.slice(0, i) + CREDITS + '\n' + html.slice(i);
}

if (html.indexOf('src="/nav.js"') === -1) {
  html = mustReplace(html, '</body>', '<script src="/nav.js" defer></script>\n</body>', 'body');
}

fs.mkdirSync(path.join(DEST, 'art'), { recursive: true });
fs.writeFileSync(path.join(DEST, 'index.html'), html, 'utf8');
console.log('index.html   ' + html.length + ' bytes');

/* ---- engine, tuned tables, original art ---- */
for (const f of ['engine.js', 'tables.json']) {
  fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
  console.log(f.padEnd(12) + ' copied');
}
for (const f of fs.readdirSync(path.join(SRC, 'art'))) {
  fs.copyFileSync(path.join(SRC, 'art', f), path.join(DEST, 'art', f));
  console.log(('art/' + f).padEnd(12) + ' copied');
}

/* ---- sanity: every relative asset the page points at must exist ---- */
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="(?!https?:|\/|#|data:|mailto:)([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/url\("(?!https?:|\/|data:)([^"]+)"\)/g)) refs.add(m[1]);
for (const m of html.matchAll(/(?:fetch|Worker)\('(?!https?:|\/)([^']+)'\)/g)) refs.add(m[1]);
let missing = 0;
for (const r of refs) {
  if (!fs.existsSync(path.join(DEST, r))) { console.error('MISSING ' + r); missing++; }
}
if (missing) process.exit(1);
console.log('assets ok    ' + [...refs].join(', '));
