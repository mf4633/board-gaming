# board-gaming

Browser games — single HTML file each, no build step, no accounts. Built by a dam-safety engineer, so the simulations run on real formulas.

**Live:** [boardgaminghub.com](https://boardgaminghub.com) · [ad-supported catalog](https://boardgaminghub.com/play) · [itch.io](https://hydroengineer.itch.io)

**On a television:** all 36 games ship as one sideloadable Fire TV app — see [FIRETV.md](FIRETV.md).

## The 36 games

### Classic Puzzles

The most-played puzzle games on the web — free, no signup, mobile-friendly.

| Game | What it is | Source |
|---|---|---|
| [Solitaire](https://boardgaminghub.com/solitaire) | Klondike — the classic card game | `Solitaire.html` |
| [Wordform](https://boardgaminghub.com/wordform) **·daily** | Daily 5-letter word puzzle | `Wordform.html` |
| [Drift](https://boardgaminghub.com/drift) **·daily** | Daily word ladder — original | `Drift.html` |
| [Sudoku](https://boardgaminghub.com/sudoku) **·daily** | Place 1–9, easy to expert | `Sudoku.html` |
| [Mahjong](https://boardgaminghub.com/mahjong) | Solitaire tile matching | `Mahjong.html` |
| [Chess](https://boardgaminghub.com/chess) | The royal game | `Chess.html` |
| [2048](https://boardgaminghub.com/2048) | Slide & merge tiles | `2048.html` |
| [Minesweeper](https://boardgaminghub.com/minesweeper) **·daily** | Find the mines — no-guess boards, daily challenge, hex & knight variants | `Minesweeper.html` |
| [Abacus](https://boardgaminghub.com/abacus) | Soroban calculator with Arabic & Roman numerals | `Abacus.html` |
| [LovedWords](https://boardgaminghub.com/lovedwords/) | First-words flashcards with your photos & voice | `lovedwords/index.html` |
| [Tic-Tac-Toe](https://boardgaminghub.com/tictactoe) | Noughts and crosses with a genuinely unbeatable AI | `TicTacToe.html` |
| [Flappy Bird](https://boardgaminghub.com/flappybird) **·daily** | One-tap flight through the pipes — three gap sizes, a shared daily run, medals | `FlappyBird.html` |

### Board Games

Turn-based strategy: ancient games, classic perfects, and original designs.

| Game | What it is | Source |
|---|---|---|
| [Agora](https://boardgaminghub.com/agora) | The Mediterranean Trade | `Agora.html` |
| [Aresia](https://boardgaminghub.com/aresia) | Colonize the Red Frontier | `Aresia.html` |
| [Backgammon](https://boardgaminghub.com/backgammon) | Classic dice & race | `Backgammon.html` |
| [Bisque](https://boardgaminghub.com/bisque) | Battle for the Bay | `Bisque.html` |
| [Convergence](https://boardgaminghub.com/convergence) | Rival Civilizations, Shared Economy | `Convergence.html` |
| [Go](https://boardgaminghub.com/go) | Territory & influence, 19×19 | `Go.html` |
| [Mancala](https://boardgaminghub.com/mancala) | Ancient count-and-capture | `Mancala.html` |
| [Odyssey](https://boardgaminghub.com/odyssey) | Upon the Wine-Dark Sea | `Odyssey.html` |
| [Othello](https://boardgaminghub.com/othello) | Flip to claim the board | `Othello.html` |
| [Pente Grammai](https://boardgaminghub.com/pentegrammai) | Ancient Greek Game of Five Lines | `PenteGrammai.html` |
| [Senet](https://boardgaminghub.com/senet) | Ancient Egyptian racing game | `Senet.html` |
| [Tidelands](https://boardgaminghub.com/tidelands) | Bronze-age maritime trade | `Tidelands.html` |
| [Ur](https://boardgaminghub.com/ur) | The Royal Game of Ur | `Ur.html` |
| [Ultimate Tic-Tac-Toe](https://boardgaminghub.com/ultimatetictactoe) | Nine nested boards; your move picks your opponent’s board | `UltimateTicTacToe.html` |

### Simulations

Real-time physics, engineering, and management sims.

| Game | What it is | Source |
|---|---|---|
| [Apoapsis](https://boardgaminghub.com/apoapsis) | 3D rocket flight sim | `Apoapsis.html` |
| [Biosphere Blue](https://boardgaminghub.com/biosphereblue) | Planet-scale geosim | `BiosphereBlue.html` |
| [Bonneville Spillway](https://boardgaminghub.com/bonnevillespillwayoperator) | Columbia River dam operator | `BonnevilleSpillwayOperator.html` |
| [Cliffwalkers](https://boardgaminghub.com/cliffwalkers) | Save the wee folk | `Cliffwalkers.html` |
| [Doctrine](https://boardgaminghub.com/doctrine) | Geopolitical sim, 1990–2050 | `Doctrine.html` |
| [Eclipse Predictor](https://boardgaminghub.com/eclipsepredictor) | 3D solar eclipse paths on globe (1900–2200) | `EclipsePredictor.html` |
| [Floodline](https://boardgaminghub.com/floodline) | California flood defense | `Floodline.html` |
| [Metropolis 2K](https://boardgaminghub.com/metropolis2k) | City-building sim with districts & bonds | `Metropolis2K.html` |
| [Tower](https://boardgaminghub.com/tower) | High-rise operations (SKYSTACK) | `Tower.html` |
| [Hellcat](https://boardgaminghub.com/hellcat) | WWII carrier flight sim with real aerodynamics | `Hellcat.html` |

## Strategy guides

Each game page carries its own strategy section (`/<game>#guide`); the old `/guides/` pages 301 there.

## Catalog pipeline

`games.json` is the single source of truth (title, category, SEO priority, descriptions, `addedOn` for the "New this week" strip, `daily` for the daily strip).

```bash
node scripts/generate-og-images.js   # 1200x630 OG cards (needs sharp)
node scripts/stamp-og-meta.js        # og:image tags into each game page
node scripts/generate-catalog.js     # index.html, play.html, sitemap.xml, nav.js, tv.html
```

Edit the generators, never the generated files.

## Adding a new game

1. Drop `NewGame.html` (PascalCase) into the repo root, with canonical + OG meta and `/nav.js` at the end of `<body>`.
2. Add an entry to `games.json` (`slug`, `sourceHtml`, `category`, `description`, `searchKeys`, `priority`, `ogImage`, `addedOn`).
3. Add a card to `scripts/generate-og-images.js` and a `[[redirects]]` slug in `netlify.toml`.
4. Run the three scripts above. `git push origin main` deploys via Netlify.

## Fire TV

`android-tv/` is a leanback app: one WebView on `boardgaminghub.com/tv`, plus the
part that matters — a translation layer from a five-button remote to the pointer
input the games were written for. The D-pad drives an on-screen pointer and OK
synthesises a touch gesture, so every click-driven game works unmodified; games
whose controls *are* the arrows are marked `?tvinput=dpad` by the catalogue
generator and get the arrows raw.

`tv.html` is generated from `games.json` alongside the rest of the catalogue.
Build, install and signing are in [FIRETV.md](FIRETV.md); the APK is built by
`.github/workflows/firetv-apk.yml`, never locally committed.

## Premium demos

Full versions of Floodline, Tower (SKYSTACK), and Bonneville Spillway Operator live in the private [board-gaming-premium](https://github.com/mf4633/board-gaming-premium) repo. Public copies set `DEMO_BUILD = true`.

## SEO / deploy

- `sitemap.xml` uses clean slug URLs (`/chess` → `Chess.html` via `netlify.toml`); `robots.txt` opts in AI crawlers; `llms.txt` describes every game.
- AdSense markup only on `play.html` and `apps.html`, never on gameplay pages.
- `node submit-indexnow.js` pings Bing/Yandex/DDG after a sitemap change.

## License

See [LICENSE](LICENSE).
