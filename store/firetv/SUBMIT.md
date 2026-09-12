# Submitting Board Gaming Hub to the Amazon Appstore

Everything in this folder is ready to paste or upload. Two things here are
human-only: the signing key and the submit button.

## 0. Blocker — the APK must not be the debug build

The APK currently on the `firetv-v1` release is debug-signed and carries
`android:debuggable`. Amazon will not take it, and it should not be distributed
publicly in any case. Fix it once:

1. Create a keystore and set the four `BGHTV_*` repository secrets — the exact
   `keytool` command is in [`../../FIRETV.md`](../../FIRETV.md#signing--required-before-public-distribution).
2. Push to `main` (or run **Actions → firetv-apk → Run workflow** with
   *publish* ticked).
3. CI builds `assembleRelease`, the publish guard passes, and `firetv-v1` gets
   a signed, non-debuggable APK.
4. Download that APK — it is the binary you upload below.

Keep the keystore safe. Lose it and the app can never be updated in place.

## 1. Create the app

Amazon Developer Console → **Apps & Services → Add a New App → Android**.
Set the app title from [`LISTING.md`](LISTING.md).

## 2. Availability & pricing

Free, all territories. This app is free; the $0.99 in `itch-assets/PRICING.md`
is for the premium itch.io builds, not for this.

## 3. Description

Paste short description, long description, feature bullets and keywords from
[`LISTING.md`](LISTING.md). Category: Games → Board.

## 4. Images & multimedia

| Field | File |
|---|---|
| App icon (large) | `assets/icon-512.png` |
| App icon (small) | `assets/icon-114.png` |
| Promotional image | `assets/promo-1024x500.png` |
| Fire TV background | `assets/tv-background-1920x1080.png` |
| Screenshots | all six `assets/screenshot-*.png` |

## 5. Content rating

Answer the questionnaire yourself rather than copying an answer from here — a
misdeclared rating is the developer's liability. Relevant facts about the
catalogue:

* No blood, gore, or realistic depictions of injury.
* No real-money gambling and no simulated gambling with wagering. Solitaire,
  Backgammon and Mahjong are card/tile games without betting.
* Conflict is abstract and strategic — Bisque is naval area control, Doctrine is
  a geopolitical model, Hellcat is a WWII flight simulator. Pieces and aircraft,
  not people.
* No chat, no user-generated content, no social features, no links out of the
  app (off-site navigation is blocked by the WebView client).
* No purchases of any kind inside the app.

## 6. Binary

Upload the **signed** APK from step 0. Device support: select the Fire TV
family. The manifest declares `minSdk 22`, so Fire OS 5 devices are included —
see the Fire OS 5 WebView caveat in `FIRETV.md` and consider deselecting the
oldest devices if the heavier WebGL simulations matter to you.

CI already asserts the two things that decide whether the app appears on the
home row at all: the `LEANBACK_LAUNCHER` entry and `touchscreen` marked
not-required.

## 7. Privacy and support

| Field | Value |
|---|---|
| Privacy policy URL | `https://boardgaminghub.com/privacy` |
| Support email / site | the address on `https://boardgaminghub.com/contact` |

See *What to declare about data* in [`LISTING.md`](LISTING.md) for exactly what
the app collects.

## 8. Before you submit — two honest risks

**This is a WebView app that loads remote content.** Amazon has historically
been sceptical of thin web wrappers. The defensible position is that this is not
a bookmark: it adds a leanback launcher entry, a 10-foot catalogue, and a
remote-to-pointer input layer without which none of the games are playable on a
television. If review pushes back, that is the argument.

**It needs the network.** With no connection the app shows a retry screen rather
than a cached catalogue. If that is a problem for review, bundling the games
into the APK is possible — it just pins all 36 to the app version.

## 9. Test on a real device first

Nothing in this repo has been run on Fire TV hardware. Sideload the signed APK
and check, at minimum: the tile appears on the home row with its banner; the
pointer speed feels right (tune `SPEED_MIN_DP` / `SPEED_MAX_DP` in
`MainActivity.kt`); the menu button switches modes; Back returns to the
catalogue and exits from it.
