"""One-off: stamp a categorized site nav on every game + write index.html."""
import os
import re

GAMES_DIR = os.path.dirname(os.path.abspath(__file__))

BOARD_GAMES = [
    ("Agora.html",         "Agora",          "The Mediterranean Trade"),
    ("Aresia.html",        "Aresia",         "Colonize the Red Frontier"),
    ("Backgammon.html",    "Backgammon",     "Classic dice & race"),
    ("Bisque.html",        "Bisque",         "Battle for the Bay"),
    ("Chess.html",         "Chess",          "The royal game"),
    ("Convergence.html",   "Convergence",    "Rival Civilizations, Shared Economy"),
    ("Go.html",            "Go",             "Territory & influence, 19x19"),
    ("Mancala.html",       "Mancala",        "Ancient count-and-capture"),
    ("Odyssey.html",       "Odyssey",        "Upon the Wine-Dark Sea"),
    ("Othello.html",       "Othello",        "Flip to claim the board"),
    ("PenteGrammai.html",  "Pente Grammai",  "The Ancient Greek Game of Five Lines"),
    ("Senet.html",         "Senet",          "The ancient Egyptian racing game"),
    ("Tidelands.html",     "Tidelands",      "Bronze-age maritime trade"),
    ("Ur.html",            "Ur",             "The Royal Game of Ur"),
]

SIMS = [
    ("Apoapsis.html",                 "Apoapsis",           "3D rocket flight sim"),
    ("BiosphereBlue.html",            "Biosphere Blue",     "Planet-scale geosim"),
    ("BonnevilleSpillwayOperator.html","Bonneville Spillway","Columbia River dam operator"),
    ("Cliffwalkers.html",             "Cliffwalkers",       "Save the wee folk"),
    ("Doctrine.html",                 "Doctrine",           "Geopolitical sim, 1990–2050"),
    ("Floodline.html",                "Floodline",          "California flood defense"),
    ("Metropolis2K.html",             "Metropolis 2K",      "Build an isometric city"),
    ("Tower.html",                    "Tower",              "High-rise operations"),
]

ALL = BOARD_GAMES + SIMS


def nav_snippet(current_file):
    def link(file, name):
        cls = " class=\"current\"" if file == current_file else ""
        return f'<a href="{file}"{cls}>{name}</a>'
    board_links = "\n      ".join(link(f, n) for f, n, _ in BOARD_GAMES)
    sim_links   = "\n      ".join(link(f, n) for f, n, _ in SIMS)
    title = next((n for f, n, _ in ALL if f == current_file), "Games")
    return f"""<style id="siteNav-css">
  #siteNav {{ position: sticky; top: 0; z-index: 99999; background: rgba(16,20,28,0.96); border-bottom: 1px solid #2a3540; font-family: Georgia, "Times New Roman", serif; box-shadow: 0 2px 10px rgba(0,0,0,0.6); color: #d8d0c0; }}
  #siteNav * {{ box-sizing: border-box; }}
  #siteNav .nav-bar {{ display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; max-width: 1400px; margin: 0 auto; gap: 12px; }}
  #siteNav .nav-home {{ color: #d8d0c0; text-decoration: none; font-size: 0.82em; letter-spacing: 2px; padding: 5px 12px; border: 1px solid #3a5060; border-radius: 3px; white-space: nowrap; }}
  #siteNav .nav-home:hover {{ background: #1e2838; color: #f0e0b0; }}
  #siteNav .nav-title {{ color: #f0d89c; font-size: 0.95em; letter-spacing: 3px; font-weight: bold; text-align: center; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
  #siteNav .nav-toggle {{ background: none; border: 1px solid #3a5060; color: #d8d0c0; font-size: 0.85em; letter-spacing: 2px; padding: 5px 12px; border-radius: 3px; cursor: pointer; font-family: inherit; white-space: nowrap; }}
  #siteNav .nav-toggle:hover {{ background: #1e2838; color: #f0e0b0; }}
  #siteNav .nav-menu {{ display: none; background: #0f141c; border-top: 1px solid #2a4050; padding: 14px 16px; max-width: 1400px; margin: 0 auto; }}
  #siteNav .nav-menu.open {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
  #siteNav .nav-cat {{ min-width: 0; }}
  #siteNav .nav-cat-label {{ color: #8098a8; font-size: 0.72em; letter-spacing: 4px; padding: 4px 0 8px 0; border-bottom: 1px solid #2a3540; margin-bottom: 6px; }}
  #siteNav .nav-cat a {{ display: block; padding: 6px 10px; color: #a8b0c0; text-decoration: none; font-size: 0.88em; border-radius: 3px; }}
  #siteNav .nav-cat a:hover {{ background: #1e2838; color: #f0e0b0; }}
  #siteNav .nav-cat a.current {{ color: #f0d89c; font-weight: bold; background: #1e2838; }}
  @media (max-width: 640px) {{
    #siteNav .nav-menu.open {{ grid-template-columns: 1fr; gap: 14px; }}
    #siteNav .nav-title {{ font-size: 0.82em; letter-spacing: 2px; }}
    #siteNav .nav-home,
    #siteNav .nav-toggle {{ font-size: 0.74em; padding: 4px 8px; }}
  }}
</style>
<div id="siteNav">
  <div class="nav-bar">
    <a href="index.html" class="nav-home">HOME</a>
    <span class="nav-title">{title}</span>
    <button class="nav-toggle" onclick="document.querySelector('#siteNav .nav-menu').classList.toggle('open')">GAMES &#9776;</button>
  </div>
  <div class="nav-menu">
    <div class="nav-cat">
      <div class="nav-cat-label">BOARD GAMES</div>
      {board_links}
    </div>
    <div class="nav-cat">
      <div class="nav-cat-label">SIMULATIONS</div>
      {sim_links}
    </div>
  </div>
</div>"""


