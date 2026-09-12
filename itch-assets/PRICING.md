# itch.io pricing

All three premium titles are **$0.99**.

| Title | itch slug | Price | Where it is recorded |
|---|---|---|---|
| Floodline | `floodline` | $0.99 | `floodline-page.md` |
| Bonneville Spillway Operator | `bonneville-spillway-operator` | $0.99 | `bonneville-page.md` |
| Skystack (Tower) | `skystack` | $0.99 | here only — the page predates these files |

These files are the record, not the mechanism: **itch.io prices are set in the
itch dashboard** (Edit game → Pricing), and `butler push` uploads builds without
touching price. Changing the number here does not change what anyone pays until
it is changed on each page.

Bonneville previously carried a "*$2.00, or $1 at launch with early access
framing*" note. That went with the old number — at $0.99 there is no discount
left to frame.

Free preview builds on boardgaminghub.com are unaffected: the web versions stay
free and ad-supported, and `games.json` marks the three demo builds with
`demo: true` plus a `storeUrl`.
