#!/usr/bin/env node
/**
 * generate-sitemap.js
 * SEO helper for board-gaming hub (backlink/SEO side).
 * Reads games.json and generates a sitemap.xml suitable for GitHub Pages / Netlify.
 *
 * Usage: node scripts/generate-sitemap.js > sitemap.xml
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const gamesPath = path.join(repoRoot, 'games.json');
const baseUrl = 'https://mf4633.github.io/board-gaming/';

if (!fs.existsSync(gamesPath)) {
  console.error('games.json not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
const games = data.games || [];

const urls = [];

games.forEach(g => {
  if (g.sourceHtml) {
    const loc = baseUrl + g.sourceHtml;
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }
});

// Also include key pages like privacy, about if they exist
['privacy.html', 'about.html'].forEach(p => {
  if (fs.existsSync(path.join(repoRoot, p))) {
    urls.push(`  <url>
    <loc>${baseUrl}${p}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>`);
  }
});

// Also include the hub itself
urls.unshift(`  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

console.log(xml);
