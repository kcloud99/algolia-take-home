# Relevance Testing

What we changed, what it did, and what is still wrong.

Two generated documents sit behind this one, both committed so the claims here can be checked
rather than taken on faith:

| File | What it is |
|---|---|
| [`relevance-queries.json`](relevance-queries.json) | The 27 test queries, **written before a single search result was observed** |
| [`relevance-baseline.md`](relevance-baseline.md) | Every query against Algolia's **default** settings |
| [`relevance-tuned.md`](relevance-tuned.md) | The same queries against the **shipped** configuration |

```bash
npm run index:test -- tuned     # regenerates the "after" document
```

---

## Method

Three rules governed this, because it is easy to produce a relevance improvement that measures
nothing.

1. **The queries were written first.** Choosing test queries after seeing output lets the
   configuration be tuned to flatter the test set. The manifest covers the twelve conditions worth
   testing — known-item, misspelled, concatenated, prefix, punctuation, broad, ambiguous, location,
   chain-in-a-single-metro, intent, zero-result and empty — and each entry states what a good
   result looks like. Queries could be *added* afterwards; none were removed or reworded.
2. **The baseline was captured before anything was configured.** Default-configuration results are
   unrecoverable once settings are written, and an improvement with no "before" is an assertion.
3. **Every result carries its ranking evidence.** Each run records `nbTypos`, `nbExactWords`,
   `proximityDistance` and `words` per hit from `getRankingInfo`. Algolia ranks by an ordered
   tie-breaking formula, so "this result is wrong" only becomes actionable once you can see which
   criterion put it there. Both documents embed the live `getSettings` output, so each proves which
   configuration produced it.

---

## Results

**Hard zero-results went from 6 of 27 to 1.** More importantly, several queries that *appeared* to
work at baseline were passing by accident.

| # | Query | Category | Before | After | |
|---|---|---|---|---|---|
| 1 | `Mama's Fish House` | known-item | 1 | 1 | — |
| 2 | `St. Elmo Steak House` | known-item | 2 | 2 | — |
| 3 | `ruths cris` | misspelled | 31 | 31 | order improved |
| 4 | `melting pott` | misspelled | 26 | 26 | order improved |
| 5 | `benihanna` | misspelled | 24 | 24 | order improved |
| 6 | `meltingpot` | concatenated | 26 | 26 | order improved |
| 7 | `fogodechao` | concatenated | 0 | **0** | ✗ still failing |
| 8 | `buca` | prefix | 53 | 53 | order improved |
| 9 | `capital gr` | prefix | 17 | **12** | ✓ noise removed |
| 10 | `wallse` | punctuation | 1 | 1 | — |
| 11 | `mccormick and schmicks` | punctuation | 10 | **13** | ✓ complete set |
| 12 | `sushi` | broad | 106 | 106 | ✓ order fixed |
| 13 | `bbq` | broad | 4 | **26** | ✓ |
| 14 | `small plates` | broad | 43 | **51** | ✓ |
| 15 | `town` | ambiguous | 532 | 532 | — |
| 16 | `downtown` | ambiguous | 469 | 469 | order improved |
| 17 | `italian in soho` | location | 0 | **20** | ✓ |
| 18 | `seafood portland` | location | 25 | **23** | ✓ tightened |
| 19 | `italian denver` | location | 42 | 41 | ✓ + facet refinement |
| 20 | `atrias pittsburgh` | chain-in-metro | 8 | 8 | — |
| 21 | `perrys houston` | chain-in-metro | 6 | 6 | — |
| 22 | `romantic` | intent | 0 | **1,604** | ✓ |
| 23 | `cheap eats` | intent | 0 | **3,125** | ✓ |
| 24 | `birthday dinner` | intent | 0 | **1,604** | ✓ |
| 25 | `vegan ramen` | zero-result | 0 | 94 | ~ degrades, weakly |
| 26 | `michelin` | zero-result | 3 | 3 | ~ see below |
| 27 | *(empty)* | empty | 5,000 | 5,000 | ✓ order fixed |

