# Board Gaming Hub on Fire TV

One leanback app, all 36 games, driven by the remote.

The app (`android-tv/`) is a single activity hosting a WebView pointed at
`boardgaminghub.com/tv` — a 10-foot catalogue generated from `games.json` by
`scripts/generate-tv.js`. Games load from the live site rather than being
bundled, so publishing the site updates the TV without reshipping the APK.

## Installing it on a Fire TV

1. `Settings → My Fire TV → Developer Options → Apps from Unknown Sources` → **on**.
   (On newer Fire OS you may first need `Settings → My Fire TV → About` and click
   the device name seven times to reveal Developer Options.)
2. Install **Downloader** from the Amazon Appstore.
3. In Downloader, enter the APK URL from the
   [`firetv-v1` release](https://github.com/mf4633/board-gaming/releases/tag/firetv-v1),
   then install when prompted.
4. The app appears on the Fire TV home row as **Board Gaming Hub**.

Over adb instead, with the TV's IP from `Settings → My Fire TV → About → Network`:

```sh
adb connect 192.168.1.x:5555
adb install -r boardgaminghub-tv.apk
```

## Controls

| Button | In the catalogue | In a game |
|---|---|---|
| D-pad | moves the highlight between tiles | moves the pointer (or the game's own arrows in D-pad mode) |
| OK | opens the game | taps at the pointer; hold to drag |
| Back | exits the app | returns to the catalogue |
| ☰ Menu | — | switches between pointer and D-pad control |
| ⏪ / ⏩ | — | page up / page down |

### Why two input modes

The catalogue is pointer-driven code: Floodline alone has 34 click handlers, a
`pointerdown` path and a hover preview layer. None of that is reachable from
four arrows and an OK button, so **cursor mode** synthesises a touchscreen
gesture at an on-screen pointer — down, move, up — which the WebView turns into
`touchstart`/`pointerdown`/`mousedown`/`click`. That is the same event path the
games already get as phone apps, which is why it works across all 36 without a
single game being modified. Hover is sent separately from a mouse source, so
games that draw a preview under the pointer still get `mousemove`.

**D-pad mode** hands the arrows to the page untouched, for games where the
arrows *are* the controls. `scripts/generate-tv.js` marks those in the catalogue
link (`?tvinput=dpad`) — currently 2048 and Hellcat — and the app reads the hint
off the URL. The `/tv` path is always D-pad mode because the tiles run their own
spatial navigation. A wrong guess costs one press of ☰, not a broken game.

## Building

There is no Android SDK in this repo and none is vendored. CI does the build:

```
.github/workflows/firetv-apk.yml
```

* Runs on pull requests and pushes that touch `android-tv/`, and on demand via
  **Actions → firetv-apk → Run workflow**.
* Ticking **publish** on a manual run uploads the APK to the `firetv-v1` release,
  which is the URL `apps.html` and step 3 above point at.
* Every build asserts the two manifest facts a Fire TV install depends on: the
  `LEANBACK_LAUNCHER` category and `touchscreen` marked not-required. Get either
  wrong and the app installs cleanly and then never appears on the home row,
  which is a miserable thing to diagnose on a television.

Locally, with an Android SDK installed:

```sh
cd android-tv && ./gradlew assembleDebug
```

### Signing

Without secrets the workflow produces a **debug-signed** APK. That sideloads
onto a Fire TV perfectly well; it just cannot go to the Amazon Appstore. For a
release-signed build, set four repository secrets:

| Secret | Value |
|---|---|
| `BGHTV_KEYSTORE_BASE64` | `base64 -w0 your.jks` |
| `BGHTV_KEYSTORE_PASSWORD` | keystore password |
| `BGHTV_KEY_ALIAS` | key alias |
| `BGHTV_KEY_PASSWORD` | key password |

The workflow switches to `assembleRelease` automatically once the first one is
present.

## Known limits

* **Fire OS 5 devices** (API 22 — Fire TV Stick 2nd gen) carry an old,
  non-updatable WebView. The app installs and the simpler games run, but the
  heavier WebGL sims may not. Fire OS 6+ is where everything works.
* **Text entry** — Wordform and Drift accept letters through their on-screen
  keys, which cursor mode can reach. Anything relying on a hardware keyboard
  falls back to the Fire TV IME.
* **Offline** — the app shows a retry screen rather than a cached catalogue.
  Bundling assets is a deliberate non-choice: it would pin all 36 games to the
  APK version.

## Testing the catalogue

`tests/tv.e2e.js` drives `tv.html` at 1920×1080 with arrow keys only, and fails
if spatial navigation stalls, a tile loses its `tvinput` hint, any text drops
below 20px, or the page overflows horizontally:

```sh
npm run e2e:tv
```
