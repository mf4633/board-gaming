# board-gaming

Browser games — single HTML file each, no build step. Open [`index.html`](./index.html) to pick one.

Live: **<https://mf4633.github.io/board-gaming/>** (if GitHub Pages is enabled)

## Board Games

Turn-based strategy — ancient games, classics, and original designs.

| Game | Notes |
|---|---|
| [Agora](./Agora.html) | The Mediterranean Trade |
| [Aresia](./Aresia.html) | Colonize the Red Frontier |
| [Backgammon](./Backgammon.html) | Classic dice & race |
| [Bisque](./Bisque.html) | Battle for the Bay |
| [Chess](./Chess.html) | The royal game |
| [Convergence](./Convergence.html) | Rival Civilizations, Shared Economy |
| [Go](./Go.html) | Territory & influence, 19×19 |
| [Mancala](./Mancala.html) | Ancient count-and-capture |
| [Odyssey](./Odyssey.html) | Upon the Wine-Dark Sea |
| [Othello](./Othello.html) | Flip to claim the board |
| [Pente Grammai](./PenteGrammai.html) | The Ancient Greek Game of Five Lines |
| [Senet](./Senet.html) | The ancient Egyptian racing game |
| [Tidelands](./Tidelands.html) | Bronze-age maritime trade |
| [Ur](./Ur.html) | The Royal Game of Ur |

## Simulations

Real-time physics, engineering, and management sims.

| Sim | Notes |
|---|---|
| [Apoapsis](./Apoapsis.html) | 3D rocket flight sim (Three.js) |
| [Bonneville Spillway Operator](./BonnevilleSpillwayOperator.html) | Columbia River dam — turbines, spillway, fish passage, grid frequency |
| [Floodline](./Floodline.html) | California flood defense, historical scenarios |
| [SimEarth](./SimEarth.html) | Planet-scale geosim — tectonics, climate, biomes |
| [Tower](./Tower.html) | SKYSTACK — high-rise tenant operations |

## Navigation

Every page shares a sticky top bar with **HOME** and a **GAMES ☰** dropdown that splits the two categories.

## Adding a new game

1. Drop `NewGame.html` into the repo root.
2. Add a row to `BOARD_GAMES` or `SIMS` in `_update_nav.py`.
3. Run `python _update_nav.py` to re-stamp the nav on every page and regenerate `index.html`.