---

## What changed, by category

### Broad queries — the ranking was the whole problem

At baseline `sushi` returned the right 106 restaurants in a meaningless order: *Sushi Yasaka*
(4.4★, 646 reviews) above *Sushi Sasabune* (4.8★, 329). Every hit tied on typo, exact and
proximity, and with `customRanking: null` there was nothing left to break the tie, so the order was
effectively insertion order. Adding `desc(bayesian_rating)` then `desc(popularity_score)` puts
*Shari Sushi Lounge* (4.7★) first and a 4.6-or-better rating in every one of the top five.

The **empty query** is the same story and the clearest single piece of evidence. The discovery
landing page opened on *The Edgewater Grill* (3.9★), *Harbor House* and *Pier Cafe* — three
mid-rated San Diego restaurants that happened to be early in the file. It now opens on Russell's
(4.9★, 2,512 reviews), Quince (4.9★, 1,693) and *Mama's Fish House* (4.8★, 12,669).

`bbq` was the vocabulary gap: the dataset spells it "Barbecue" and never "BBQ", so the four
baseline hits were coincidences — restaurants with BBQ in their *name*. A synonym takes it to 26,
led by real barbecue restaurants.

### Location queries — one setting was doing all the damage

`italian in soho` returned **nothing** at baseline, then returned something worse: 1,069 hits led
by *In Vino Wine Bar*. The ranking evidence explains it exactly. *In Vino* matches "in" + "italian"
for a word count of 2 — precisely tying *Sant Ambroeus SoHo*, which matches "soho" + "italian".
Being genuinely in SoHo conferred no advantage whatsoever.

`removeStopWords: true` fixes it: 20 hits, every one an Italian restaurant in SoHo. This reversed a
documented design decision, and the reasoning behind that decision did not survive measurement —
details in [`kb/index-design.md`](kb/index-design.md) §8.

### Known-item and misspellings — already strong, and left alone

Typo tolerance needed almost nothing. `ruths cris` (two errors), `melting pott`, `benihanna` and
`meltingpot` all resolved at baseline and still do; what changed is the order within them. `wallse`
finds *Wallsé* with no configuration at all — diacritic normalisation is on by default, which is
worth pointing out to a team who would build an analyzer for it.

`capital gr` **tightened from 17 hits to 12**, which is the improvement here. Narrowing
`searchableAttributes` to five deliberate tiers removed matches coming from attributes that had no
business being searchable.

### The query that was passing by accident

`mccormick and schmicks` returned 10 hits at baseline. It should return 13 — the number of
McCormick & Schmick's locations in the data. It was matching through attributes we later removed
from the searchable set, at `proximityDistance: 16`, meaning "and" was matching something far away
from the brand name. Narrowing the index dropped it to **0**, which looked like a regression and
was actually the truth surfacing.

The fix is `optionalWords: ["and"]`, and the reason it is worth having generalises well beyond this
query. 438 restaurant names use "&" and 190 spell out "and". `&` is stripped from queries and
records alike, so `bar & grill` and `bar grill` both return the complete 67 — but `bar and grill`
returned **22 of 67** while looking perfectly healthy. A silently truncated page is more dangerous
than an empty one, because nobody reports it.

### Intent queries — three failures, one rule

`romantic`, `cheap eats` and `birthday dinner` all returned nothing, because none of those words
appear anywhere in the source data. Rules map them onto the `vibe_tags` and `price_tier` fields the
pipeline derived.

One mechanism detail is worth recording because the design got it wrong: **`query.remove` only
strips words that were part of the matched condition pattern.** A `remove` entry for any other word
is silently ignored. Stripping "cheap" from `cheap eats` left "eats", which matched 547 restaurants
including *East End Kitchen* on a typo — a confidently wrong page is worse than the empty one it
replaced. Each filler phrase therefore appears as its own condition, so `cheap eats` parses to `""`
while `cheap italian` still parses to `"italian"`.

### Chains in one metro — no change, and that is the point

