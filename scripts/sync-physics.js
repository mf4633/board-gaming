#!/usr/bin/env node
// Inline physics/*.js kernels into BiosphereBlue.html between marker lines:
//
//     // @@BEGIN physics/ebm.js
//     ...replaced verbatim with the file contents...
//     // @@END physics/ebm.js
//
// The kernel files are the source of truth for their regions; everything else
// in the HTML stays hand-edited. The kernels are plain scripts with a Node
// export guard, so the same bytes run under `node --test` and in the browser.
//
//   node scripts/sync-physics.js          rewrite the HTML regions
//   node scripts/sync-physics.js --check  exit 1 if any region is stale
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var htmlPath = path.join(root, 'BiosphereBlue.html');
var physDir = path.join(root, 'physics');
var check = process.argv.indexOf('--check') >= 0;

var html = fs.readFileSync(htmlPath, 'utf8');
var files = fs.readdirSync(physDir).filter(function (f) { return /\.js$/.test(f); }).sort();
var stale = [], missing = [], updated = 0;
files.forEach(function (f) {
  var rel = 'physics/' + f;
  var begin = '// @@BEGIN ' + rel, end = '// @@END ' + rel;
  var b = html.indexOf(begin), e = html.indexOf(end);
  if (b < 0 || e < 0 || e < b) { missing.push(rel); return; }
  var bodyStart = html.indexOf('\n', b) + 1;
  var current = html.slice(bodyStart, e);
  var src = fs.readFileSync(path.join(physDir, f), 'utf8').replace(/\r\n/g, '\n');
  if (!/\n$/.test(src)) src += '\n';
  if (current !== src) {
    stale.push(rel);
    if (!check) { html = html.slice(0, bodyStart) + src + html.slice(e); updated++; }
  }
});
if (missing.length) console.error('no marker region in BiosphereBlue.html for: ' + missing.join(', '));
if (check) {
  if (stale.length) { console.error('stale regions: ' + stale.join(', ') + '  (run node scripts/sync-physics.js)'); process.exit(1); }
  console.log('physics regions in sync (' + files.length + ' files)');
} else {
  if (updated) fs.writeFileSync(htmlPath, html);
  console.log('updated ' + updated + ' region(s): ' + (stale.join(', ') || 'none'));
}
