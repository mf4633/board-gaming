# Launch Playbook — paste-ready

Both hero pages are browser-verified launch-ready (render clean, OG cards
correct). Post as a sequence, not all at once. Reply to every comment for the
first ~2 hours. Never ask for upvotes. One community at a time.

## Sequence
| When | Post | Where | Notes |
|---|---|---|---|
| Now (weekday ~8–9am PT) | Eclipse | **Show HN** | most polished, timely |
| Same day, +3–4h | Eclipse | **r/astronomy** | better fit than r/space |
| Same day / next | Eclipse | **r/eclipse** | small but on-topic |
| +2 days (~8–9am PT) | Bonneville | **Show HN** | don't stack two Show HNs same day |
| Same day | Bonneville | **r/hydrology**, **r/engineering** | |

> Subreddit fit: **r/space removes most personal-project links** — skip it or
> expect removal. r/astronomy and r/eclipse are the right homes for the eclipse
> tool. For Bonneville, r/hydrology and r/engineering are ideal; r/dams is tiny
> but perfect.

---

## ECLIPSE

### Show HN
**URL:** https://boardgaminghub.com/eclipsepredictor
**Title (pick one):**
- `Show HN: A 3D solar eclipse predictor for every eclipse, 1900–2200`
- `Show HN: Every solar eclipse to 2200, on a rotatable globe`
- `Show HN: Eclipse paths from real ephemeris, on a 3D globe`

**First comment (post immediately after submitting):**
> Author here. I built this because eclipse maps are almost always flat static
> images. Positions come from the astronomy-engine ephemeris library (well
> under an arcsecond for the Sun and Moon); I project the Moon's shadow cone
> onto the WGS84 ellipsoid to find where totality touches ground, and classify
> total vs annular by the umbra radius at the surface intersection (so hybrids
> come out right). It's a visualization, not a surveying tool — I flag where
> it's simplified, and I'd like to know where it disagrees with published
> NASA/IOTA contact times. Single static HTML page, no backend.

### r/astronomy
**Title (pick one):**
- `I built a free 3D eclipse predictor — every solar eclipse from 1900–2200 on a rotatable globe`
- `Made a browser tool that maps every solar eclipse (1900–2200) on a 3D globe from real ephemeris`

**Body:**
> I wanted to see eclipse paths on an actual globe instead of the usual flat
> maps, so I built one. You can rotate the Earth, scrub the timeline, and watch
> the umbral shadow sweep across the surface for any solar eclipse between 1900
> and 2200.
>
> Under the hood it uses the astronomy-engine library for Sun/Moon positions
> (accurate to well under an arcsecond), projects the Moon's shadow cone onto
> the WGS84 ellipsoid to find the path of totality, and distinguishes total /
> annular / hybrid by the umbra radius at the actual surface intersection. The
> upcoming Aug 12 2026 (Arctic→Spain) and the six-minute Aug 2 2027
> (Spain→Egypt→Saudi Arabia) both look great to scrub through.
>
> It's free, no signup, runs entirely in the browser. It's an educational
> visualization, not a surveying instrument — verify contact times against NASA
> or IOTA before planning a trip. I'd genuinely appreciate corrections from
> anyone who checks it against published data. Link in comments (or: [link]).

> Tip: some subs auto-remove link posts — if so, post it as a text post with
> the link in the body and the first comment.

### r/eclipse
**Title:** `A free 3D tool that shows the path of totality for the 2026 and 2027 eclipses (and every eclipse to 2200)`
**Body:** same as r/astronomy, trimmed to the 2026/2027 paragraph up front.

### Eclipse-week second wave (post Aug 8–11, 2026)
Peak search interest. Post to r/eclipse (and r/astronomy if the first post
was ≥2 weeks earlier — don't repost into the same sub within days).

**Title:** `Watch Wednesday's total eclipse path sweep across Iceland and Spain in 3D — free, no signup`
**Body:**
> The Aug 12 eclipse is almost here. I built a free 3D globe that shows the
> umbral shadow sweeping from the Arctic across Iceland to a sunset finish in
> Spain — scrub the timeline to see exactly when totality reaches any point on
> the center line. Positions come from the astronomy-engine ephemeris
> (sub-arcsecond), projected onto the WGS84 ellipsoid. If you're near the path:
> check whether you're inside the limits — 20 km outside the edge means no
> totality at all. Safe viewing: ISO 12312-2 filters for all partial phases.
> [link] — and the 2027 six-minute eclipse is loaded too if you want to plan
> the big one.

---

## BONNEVILLE

### Show HN
**URL:** https://boardgaminghub.com/bonnevillespillwayoperator
**Title (pick one):**
- `Show HN: I'm a dam engineer – I made a Bonneville Dam operator game`
- `Show HN: A Columbia River dam-operations sim with real dissolved-gas physics`

**First comment:**
> I work in dam safety/hydrology and always thought operators' tradeoffs would
> make a good game. Spill supersaturates the tailrace with gas (~`100 +
> coef·√spill`), and TDG over ~115% harms juvenile salmon — so in spring
> snowmelt you *must* spill to protect the dam while fish limits cap how far you
> can open the gates. Generation is `P ≈ Q·H·0.0846·η`; the reservoir is a real
> mass balance. Stylized operations model (simplified from USACE data), not CFD
> — the formulas are documented on the page. Fisheries/hydro folks: tell me what
> I got wrong.

### r/hydrology and r/engineering
**Title:** `I'm a dam-safety engineer — I built a free Bonneville Dam operator sim (real TDG, salmon passage, spillway vs turbines)`
**Body:**
> I balance power generation, spillway releases, fish passage, and total
> dissolved gas on a stylized model of the real Bonneville complex on the
> Columbia. The tradeoffs are the real ones: spill entrains air and drives TDG
> up ~√(spill flow), TDG over ~115% harms juvenile salmon, and spring snowmelt
> forces you to spill to protect the dam while fish limits cap the gates.
> Generation follows P ≈ Q·H·0.0846·η and the reservoir is a real mass balance.
> Free, in the browser; formulas documented on the page. It's an operations
> model for intuition, not CFD. I'd love feedback from anyone in hydro ops or
> fisheries on what's oversimplified.

---

## The rules that decide whether it works
1. Reply to every comment fast — engagement drives ranking on HN and Reddit.
2. Never ask for upvotes.
3. One community at a time; space them out.
4. Read each subreddit's self-promo rules; post from an aged account, not a fresh one.
5. Expectation: most launches don't go viral — but even a modest post yields a
   real-visitor spike plus a few backlinks, and the backlinks are what lift the
   whole domain in Google over the following weeks.
