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
  { file: 'mahjong', title: 'MAHJONG', sub: 'Solitaire tile matching — free', accent: '#e0b070', bg: '#101610' },
  { file: '2048', title: '2048', sub: 'Slide & merge to the golden tile', accent: '#f0c060', bg: '#14100c' },
  { file: 'minesweeper', title: 'MINESWEEPER', sub: 'Find the mines — beginner to expert', accent: '#94c3e8', bg: '#0c1016' },
  { file: 'abacus', title: 'ABACUS', sub: 'Soroban with Arabic & Roman numerals', accent: '#d4a574', bg: '#150f0a' },
  { file: 'lovedwords', title: 'LOVEDWORDS', sub: 'First-words flashcards for toddlers', accent: '#f0a0b0', bg: '#1a1424' },
  { file: 'agora', title: 'AGORA', sub: 'The Mediterranean trade game', accent: '#f0d89c', bg: '#141008' },
  { file: 'aresia', title: 'ARESIA', sub: 'Colonize the red frontier', accent: '#e07050', bg: '#180c08' },
  { file: 'backgammon', title: 'BACKGAMMON', sub: 'Classic dice & race — vs AI or 2P', accent: '#d4a574', bg: '#120e0a' },
  { file: 'bisque', title: 'BISQUE', sub: 'Battle for the bay', accent: '#f08060', bg: '#08161a' },
  { file: 'convergence', title: 'CONVERGENCE', sub: 'Rival civilizations, shared economy', accent: '#88c0a0', bg: '#0a1214' },
  { file: 'go', title: 'GO · BADUK', sub: 'Territory & influence on 19×19', accent: '#e8e0d0', bg: '#141008' },
  { file: 'mancala', title: 'MANCALA', sub: 'Ancient count-and-capture', accent: '#d09050', bg: '#140f08' },
  { file: 'odyssey', title: 'ODYSSEY', sub: 'Upon the wine-dark sea', accent: '#70c0d0', bg: '#08141a' },
  { file: 'othello', title: 'OTHELLO', sub: 'Flip to claim the board — reversi', accent: '#a0d0a8', bg: '#0a1410' },
  { file: 'pentegrammai', title: 'PENTE GRAMMAI', sub: 'Ancient Greek game of five lines', accent: '#f0d89c', bg: '#12100c' },
  { file: 'senet', title: 'SENET', sub: 'Ancient Egyptian racing game', accent: '#d4a574', bg: '#161008' },
  { file: 'tidelands', title: 'TIDELANDS', sub: 'Bronze-age maritime trade', accent: '#70c0b0', bg: '#08141a' },
  { file: 'ur', title: 'ROYAL GAME OF UR', sub: 'The 4,500-year-old race game', accent: '#c0a0d0', bg: '#120c18' },
  { file: 'tictactoe', title: 'TIC-TAC-TOE', sub: 'Three levels — the last one is unbeatable', accent: '#7ec4e8', bg: '#141a20' },
  { file: 'ultimatetictactoe', title: 'ULTIMATE TIC-TAC-TOE', sub: 'Nine boards inside a tenth', accent: '#d4a860', bg: '#141a20' },
  { file: 'hellcat', title: 'HELLCAT', sub: 'WWII carrier flight sim — real aerodynamics', accent: '#8fe6b0', bg: '#0a1018' },
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