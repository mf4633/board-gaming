#!/usr/bin/env node
/**
 * Stamp the AdSense head block (scripts/adsense-snippet.js) into every
 * hand-written page. Generated pages (index.html) get it from
 * generate-catalog.js. Idempotent: re-running refreshes the block.
 *
 * Excluded: LovedWords (made for young children, no ads), PAX (a memorial
 * tribute to Len Dorfman, no ads), tv.html (the Fire TV
 * hub runs inside the TV app), 404.html.
 * Usage: node scripts/stamp-adsense.js
 */
const fs = require('fs');
const path = require('path');
const { stamp } = require('./adsense-snippet');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));

const SKIP_GAMES = new Set(['lovedwords', 'pax']);
const PAGES = ['about.html', 'privacy.html', 'contact.html', 'apps.html', 'terms.html'];

const files = [
  ...data.games.filter(g => !SKIP_GAMES.has(g.slug)).map(g => g.sourceHtml),
  ...PAGES,
];

let n = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.log(`  skip (missing): ${f}`); continue; }
  const src = fs.readFileSync(p, 'utf8');
  const out = stamp(src);
  if (out !== src) { fs.writeFileSync(p, out); n++; }
}
console.log(`stamp-adsense: ${n} file(s) updated of ${files.length}`);