`atrias pittsburgh` returns all 8 Atria's in the Pittsburgh metro and `perrys houston` all 6
Perry's, before and after. Both were already correct and the tuning had to *avoid breaking them*.

This constrained a real decision. `automaticFacetFilters` on `city` would have cut `atrias
pittsburgh` from 8 to 3, because only three of the eight have Pittsburgh as their city — the rest
are Mount Lebanon, Wexford, Gibsonia, McMurray and Murrysville. `area` is no better: its values are
compound strings like `"Denver / Colorado"`. So the rule detects cuisine only, and location stays
as text where the searchable-attribute tiers already handle it.

With `distinct: true` these collapse to a single row per brand, and because the survivor is chosen
by the full ranking formula, geo makes the *nearest* branch the representative automatically.

---

## Settings that did not survive measurement

Three settings from the original design were tested rather than trusted, and removed or reversed.
Full evidence in [`kb/index-design.md`](kb/index-design.md) §8.

| Setting | Verdict |
|---|---|
| `chain_name` in `searchableAttributes` | **Removed.** 0 of 27 queries differed. A brand name is always a substring of the restaurant name, and `name` ranks earlier. Re-checked after all tuning: still 0. |
| `separatorsToIndex: "&'-"` | **Removed.** 1 query differed, by 1 hit. Hyphens and apostrophes already match in both spellings. |
| `removeStopWords: false` | **Reversed to `true`.** Cost one class of query to protect a case that did not need protecting. |

A fourth, `sushi → japanese`, was measured and rejected: it doubles `sushi` from 106 hits to 221 by
admitting the whole Japanese group, filling the tail with teppanyaki and ramen. Broadening a query
where the diner was specific is not a favour.

---

## What is still wrong

Volunteered rather than buried. None of these are blocking; all are known.

**`fogodechao` returns nothing.** Algolia splits a concatenated token into at most *two* words —
`meltingpot` and `ruthschris` both resolve, and so does `fogo dechao`. Three-word brand names do
not. This is an engine limit, not a missing setting. The fix is one derived field: a
punctuation-stripped `name_compact` indexed as the lowest-priority searchable attribute, which
prefix-matches every brand at once. It was left out because it is a data-pipeline change for a
long-tail case, and the right way to size it is a query log rather than a guess.

**`michelin` returns three restaurants.** The word appears nowhere in any field of any record, but
typo tolerance on an eight-character word finds *Michelangelo* at one typo and two *Michels* at
two. Tightening typo settings enough to stop it would break `benihanna` and `melting pott`, which
matter more. The real lesson belongs to the customer: a reported no-results rate understates the
problem, because the engine papers over it with near-matches. The fix is a UI affordance — "no
exact match, showing similar" — not a setting.

**`vegan ramen` degrades, but weakly.** It returns 94 hits where it returned 0. The top hit, *Axe*,
is genuinely the one Vegan restaurant in the dataset. Positions 2–5 are typo matches of "vegan"
against **Las Vegas**. Worth stating plainly: there are **no ramen restaurants at all** in this
data and exactly one vegan restaurant, so there is no good answer to find. An earlier count of "12
ramen records" was wrong — it was matching the substring in *Sac‑ramen‑to*.

**`removeStopWords: true` costs a known-item query.** `the kitchen` keeps the correct restaurant at
#1 but drops that brand's Denver and Boulder locations out of the top 3 in favour of unrelated
kitchens. Chain grouping collapses them to one row anyway. This was a deliberate trade: losing rank
on one query against fixing an entire class of them.

**`romantic` and `birthday dinner` return identical result sets.** They should not. The Build plan
allows three Rules per index and the design needed four, so date-night and special-occasion merged
into a single occasion rule. They overlap heavily in this dataset — both are driven by dining style
and rating — which is what makes the merge tolerable rather than merely convenient. On a paid plan
they split back into two rules with distinct scored boosts.

