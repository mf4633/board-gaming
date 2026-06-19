"""Deprecated: legacy siteNav stamper replaced by scripts/generate-catalog.js + scripts/strip-sitenav.js.

Run from repo root:
  node scripts/generate-catalog.js   # index.html, play.html, sitemap.xml, nav.js GAMES
  node scripts/strip-sitenav.js      # remove legacy #siteNav, ensure nav.js + analytics.js
"""
import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.check_call(cmd, cwd=ROOT)

if __name__ == '__main__':
    run(['node', 'scripts/generate-catalog.js'])
    run(['node', 'scripts/strip-sitenav.js'])
    print('Done — catalog generated and legacy nav stripped.')