# Patterns to strip out (legacy or prior siteNav) before inserting fresh
PAT_OLD_MOBILE_CSS = re.compile(
    r'[ \t]*@media \(max-width: 768px\) \{\s*#mobileNav[^\n]*\n(?:[^\n]*\n){0,20}?\s*\}\s*\n',
    re.MULTILINE,
)
PAT_OLD_MOBILE_RULE = re.compile(
    r'^\s*#mobileNav \{[^\n]*\}\s*\n',
    re.MULTILINE,
)
PAT_OLD_MOBILE_HTML = re.compile(
    r'<div id="mobileNav">.*?<a href="Ur\.html"[^>]*>Ur</a>\s*</div>\s*</div>\s*',
    re.DOTALL,
)
PAT_OLD_SITENAV_STYLE = re.compile(
    r'<style id="siteNav-css">.*?</style>\s*',
    re.DOTALL,
)
PAT_OLD_SITENAV_HTML = re.compile(
    r'<div id="siteNav">.*?</div>\s*</div>\s*</div>\s*',
    re.DOTALL,
)


def process(path, fname):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    # Remove prior versions so re-runs are idempotent
    src = PAT_OLD_SITENAV_STYLE.sub('', src)
    src = PAT_OLD_SITENAV_HTML.sub('', src)
    src = PAT_OLD_MOBILE_HTML.sub('', src)
    src = PAT_OLD_MOBILE_CSS.sub('', src)
    src = PAT_OLD_MOBILE_RULE.sub('', src)
    # Insert new nav right after <body ...>
    new_nav = nav_snippet(fname)
    src, n = re.subn(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + new_nav, src, count=1)
    if n == 0:
        print(f'  WARN: no <body> in {fname}')
        return
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'  updated: {fname}')


def write_index():
    def card(file, name, subtitle):
        return f"""    <a class="gcard" href="{file}">
      <div class="gname">{name}</div>
      <div class="gsub">{subtitle}</div>
    </a>"""
    board_cards = "\n".join(card(f, n, s) for f, n, s in BOARD_GAMES)
    sim_cards   = "\n".join(card(f, n, s) for f, n, s in SIMS)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Board Gaming &amp; Simulations</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: #0c1016; color: #d8d0c0; font-family: Georgia, "Times New Roman", serif; }}
  #wrap {{ max-width: 1200px; margin: 0 auto; padding: 40px 24px 80px 24px; }}
  header {{ text-align: center; margin-bottom: 40px; }}
  header h1 {{ font-size: 2.2em; letter-spacing: 8px; color: #f0d89c; margin: 0; }}
  header .tag {{ color: #8098a8; letter-spacing: 3px; font-size: 0.85em; margin-top: 10px; }}
  section {{ margin-top: 46px; }}
  section h2 {{ font-size: 1.0em; letter-spacing: 6px; color: #f0d89c; text-transform: uppercase; border-bottom: 1px solid #2a3540; padding-bottom: 8px; margin-bottom: 20px; }}
  section .blurb {{ color: #8098a8; font-size: 0.92em; margin-bottom: 22px; line-height: 1.6; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }}
  .gcard {{ display: block; background: #141c28; border: 1px solid #2a3540; border-radius: 4px; padding: 16px 18px; text-decoration: none; transition: background 0.12s, border-color 0.12s, transform 0.12s; }}
  .gcard:hover {{ background: #1e2838; border-color: #3a5060; transform: translateY(-2px); }}
  .gcard .gname {{ color: #f0d89c; font-size: 1.08em; letter-spacing: 2px; font-weight: bold; margin-bottom: 4px; }}
  .gcard .gsub {{ color: #a8b0c0; font-size: 0.85em; line-height: 1.4; }}
  footer {{ margin-top: 60px; text-align: center; color: #5a6874; font-size: 0.8em; letter-spacing: 2px; }}
  footer a {{ color: #8098a8; text-decoration: none; }}
  footer a:hover {{ color: #d8d0c0; }}
</style>
</head>
<body>
<div id="wrap">
  <header>
    <h1>BOARD GAMING</h1>
    <div class="tag">Classics, original strategy games, and simulations — all in a single HTML file each.</div>
  </header>

  <section>
    <h2>Board Games</h2>
    <div class="blurb">Turn-based strategy: ancient games, classic perfects, and original designs.</div>
    <div class="grid">
{board_cards}
    </div>
  </section>

  <section>
    <h2>Simulations</h2>
    <div class="blurb">Real-time physics, engineering, and management sims.</div>
    <div class="grid">
{sim_cards}
    </div>
  </section>

  <footer>
    <a href="https://github.com/mf4633/board-gaming">github.com/mf4633/board-gaming</a>
  </footer>
</div>
</body>
</html>
"""
    with open(os.path.join(GAMES_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('  wrote: index.html')


if __name__ == '__main__':
    print('Stamping nav on game pages...')
    for fname, _, _ in ALL:
        path = os.path.join(GAMES_DIR, fname)
        if os.path.exists(path):
            process(path, fname)
        else:
            print(f'  SKIP (missing): {fname}')
    print('Writing index.html...')
    write_index()
    print('Done.')