**The occasion rule hard-filters where it should boost.** `optionalFilters` inside Rules is a paid
feature; Build returns a 402. A hard filter is defensible only because the tags are broad (1,509 and
478 restaurants), so a diner still gets a full page. It does mean an untagged restaurant is excluded
rather than merely ranked lower, and `vibe_tags` are our inference, not ground truth.

**`cheap eats` returns 3,125 restaurants** — 62% of the index, because the price distribution is
badly skewed. Custom ranking floats the best ones to the top, so the page is good even though the
filter is not selective. Filtering on `vibe_tags:budget-friendly` (cheap *and* well-rated, 1,107
records) was the alternative and was rejected: the diner asked about price, and hiding 2,000 cheap
restaurants behind our own quality inference is not what they asked for.

**Sorting by rating barely differs from default relevance** — 21 of 27 queries return an identical
top 5. That is a consequence of the default already being quality-weighted, which is arguably the
right outcome, but it means the sort control is less useful here than it looks. It also applies
Relevant Sort's relevancy cutoff: `michelin` reports 3 hits and returns 1.

---

## Geo — tested separately, and the measurement changed the design

Geo is deliberately absent from the 27-query table above. Distance is the *second* criterion in the
ranking formula, so switching it on would have confounded every before/after comparison — it reorders
results by a parameter the manifest does not control. `aroundLatLng`, `aroundRadius` and
`aroundPrecision` are query parameters rather than index settings, so they belong to the application,
and they were measured on their own terms once the UI could supply a centre.

**The claim being tested.** At Algolia's default granularity the geo criterion is effectively a strict
distance sort, and because it sits above `words`, `proximity`, `attribute`, `exact` and all of
`customRanking`, everything below it is inert — including the Bayesian rating the pipeline exists to
produce. Bucketing distance with `aroundPrecision` makes nearby restaurants *tie* on geo so quality
decides inside the bucket: "nearby **and** good" rather than "nearest at any cost."

That claim held. The three numbers the design specified did not.

### Seven configurations, two markets, the empty query

Top 10, ranked from the coordinate-wise median of each market's records. "Spread" is the true distance
of the furthest of the ten.

| `aroundPrecision` | New York — adj rating | reviews | spread | Opens on | Portland — adj rating |
|---|---|---|---|---|---|
| *(unset — the default)* | 4.16 | 619 | 0.21 km | The Long Room, 4.2 | 4.30 |
| flat 500 | 4.31 | 1,308 | 0.48 km | Oceana, 4.4 | 4.43 |
| flat 2,000 | 4.56 | 2,021 | 1.91 km | Le Bernardin, 4.7 | 4.60 |
| flat 5,000 | 4.59 | 2,425 | 4.90 km | Le Bernardin, 4.7 | 4.65 |
| **250 / 1,000 / 5,000** *(as designed)* | **4.16** | **619** | **0.21 km** | STK Midtown, 4.3 | 4.33 |
| **1,500 / 5,000 / 25,000** *(shipped)* | **4.56** | **1,998** | **1.38 km** | Le Bernardin, 4.7 | 4.56 |
| 2,000 / 10,000 / 50,000 | 4.56 | 2,021 | 1.91 km | Le Bernardin, 4.7 | 4.60 |

**The documented buckets did nothing.** 250 / 1,000 / 5,000 returned *the same ten restaurants* as no
bucketing at all in the densest market — same mean adjusted rating, same mean review count, same 210 m
spread — merely reordered among themselves. The reason is scale: 250 m in Midtown Manhattan is one
block, and the records inside one block do not tie, so the geo criterion still decided the page. The
first bucket has to be wide enough to contain a *choice* before quality has anything to break.

Widening it to 1,500 m — a 15-to-20 minute walk, which is what "walking distance" actually means —
moves the top 10's mean adjusted rating from 4.16 to 4.56 and its mean review count from 619 to 1,998,
while keeping every result inside 1.4 km. The empty query from New York opens on Le Bernardin (4.7 from
4,232 reviews) instead of The Long Room (4.2 from 126). The idea in the design was right and the number
was wrong by an order of magnitude.

