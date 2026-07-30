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

## Not tested here

**Geo.** Distance is the second criterion in the ranking formula, so switching it on would have
confounded every before/after comparison above. `aroundLatLng`, `aroundRadius` and the graduated
`aroundPrecision` buckets are query parameters, not index settings, and are exercised in the
application phase where the UI supplies a centre point.
