#!/usr/bin/env node
/** Generate 1200×630 OG card SVGs + PNGs for top shareable games. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'og');

const CARDS = [
  { file: 'wordform', title: 'WORDFORM', sub: 'Daily 5-letter word puzzle', accent: '#d4a050', bg: '#1a1410' },
  { file: 'chess', title: 'CHESS', sub: 'Free online — vs AI or 2-player', accent: '#f0d89c', bg: '#1a1410' },
  { file: 'sudoku', title: 'SUDOKU', sub: 'Easy to expert — no signup', accent: '#94c3e8', bg: '#0c1016' },
  { file: 'floodline', title: 'FLOODLINE', sub: 'California flood-defense sim', accent: '#7dd3fc', bg: '#0a0e14' },
  { file: 'eclipse', title: 'ECLIPSE PREDICTOR', sub: '2026 & 2027 paths on a 3D globe', accent: '#ffd040', bg: '#04060e' },
  { file: 'drift', title: 'DRIFT', sub: 'Daily word ladder puzzle', accent: '#a0d0a8', bg: '#0c1016' },
  { file: 'solitaire', title: 'SOLITAIRE', sub: 'Klondike in your browser', accent: '#f0d89c', bg: '#0c1016' },
  { file: 'bonneville', title: 'BONNEVILLE DAM', sub: 'Columbia River operator sim', accent: '#80c8a8', bg: '#0a1218' },
  { file: 'apoapsis', title: 'APOAPSIS', sub: '3D rocket flight & orbital mechanics', accent: '#7dd3fc', bg: '#04060e' },
  { file: 'biosphereblue', title: 'BIOSPHERE BLUE', sub: 'Planet-scale climate & ecology sim', accent: '#5ec8e0', bg: '#04101a' },
  { file: 'metropolis2k', title: 'METROPOLIS 2K', sub: 'City-building sim — districts & bonds', accent: '#f0c060', bg: '#0c1016' },
  { file: 'tower', title: 'TOWER · SKYSTACK', sub: 'High-rise operations tycoon', accent: '#e0b070', bg: '#100c08' },
  { file: 'doctrine', title: 'DOCTRINE', sub: 'Geopolitical sim · 1990–2050', accent: '#d08868', bg: '#0a0c12' },
  { file: 'cliffwalkers', title: 'CLIFFWALKERS', sub: 'Save the wee folk — puzzle platformer', accent: '#90c8f0', bg: '#0a1016' },
];

function xmlEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svg({ title, sub, accent, bg }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${bg}"/>
  <rect x="0" y="0" width="1200" height="6" fill="${accent}"/>
  <text x="80" y="290" fill="${accent}" font-family="Georgia, serif" font-size="72" font-weight="700" letter-spacing="12">${xmlEsc(title)}</text>
  <text x="80" y="360" fill="#a8b0c0" font-family="Georgia, serif" font-size="36" letter-spacing="2">${xmlEsc(sub)}</text>
  <text x="80" y="540" fill="#5a6874" font-family="Georgia, serif" font-size="28" letter-spacing="6">BOARD GAMING HUB · FREE</text>
  <text x="80" y="580" fill="#8098a8" font-family="Georgia, serif" font-size="22">boardgaminghub.com</text>
</svg>`;
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Run npm install first (sharp is required for PNG export).');
    process.exit(1);
  }

  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
  for (const c of CARDS) {
    const svgPath = path.join(OUT, `${c.file}.svg`);
    const pngPath = path.join(OUT, `${c.file}.png`);
    const svgText = svg(c);
    fs.writeFileSync(svgPath, svgText);
    await sharp(Buffer.from(svgText)).resize(1200, 630).png({ compressionLevel: 9 }).toFile(pngPath);
  }
  console.log(`Wrote ${CARDS.length} OG SVGs + PNGs to og/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});