**What graduation buys, as opposed to one flat bucket**, shows up at the other end — and this is why the
shipped value is still three bands rather than a flat 1,500. Coarsening to 25 km rings far out means
distant restaurants tie with *each other*, so quality orders them. From the three-restaurant Arkansas
market, the Little Rock cluster 220–240 km away comes back best-rated first (4.4 · **4.6** · 4.3 · 4.3
· 4.3) where a flat bucket returns it in raw distance order (4.4 · 4.3 · **4.6** · 4.2 · 4.3), burying
the best restaurant in the cluster behind two closer, worse ones. Visible on the board as a distance
column reading 138 · 143 · 141 mi — out of order by distance, in order by quality, which is the whole
point.

### `aroundRadius: "all"` is what makes a thin market work

Coverage is lopsided: whole states hold three records. With a fixed radius those markets return an
empty page. With `"all"` the distance cutoff is removed while distance stays in the ranking, so the
three-restaurant Arkansas market shows its three — 0.6 mi, 12 mi, 55 mi — and then radiates outward
through Hot Springs and Little Rock. Same board, no special case, nothing to detect.

One correction to this project's own notes while testing it: **the planned sparse-market demo does not
exist.** There is no Chicago in this dataset — not a thin Chicago, none at all. Its three Illinois
records are in Moline and Rock Island, which the data files under the `Iowa` area, and its three
Washington records are Camas, Vancouver and Washougal, filed under `Portland / Oregon`.
`Fayetteville / Northwest Arkansas` (3 records) is the real equivalent and is in the app's market list
for that reason.

### `geoDistance` is not a distance

The per-row "0.4 mi" reads `_rankingInfo.matchedGeoLocation.distance`, not `_rankingInfo.geoDistance`,
and the difference is not cosmetic. Once `aroundPrecision` is set, `geoDistance` becomes the **bucket
ordinal the geo criterion sorted on**. Measured from New York with the shipped buckets:

| Restaurant | `geoDistance` | `matchedGeoLocation.distance` | true (haversine) |
|---|---|---|---|
| Ruth's Chris — Parsippany, NJ | 10,006 | 40,715 | 40.7 km |
| Ruth's Chris — Pittsburgh, PA | 10,099 | 509,458 | 509.3 km |
| Ruth's Chris — River Walk, San Antonio | 10,507 | 2,548,657 | 2,547.9 km |

Printing `geoDistance` would have put "6 mi" beside a restaurant in another state.
`matchedGeoLocation.distance` agreed with an independent haversine check to within 0.1% under every
bucketing tested. The ordinal is still the more interesting number — it is literally the ranking key —
but it belongs in a "why is this result here?" panel rather than in a row a diner reads. Both of the
knowledge-base notes that recommended `geoDistance` for the label are corrected.

Also worth stating precisely, since it gets said out loud: Algolia's reference gives the default
`aroundPrecision` as 10 m, but measured, `_rankingInfo.geoPrecision` comes back as **1** and
`geoDistance` equals the true distance to the metre. Either way it is a metre-level strict distance
sort, which is the point.

### Residual costs, stated

- **A far-flung last row.** On page 1 of `steakhouse` from Portland, row 24 is a restaurant in Florida
  4,050 km away with a worse geo ordinal than several nearer records that did not make the page. Flat
  bucketing put a Sacramento restaurant there instead. The returned set is monotone in the reported
  ordinal in every case tested, so this is the tail of Algolia's geo retrieval rather than a ranking
  inversion — but it is the one visible cost of the coarse outer bands, and it is confined to the
  bottom row.
- **Distances that look mis-sorted.** 143 mi above 141 mi is the feature working, and a diner has no way
  to know that. The affordance for it is the debug panel, not a footnote.
- **`aroundLatLngViaIP` works and is still not the default.** Measured from this machine it resolved to
  the right city and returned restaurants 2.1–2.8 mi away. It is offered in the location control rather
  than applied automatically: Algolia documents it as IPv4-only and unreliable behind a VPN, so a silent
  network guess can relocate the board without saying so, and every figure in these documents is quoted
  from New York.
