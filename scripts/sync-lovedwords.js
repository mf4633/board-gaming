/* Syncs the standalone LovedWords PWA into boardgaminghub.
 *
 * Source of truth is ~/Desktop/AI/lovedwords, the same tree that deploys to
 * lovedwords.netlify.app. Override it with LOVEDWORDS_SRC. This copies it in and
 * re-applies the three things the hub needs that the standalone build has no
 * reason to carry: a canonical URL, the shared site nav, and a manifest id
 * scoped to /lovedwords/ rather than the site root.
 *
 * Run scripts/stamp-og-meta.js afterwards to restore the OG card tags.
 *
 *   node scripts/sync-lovedwords.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SRC = process.env.LOVEDWORDS_SRC ||
            path.join(os.homedir(), 'Desktop', 'AI', 'lovedwords');
const DEST = path.join(ROOT, 'lovedwords');
const CANONICAL = 'https://boardgaminghub.com/lovedwords/';

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
  console.error('source not found: ' + SRC);
  process.exit(1);
}

/* ---- index.html ---- */
let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

if (html.indexOf('rel="canonical"') === -1) {
  html = html.replace('</title>', '</title>\n<link rel="canonical" href="' + CANONICAL + '" />');
}
if (html.indexOf('src="/nav.js"') === -1) {
  html = html.replace('</body>', '<script src="/nav.js" defer></script>\n</body>');
}

fs.writeFileSync(path.join(DEST, 'index.html'), html, 'utf8');
console.log('index.html   ' + html.length + ' bytes');

/* ---- manifest: the standalone build claims id "/", which on the hub would
       collide with the site root. Scope it to the app's own directory. ---- */
const man = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.webmanifest'), 'utf8'));
man.id = '/lovedwords/';
fs.writeFileSync(path.join(DEST, 'manifest.webmanifest'), JSON.stringify(man, null, 2) + '\n', 'utf8');
console.log('manifest     id=' + man.id + ' start_url=' + man.start_url);

/* ---- service worker: registered as ./sw.js, so its scope is /lovedwords/
       and it cannot touch the rest of the site ---- */
fs.copyFileSync(path.join(SRC, 'sw.js'), path.join(DEST, 'sw.js'));
const swVer = (fs.readFileSync(path.join(DEST, 'sw.js'), 'utf8')
  .match(/CACHE_VERSION\s*=\s*"([^"]+)"/) || [])[1];
console.log('sw.js        CACHE_VERSION=' + swVer);

/* ---- icons the manifest and head actually reference ---- */
const icons = ['icon-192.png', 'icon-512.png', 'icon-1024.png', 'icon-maskable-512.png'];
if (!fs.existsSync(path.join(DEST, 'icons'))) fs.mkdirSync(path.join(DEST, 'icons'));
for (const f of icons) {
  const from = path.join(SRC, 'icons', f);
  if (!fs.existsSync(from)) { console.log('icons/       MISSING ' + f); continue; }
  fs.copyFileSync(from, path.join(DEST, 'icons', f));
  console.log('icons/       ' + f);
}

/* ---- sanity: every local asset the page or manifest points at must exist ---- */
const refs = new Set();
for (const m of html.matchAll(/(?:href|src)="(?!https?:|data:|\/nav\.js)([^"#?]+)"/g)) refs.add(m[1]);
for (const i of man.icons || []) refs.add(i.src);
let missing = 0;
for (const r of refs) {
  const p = path.join(DEST, r.replace(/^\.\//, ''));
  if (!fs.existsSync(p)) { console.log('MISSING REF  ' + r); missing++; }
}
console.log(missing ? missing + ' missing references' : 'all ' + refs.size + ' local references resolve');
process.exitCode = missing ? 1 : 0;
