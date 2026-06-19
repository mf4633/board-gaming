#!/usr/bin/env node
/** Add Giscus discussion block to simulation pages that lack it. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const sims = data.games.filter(g => g.category === 'sims').map(g => g.sourceHtml);

const BLOCK = `
<section style="max-width:900px;margin:60px auto 40px;padding:0 20px;font-family:Georgia,'Times New Roman',serif;color:#d8d0c0;">
  <h2 style="color:#f0d89c;letter-spacing:4px;font-size:1.0em;text-transform:uppercase;border-bottom:1px solid #2a3540;padding-bottom:8px;margin-bottom:16px;">Discussion</h2>
  <p style="color:#8098a8;font-size:0.9em;margin-bottom:18px;line-height:1.5;">Sign in with GitHub to share strategies, ask questions, or report a bug.</p>
  <div class="giscus"></div>
</section>
<script src="https://giscus.app/client.js"
  data-repo="mf4633/board-gaming"
  data-repo-id="R_kgDOKyyThA"
  data-category="Announcements"
  data-category-id="DIC_kwDOKyyThM4C75Cz"
  data-mapping="pathname"
  data-strict="0"
  data-reactions-enabled="1"
  data-emit-metadata="0"
  data-input-position="bottom"
  data-theme="dark"
  data-lang="en"
  crossorigin="anonymous"
  async></script>
`;

for (const fname of sims) {
  const fpath = path.join(ROOT, fname);
  if (!fs.existsSync(fpath)) continue;
  let src = fs.readFileSync(fpath, 'utf8');
  if (src.includes('giscus.app')) {
    console.log(`  skip (has giscus): ${fname}`);
    continue;
  }
  src = src.replace(/<script src="\/nav\.js"/, BLOCK + '\n<script src="/nav.js"');
  fs.writeFileSync(fpath, src);
  console.log(`  added giscus: ${fname}`);
}