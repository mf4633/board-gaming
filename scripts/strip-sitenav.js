#!/usr/bin/env node
/**
 * Remove legacy #siteNav blocks from game HTML files.
 * Ensures nav.js + analytics.js are present before </body>.
 * Usage: node scripts/strip-sitenav.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));

const PAT_SITENAV_STYLE = /<style id="siteNav-css">[\s\S]*?<\/style>\s*/g;
const PAT_SITENAV_HTML = /<div id="siteNav">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*/g;
const PAT_MOBILE_CSS = /[ \t]*@media \(max-width: 768px\) \{\s*#mobileNav[^\n]*\n(?:[^\n]*\n){0,20}?\s*\}\s*\n/g;
const PAT_MOBILE_RULE = /^\s*#mobileNav \{[^\n]*\}\s*\n/gm;
const PAT_MOBILE_HTML = /<div id="mobileNav">[\s\S]*?<\/div>\s*<\/div>\s*/g;
const PAT_ADSENSE = /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>\s*/g;

const GAME_FILES = data.games.map(g => g.sourceHtml);
const HUB_FILES = ['about.html', 'privacy.html', 'apps.html', 'index.html', 'play.html'];

function ensureScripts(src, fname) {
  if (!src.includes('nav.js')) {
    src = src.replace(/<\/body>/i, '<script src="/nav.js" defer></script>\n</body>');
  }
  if (!src.includes('analytics.js') && !fname.includes('lovedwords')) {
    src = src.replace(/<\/body>/i, '<script src="/analytics.js"></script>\n</body>');
  }
  return src;
}

function processFile(fname) {
  const fpath = path.join(ROOT, fname);
  if (!fs.existsSync(fpath)) {
    console.log(`  SKIP (missing): ${fname}`);
    return;
  }
  let src = fs.readFileSync(fpath, 'utf8');
  const before = src.length;
  src = src.replace(PAT_SITENAV_STYLE, '');
  src = src.replace(PAT_SITENAV_HTML, '');
  src = src.replace(PAT_MOBILE_HTML, '');
  src = src.replace(PAT_MOBILE_CSS, '');
  src = src.replace(PAT_MOBILE_RULE, '');

  // Ads only on listing pages (play.html, apps.html)
  if (GAME_FILES.includes(fname)) {
    src = src.replace(PAT_ADSENSE, '');
  }

  src = ensureScripts(src, fname);
  if (src.length !== before || !fs.readFileSync(fpath, 'utf8').includes('nav.js')) {
    fs.writeFileSync(fpath, src);
    console.log(`  cleaned: ${fname}`);
  }
}

console.log('Stripping legacy siteNav...');
[...GAME_FILES, ...HUB_FILES].forEach(processFile);
console.log('Done.');