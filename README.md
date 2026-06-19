# board-gaming

Browser games — single HTML file each, no build step.

**Live:** [boardgaminghub.com](https://boardgaminghub.com) (Netlify) · [play.html](https://boardgaminghub.com/play.html) (ad-supported catalog)

## Catalog

`games.json` is the single source of truth (title, category, SEO priority, descriptions, demo/store links).

After editing `games.json`:

```bash
node scripts/generate-catalog.js   # → index.html, play.html, sitemap.xml, nav.js
node scripts/strip-sitenav.js      # remove legacy inline nav from game pages
```

Or: `python _update_nav.py` (runs both scripts).

## Categories

| Category | Examples |
|---|---|
| **Puzzles** | Solitaire, Wordform, Drift, Sudoku, Chess, 2048, Abacus |
| **Board** | Go, Chess, Agora, Tidelands, Senet, Ur, … |
| **Simulations** | Floodline, Tower, Bonneville Spillway, Apoapsis, Metropolis 2K, Eclipse Predictor |

## Premium demos

Full versions of Floodline, Tower (SKYSTACK), and Bonneville Spillway Operator live in the private [board-gaming-premium](https://github.com/mf4633/board-gaming-premium) repo. Public copies set `DEMO_BUILD = true`.

## SEO / deploy

- `sitemap.xml` — generated with clean URLs (`/chess` → `Chess.html` via `netlify.toml`)
- `robots.txt`, `llms.txt`, Google Search Console verified
- AdSense on `play.html` and `apps.html` only (not gameplay pages)
- `git push origin main` auto-deploys via Netlify

## Adding a new game

1. Drop `NewGame.html` (PascalCase) into repo root.
2. Add entry to `games.json` with `category`, `description`, `searchKeys`, `priority`.
3. Run `node scripts/generate-catalog.js`.
4. Add a `[[redirects]]` line in `netlify.toml` for the slug.
5. For Android: update wrapper `copy-assets` driven by `games.json`.