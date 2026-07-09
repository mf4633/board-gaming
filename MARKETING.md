# Board Gaming Hub — Growth & Marketing Assets

Durable copy of the growth playbook, launch posts, and cross-promotion assets
so nothing lives only in chat. Everything on-page has been implemented; the
open items are off-site (posting, and the pe-calc → sims links in that repo).

## The one-line strategy

The site is **indexed and relevant** (Google Search Console shows impressions
for real queries — baduk/Go ~100+, Othello ~25, Royal Game of Ur ~17) but ranks
**page 2–3** (impressions, ~0 clicks). On-page SEO is done; titles already
target the terms. The bottleneck is **domain authority = backlinks**. Two
responses that work for a young site:

1. **Win low-competition niches** you already appear for (Ur, Senet, Pente
   Grammai, the engineering sims) rather than fighting head terms ("go online").
2. **Earn backlinks** for the whole domain via the unique sims (the only
   link-worthy asset) — one Reddit/HN post per sim.

## What's already shipped (on-page)

- Cross-link "more games" rail on every game page (via `nav.js`).
- Three daily games with shareable results (Wordform, Drift, Sudoku).
- SEO guides: the classics + the winnable ancient-games cluster
  (Ur, Senet, Pente Grammai) + Othello.
- "How the model works" sections with real formulas on all 8 sims.
- OG share cards (1200×630) for every sim + `twitter:card` large images.
- `llms.txt` kept accurate (AI assistants are a top-3 referrer).
- Bidirectional funnel with pe-calc (sims → pe-calc/HydroComplete done here;
  pe-calc → sims is the prompt below, to run in the pe-calc repo).

## Measurement (all via the shared analytics UTM tracking)

Watch these in the analytics dashboard:
- **`utm_medium = sim-model`** — sim readers → pe-calc / HydroComplete (funnel to SaaS).
- **`utm_medium = cross-promo` / `footer`** — pe-calc → sims (once the pe-calc links ship).
- **Search Console avg position** on `baduk online`, `othello online`,
  `royal game of ur` — the authority payoff, lagging backlinks by a few weeks.

---

## Launch posts

### Eclipse Predictor
**Targets:** Show HN; r/space, r/astronomy, r/eclipse. Time ~2–4 weeks before
the Aug 12 2026 eclipse for a second wave.

**Titles:**
- `Show HN: A 3D solar eclipse predictor for every eclipse, 1900–2200`
- `Show HN: Every solar eclipse to 2200, mapped on a rotatable globe`

**First comment:**
> Author here. I built this because eclipse maps are almost always flat static
> images. Positions come from the astronomy-engine library (sub-arcsecond
> Sun/Moon vectors); I project the Moon's shadow cone onto the WGS84 ellipsoid
> to find where totality touches ground, and classify total vs annular by the
> umbra radius at the surface intersection (so hybrids come out right). It's a
> visualization, not a surveying tool — I note where it's simplified, and I'd
> like to know where it disagrees with published NASA/IOTA contact times.
> Single static HTML page, no backend.

### Bonneville Spillway Operator
**Targets:** Show HN; r/hydrology, r/engineering, r/simulationgames, r/dams.

**Titles:**
- `Show HN: I'm a dam engineer – I made a Bonneville Dam operator game`
- `Show HN: A Columbia River dam-operations sim with real dissolved-gas physics`

**First comment:**
> I work in dam safety/hydrology and always thought operators' tradeoffs would
> make a good game. Spill supersaturates the tailrace with gas (~`100 +
> coef·√spill`), and TDG over ~115% harms juvenile salmon — so in spring
> snowmelt you *must* spill to protect the dam while fish limits cap how far you
> can open the gates. Generation is `P ≈ Q·H·0.0846·η`; the reservoir is a real
> mass balance. Stylized operations model (simplified from USACE data), not CFD
> — formulas documented on the page. Fisheries/hydro folks: tell me what I got
> wrong.

**Posting rules:** read each subreddit's self-promo rules; post from an account
with history and reply to every comment; one community at a time; on HN, submit
weekday mornings US-Pacific and never ask for upvotes.

---

## pe-calc → sims (run in the pe-calc repo)

Links are **followed** (pass authority to the newer sims) and UTM-tagged.

**Targeted callouts** (topically matched pages only):
- Manning's / open-channel → Floodline, `utm_campaign=mannings-floodline`
- SCS-runoff / rational-method → Floodline, `utm_campaign=runoff-floodline`
- Weir / orifice / conduit-fill → Bonneville, `utm_campaign=bonneville-hydraulics`

```html
<!-- Manning's / open-channel pages -->
<p class="cross-promo">Want to see open-channel routing in motion?
<a href="https://boardgaminghub.com/Floodline.html?utm_source=pe-calc&utm_medium=cross-promo&utm_campaign=mannings-floodline">Floodline</a>
is a free flood-defense sim built on the same shallow-water hydraulics — by the same engineer.</p>
```

**Site-wide footer** (one line, shared partial):
```html
<aside class="cross-promo-footer">
  Interactive engineering sims by the same author —
  <a href="https://boardgaminghub.com/Floodline.html?utm_source=pe-calc&utm_medium=footer&utm_campaign=sims">Floodline</a> ·
  <a href="https://boardgaminghub.com/BonnevilleSpillwayOperator.html?utm_source=pe-calc&utm_medium=footer&utm_campaign=sims">Bonneville dam</a> ·
  <a href="https://boardgaminghub.com/EclipsePredictor.html?utm_source=pe-calc&utm_medium=footer&utm_campaign=sims">Eclipse Predictor</a> ·
  <a href="https://boardgaminghub.com/Apoapsis.html?utm_source=pe-calc&utm_medium=footer&utm_campaign=sims">Apoapsis (orbital)</a>
</aside>
```

**Suggested CSS** (adapt colors to pe-calc's palette):
```css
.cross-promo { margin: 20px 0; padding: 12px 16px; border-left: 3px solid #3a5060;
  background: #f6f8fa; font-size: 0.95em; line-height: 1.6; }
.cross-promo a { font-weight: 600; }
.cross-promo-footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #d8dee4;
  font-size: 0.85em; color: #57606a; text-align: center; }
.cross-promo-footer a { margin: 0 4px; }
```

**Prompt for terminal Claude (pe-calc repo):** see the site-wide-footer + targeted-callout
spec above. Rules: one targeted callout per page max + one footer line; vary anchor
text; only add callouts where the topic matches; do NOT use `rel="nofollow"`; branch
+ commit, don't push to prod until reviewed. Start with Manning's-n and SCS-runoff
(the two highest-traffic pages), watch a week of UTM data, then roll out wider.

## sims → pe-calc (done — in this repo)

Implemented in the "How the model works" sections of `Floodline.html` and
`BonnevilleSpillwayOperator.html`: followed, UTM-tagged links
(`utm_source=boardgaminghub&utm_medium=sim-model`) to pe-calc's open-channel/
weir/hydrology tools and HydroComplete. Only these two sims have real
tool-audience overlap; the others were left clean.
