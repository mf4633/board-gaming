#!/usr/bin/env node
/** Generate 1200×630 OG card SVGs for top shareable games. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'og');
const BASE = 'https://boardgaminghub.com';

const CARDS = [
  { file: 'wordform.svg', title: 'WORDFORM', sub: 'Daily 5-letter word puzzle', accent: '#d4a050', bg: '#1a1410' },
  { file: 'chess.svg', title: 'CHESS', sub: 'Free online — vs AI or 2-player', accent: '#f0d89c', bg: '#1a1410' },
  { file: 'sudoku.svg', title: 'SUDOKU', sub: 'Easy to expert — no signup', accent: '#94c3e8', bg: '#0c1016' },
  { file: 'floodline.svg', title: 'FLOODLINE', sub: 'California flood-defense sim', accent: '#7dd3fc', bg: '#0a0e14' },
  { file: 'eclipse.svg', title: 'ECLIPSE PREDICTOR', sub: '2026 & 2027 paths on a 3D globe', accent: '#ffd040', bg: '#04060e' },
  { file: 'drift.svg', title: 'DRIFT', sub: 'Daily word ladder puzzle', accent: '#a0d0a8', bg: '#0c1016' },
  { file: 'solitaire.svg', title: 'SOLITAIRE', sub: 'Klondike in your browser', accent: '#f0d89c', bg: '#0c1016' },
];

function svg({ title, sub, accent, bg }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${bg}"/>
  <rect x="0" y="0" width="1200" height="6" fill="${accent}"/>
  <text x="80" y="290" fill="${accent}" font-family="Georgia, serif" font-size="72" font-weight="700" letter-spacing="12">${title}</text>
  <text x="80" y="360" fill="#a8b0c0" font-family="Georgia, serif" font-size="36" letter-spacing="2">${sub}</text>
  <text x="80" y="540" fill="#5a6874" font-family="Georgia, serif" font-size="28" letter-spacing="6">BOARD GAMING HUB · FREE</text>
  <text x="80" y="580" fill="#8098a8" font-family="Georgia, serif" font-size="22">boardgaminghub.com</text>
</svg>`;
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
for (const c of CARDS) {
  fs.writeFileSync(path.join(OUT, c.file), svg(c));
}
console.log(`Wrote ${CARDS.length} OG SVGs to og/`);