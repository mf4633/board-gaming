#!/usr/bin/env node
/** Stamp og:image + twitter:large_image on games that have ogImage in games.json. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8')).site.baseUrl.replace(/\/$/, '');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8')).games.filter(g => g.ogImage);

const OG_BLOCK_RE = /\s*<meta property="og:image"[^>]*>\s*(\n\s*<meta name="twitter:image"[^>]*>\s*)?/g;

for (const g of games) {
  const fpath = path.join(ROOT, g.sourceHtml);
  if (!fs.existsSync(fpath)) continue;
  let html = fs.readFileSync(fpath, 'utf8');
  const url = BASE + g.ogImage;
  const block = `\n<meta property="og:image" content="${url}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${url}">`;

  html = html.replace(OG_BLOCK_RE, '\n');
  html = html.replace(/<meta name="twitter:card" content="summary">\s*/g, '');
  const insertAfter = html.match(/<meta property="og:description"[^>]*>/);
  if (insertAfter) {
    html = html.replace(insertAfter[0], insertAfter[0] + block);
  } else {
    html = html.replace('</head>', block + '\n</head>');
  }
  fs.writeFileSync(fpath, html);
  console.log('stamped OG:', g.sourceHtml);
}