# Index Design — Records & Settings

The bridge from Algolia theory ([algolia-core.md](algolia-core.md)) to this build. Every derived
field and every setting below has a stated reason, because a setting nobody can justify is a setting
nobody can safely change.

Source data facts this design responds to are in [CLAUDE.md](../../CLAUDE.md) §"Source data".

---

## 1. Target record

One record per restaurant, 5,000 total. Flat — no nesting beyond `_geoloc` and `location`.

```jsonc
{
  "objectID": "101422",              // string, coerced from the JSON int

  // ── identity ──────────────────────────────────────────────
  "name": "Ruth's Chris Steak House – Waikiki",
  "chain_name": "Ruth's Chris Steak House",  // null when not a chain
  "location_label": "Waikiki",               // the stripped suffix, null when none
  "is_chain": true,
  "chain_location_count": 31,

  // ── taxonomy ──────────────────────────────────────────────
  "food_type": "Steak",                      // raw CSV value, preserved
  "cuisines": ["Steak", "Steakhouse"],       // split + normalized, multi-value facet
  "cuisine_group": "Steakhouse",             // coarse rollup for a clean facet
  "dining_style": "Fine Dining",
  "vibe_tags": ["date-night", "special-occasion", "big-group"],

  // ── location ──────────────────────────────────────────────
  "address": "226 Lewers St",
  "neighborhood": "Waikiki",
  "city": "Honolulu",
  "area": "Hawaii",
  "state": "HI",
  "postal_code": "96815",                    // normalized to 5 digits
  "country": "US",
  "location": {
    "lvl0": "Hawaii",
    "lvl1": "Hawaii > Honolulu",
    "lvl2": "Hawaii > Honolulu > Waikiki"
  },
  "_geoloc": { "lat": 21.279, "lng": -157.829 },   // numbers, not strings

  // ── price ─────────────────────────────────────────────────
  "price_range": "$50 and over",             // canonical, from CSV
  "price_tier": 4,                           // 2 | 3 | 4, derived from price_range
  "price_conflict": false,                   // true for the 220 disagreeing records

  // ── quality signals ───────────────────────────────────────
  "stars_count": 4.6,                        // raw, for display only
  "reviews_count": 1834,                     // raw, for display only
  "rating_bucket": 4,                        // floor(stars), for the rating facet
  "bayesian_rating": 4.5,                    // smoothed + rounded → custom ranking
  "popularity_score": 32,                    // log-scaled reviews → custom ranking

  // ── contact & actions ─────────────────────────────────────
  "phone": "(808) 440-7910",                 // CSV value — the clean one
  "phone_e164": "+18084407910",              // for tel: links
  "reserve_url": "https://www.opentable.com/single.aspx?rid=101422",
  "mobile_reserve_url": "http://mobile.opentable.com/opentable/?restId=101422",
  // no image field — every source URL is dead, see below
  "payment_options": ["AMEX", "Discover", "MasterCard", "Visa"],
  "cash_only": false
}
```

Well under the 10 KB Build-plan record limit.

---

## 2. Derived fields — how and why

### `objectID` — string coercion
JSON has it as `int`, CSV as `string`. Coerce both to string before joining, and Algolia requires
a string anyway. This is the whole join: 5,000/5,000, no orphans.

### `chain_name` / `location_label` / `chain_location_count`
Split `name` on a **whitespace-padded** dash — `/\s+[-–—]\s+/`. Never a bare hyphen, or
`Café Des Beaux-Arts` becomes `Café Des Beaux`. Take the head as the candidate brand, the tail as
`location_label`.

Then count candidates across the dataset and **only promote to `chain_name` when count ≥ 2**.
That guard is what keeps one-off names with a dash out of the chain logic.

Yields **158 brands over 604 restaurants; 113 brands have 2+ locations in one metro**. Powers
`attributeForDistinct` and answers persona 1's third pain point.

#### Why only suffixed names count — the deliberately conservative rule

A restaurant is only considered part of a brand if its *own* name carries a location suffix.
A bare `The Melting Pot`, sitting alongside twenty-six `The Melting Pot - <city>` records, is
**not** counted as a member. That is a choice, and it is the conservative one. Two looser rules
were measured against it:

| Rule | Brands | Restaurants | Metro |
|---|---|---|---|
| **Suffixed names only** *(shipped)* | **158** | **604** | **113** |
| Also treat an un-suffixed name matching a known brand as a member | 187 | 666 | 125 |
| Treat any repeated whole name as a brand | 207 | 706 | 126 |

The loosest rule buys 49 extra brands, but **20 of them are name collisions, not chains** —
`Town` in Carbondale CO and `Town` in Honolulu become one brand, as do `Union` in Pasadena and
`Union` in Mobile. Since `distinct` shows one record per brand, a false brand *hides a real
restaurant* from the results. For a booking platform that is a worse failure than under-counting,
so the rule requires positive evidence — an explicit location suffix — before it groups anything.

Worth knowing: the choice changes none of the demo cases. Atria's ×8 Pittsburgh, Perry's ×6
Houston, Dinosaur Bar ×6 NY, Stanford's ×5 Portland, Melting Pot ×26 and Ruth's Chris ×31 are
identical under all three rules. The only thing at stake is the headline count.

*Say it like this:* "I only group restaurants when the data gives me a reason to. If two
restaurants merely share a name, that's a coincidence, not a chain — and grouping them would
hide one of them from your diners."

### `cuisines[]` / `cuisine_group`
`food_type` has 114 values with composites. Split on `/` and `,`, trim, dedupe →
`Creole / Cajun / Southern` becomes `["Creole", "Cajun", "Southern"]`. Keep raw `food_type`
untouched so nothing is lost and we can prove the transformation.

`cuisine_group` is a hand-written rollup map (`Contemporary American` → `American`,
`Steak` → `Steakhouse`, `Sushi` → `Japanese`) giving a facet with ~25 usable values instead of
114 with a long tail of 1s. Both are indexed: `cuisines` for search and precise filtering,
`cuisine_group` for the browsable facet.

*Assumption to state:* the rollup is editorial judgment, not ground truth. In production it'd come
from OpenTable's own taxonomy.

### `price_tier` / `price_conflict`
`price_range` (CSV) is canonical because it's the human-readable string we display. `price_tier`
is derived from it: `$30 and under` → 2, `$31 to $50` → 3, `$50 and over` → 4.

The JSON `price` field is **dropped**, but where the two disagree (220 records, 4.4%) we set
`price_conflict: true`. Costs nothing, and it turns a silent data problem into a countable one we
can show the customer.

*Assumption:* the tier scale starts at 2 because JSON `price` never contains 1. We preserve that
rather than renumbering to 1–3, so our values stay comparable to their source system.

### `bayesian_rating` — the custom-ranking workhorse

```
bayesian = (v / (v + m)) * R + (m / (v + m)) * C
  R = stars_count
  v = reviews_count
  C = 4.294   (global mean across all 5,000 — measured)
  m = 140     (p25 of review counts — measured, computed at build time not hardcoded)

bayesian_rating = round(bayesian, 1)
```

Fixes the concrete defect in this dataset: 21 restaurants have a perfect 5.0 and **15 of them
have under 20 reviews**. Naive `desc(stars_count)` puts a 5.0-from-3-reviews above
*Mama's Fish House* (4.8 from 12,669). The smoothing pulls thin-evidence records toward the mean.

**Rounded to 1 decimal on purpose.** Two decimals would give near-unique values, records would
never tie on criterion 8a, and `popularity_score` would be dead code. This is the
high-cardinality trap from [algolia-core.md](algolia-core.md) §5, and demonstrating that we
avoided it deliberately is worth more than the extra precision.

Measured result: **17 distinct `bayesian_rating` values** across 5,000 records, against 38
distinct `popularity_score` values. That is the intended shape — the first attribute makes 17
coarse buckets and the second genuinely decides inside them. Records tie even after both, which
is visible in the build output: GW Fins (5,523 reviews) ranks below Restaurant August (4,668)
because both round to a popularity score of 37.

### `popularity_score`
`round(log10(reviews_count + 1) * 10)` → roughly 0–41. Review counts span 1 → 12,669 with a heavy
tail (median 336, p99 3,528); raw values would let a handful of famous restaurants dominate every
tie-break. Log-scaling compresses the tail; rounding creates ties.

### `rating_bucket`
`floor(stars_count)` → the "4 stars & up" facet. Note that **4,435 of 5,000 (89%) land in
bucket 4** — full distribution 1★ 3 · 2★ 11 · 3★ 530 · 4★ 4,435 · 5★ 21 — so this facet is nearly
useless as a filter and should be presented as **"X stars and up"** (a `NumericMenu`), not as
discrete checkboxes.

### `location.lvl0/1/2`
`area > city > neighborhood`. Required because `neighborhood` alone is ambiguous — 185 records
sit in a neighborhood literally called "Downtown," spread across many cities. Hierarchy scopes it.

### `vibe_tags[]`
Heuristic rules over `dining_style` + `price_tier` + `cuisine_group` + `bayesian_rating`:
`date-night`, `special-occasion`, `big-group`, `budget-friendly`, `casual`, `seafood-spot`, etc.
Keep the rule set small and readable — a rule that cannot be explained in one sentence is a rule the
team owning relevance will be afraid to touch.

*Assumption to state plainly:* derived, not ground truth. In production these come from menu
data, review text, or an LLM enrichment pass.

### `phone` / `phone_e164`
CSV `phone_number` is the display value; the JSON `phone` field is dropped (52% carry a trailing
`x`/`x27` fragment). `phone_e164` is digits-only with a `+1` prefix for `tel:` links.

### Imagery — no field at all
All 5,000 source URLs 302 to a 2.2 KB placeholder. The original design mapped `cuisine_group`
deterministically onto a small bundled photo set, bundled rather than hotlinked so a live demo had no
rate limit or third-party failure mode.

**Reversed in step 3.1a.** The app draws a cuisine pictogram tile instead, so nothing consumed the
paths and the field was removed. Substituted photography is the only thing on a results page that
pretends to be data, and a record pointing at image files that do not exist is worse than one that
admits the gap. The gap itself is a finding worth raising with the prospect — see
[`data-decisions.md`](../data-decisions.md) §3.

---

## 3. Index settings

```jsonc
{
  "searchableAttributes": [
    "unordered(name)",                      // persona 1 lives here; unordered so "chris ruths" works
    // chain_name removed — measured, changed 0 of 27 queries (see §8)
    "cuisines,food_type",                   // same tier — both are cuisine intent
    "neighborhood,city,area,state",         // "italian in soho" works without a filter
    "address"                               // lowest: street names are noisy
  ],

  "attributesForFaceting": [
    "searchable(cuisines)",                 // 114 values → needs facet search
    "cuisine_group",                        // ~25 values → plain list
    "dining_style",
    "price_range",
    "price_tier",
    "rating_bucket",
    "searchable(chain_name)",
    "searchable(city)",                     // 916 values
    "searchable(neighborhood)",             // 1,062 values
    "area",
    "state",
    "location.lvl0", "location.lvl1", "location.lvl2",
    "vibe_tags",
    "filterOnly(payment_options)",          // filter only — never shown as a facet list
    "filterOnly(price_conflict)",           // internal QA, not user-facing
    "filterOnly(objectID)"
  ],

  "attributeForDistinct": "chain_name",
  "distinct": false,                        // OFF by default; toggled per query for chain collapse

  "customRanking": ["desc(bayesian_rating)", "desc(popularity_score)"],

  // `ranking` left at the default:
  // ["typo","geo","words","filters","proximity","attribute","exact","custom"]

  "minWordSizefor1Typo": 4,
  "minWordSizefor2Typos": 8,
  "allowTyposOnNumericTokens": false,       // no typos on ZIPs or "Latitude 41"
  "typoTolerance": true,

  "queryType": "prefixLast",
  "removeWordsIfNoResults": "allOptional",  // conversational queries degrade to best-overlap
  "optionalWords": ["and"],                 // 438 names use "&", 190 spell it out — see §8
  "ignorePlurals": true,
  "removeStopWords": true,                  // reversed on measurement — see §8
  // separatorsToIndex removed — measured, changed 1 query by 1 hit (see §8)
  "queryLanguages": ["en"],
  "indexLanguages": ["en"],
  "alternativesAsExact": ["ignorePlurals", "singleWordSynonym", "multiWordsSynonym"],

  "attributesToHighlight": ["name", "chain_name", "cuisines", "neighborhood", "city"],
  "attributesToRetrieve": ["*"],

  "maxValuesPerFacet": 100,
  "hitsPerPage": 24,

  "renderingContent": {
    "facetOrdering": {
      "facets": { "order": ["cuisine_group", "price_range", "rating_bucket",
                            "dining_style", "vibe_tags", "location.lvl0"] },
      "values": {
        "price_range": {
          "order": ["$30 and under", "$31 to $50", "$50 and over"],
          "sortRemainingBy": "hidden"       // price bands must never sort alphabetically
        },
        "dining_style": { "hide": ["Home Style"], "sortRemainingBy": "count" },  // only 26 records
        "cuisine_group": { "sortRemainingBy": "count" }
      }
    }
  },

  "replicas": [
    "virtual(restaurants_rating_desc)",
    "virtual(restaurants_reviews_desc)",
    "virtual(restaurants_price_asc)"
  ]
}
```

### Notes on specific choices

**`removeStopWords: true`** — reversed during the build; the original reasoning is in §8 along with
the measurement that overturned it. Short version: stripping stop words does *not* hide
*The Melting Pot* or *The Capital Grille*, and keeping them broke every conversational location
query.

**`allowTyposOnNumericTokens: false`** — otherwise *Latitude 41* matches *Latitude 45*, and ZIP
searches go sideways.

**`removeWordsIfNoResults: "allOptional"`** — for `romantic italian near me`, dropping to
best-overlap beats returning nothing. The **words** criterion then ranks by how many query terms
matched, so the best partial match wins. `lastWords` would be the choice if queries were
brand-first; ours are conversational.

**`distinct: false` by default** — chain collapsing should be a *user-visible toggle*, not a
hidden behavior. `attributeForDistinct` is set at index level; the UI flips `distinct` per query.
Because the surviving record is chosen by the full ranking formula, with geo active the
**nearest** branch represents the brand automatically. That's the demo moment.

**Virtual replicas, not standard** — Relevant Sort keeps quality results near the top while
honoring the sort, which is what users actually want from "sort by rating." Also: no record-quota
cost, and the 20-replica cap is irrelevant at three. Trade-off to be ready for: for
*price ascending*, some users genuinely want exhaustive order, and a virtual replica won't give
strictly-cheapest-first. Acceptable here; worth naming out loud.

---

## 4. Geo parameters (query-time, via `<Configure>`)

As shipped, in `app/src/lib/geo.ts`:

```jsonc
{
  "aroundLatLng": "40.7562,-73.9840",
  "aroundRadius": "all",
  "aroundPrecision": [
    { "from": 0,     "value": 1500 },
    { "from": 5000,  "value": 5000 },
    { "from": 25000, "value": 25000 }
  ],
  "getRankingInfo": true
}
```

- **`aroundRadius: "all"`** — no hard cutoff. Essential given the coverage skew: Illinois has 3
  records and Washington has 3. A fixed radius returns an empty page in most of the country.
- **`aroundPrecision` graduated** — 1.5 km buckets while you're walking, 25 km buckets once you're
  choosing between metros. Without this, geo (criterion 2) strict-sorts by distance and our entire
  custom ranking is inert. **This is the headline relevance decision of the build.**
- **`getRankingInfo`** — gives `_rankingInfo.matchedGeoLocation.distance` for the "0.4 mi away" label,
  and `geoDistance` for the debug panel. **They are different numbers** — see below.

**The bucket sizes were measured, and the measurement replaced the ones this section used to
specify** (250 / 2,000 / 10,000 thresholds at 250 / 1,000 / 5,000 m). Against the live index those
returned *the same ten restaurants as no bucketing at all* from New York: 250 m is one Midtown block,
so the records inside it never tie and geo still decides the page. Widening the first band to 1.5 km —
a 15-to-20 minute walk — moves the top ten's mean adjusted rating from 4.16 to 4.56. The coarse outer
bands are kept because they are what orders a sparse market's tail by quality rather than by raw
distance. Full evidence, seven configurations across two markets, in
[`relevance-testing.md`](../relevance-testing.md).

**`geoDistance` is the bucket ordinal, not a distance.** Once `aroundPrecision` is set,
`_rankingInfo.geoDistance` reports the value the geo criterion sorted on: from New York with the
shipped buckets, the Pittsburgh Ruth's Chris — 509 km away — comes back as `10099`. Any UI printing it
as a distance says "6 mi" beside a restaurant in another state. `matchedGeoLocation.distance` stays the
true distance under every bucketing tested, agreeing with an independent haversine check to within
0.1%.

**Fallback chain** — the design here was browser geolocation → `aroundLatLngViaIP` → explicit city
picker → default market. What shipped is shorter, and `app/src/lib/use-search-centre.ts` carries the
reasoning: an already-granted browser position → New York, with the network estimate, eight markets and
"no location" all offered explicitly in the control. Nothing prompts for permission on load. The IP
step is offered rather than automatic because Algolia documents it as IPv4-only and VPN-unreliable, so
a silent network guess can relocate the board without saying so. The fourth link turned out to be
unnecessary: with `aroundRadius: "all"` no centre ever produces an empty board, so there is no failure
for a default market to rescue. New York is the default anchor — 695 city, 1,414 metro, 1,086 in the
state — because it is the densest market in the data and it makes every figure in these documents
reproducible from the deployed link.

---

## 5. Synonyms

```jsonc
[
  { "objectID": "bbq",      "type": "synonym", "synonyms": ["bbq", "barbecue", "barbeque", "bar-b-q"] },
  { "objectID": "steak",    "type": "synonym", "synonyms": ["steak", "steakhouse", "chophouse"] },
  { "objectID": "smallplt", "type": "synonym", "synonyms": ["tapas", "small plates"] },
  { "objectID": "sushi",    "type": "oneWaySynonym", "input": "sushi",  "synonyms": ["japanese"] },
  { "objectID": "nyc",      "type": "oneWaySynonym", "input": "nyc",    "synonyms": ["new york"] },
  { "objectID": "sf",       "type": "oneWaySynonym", "input": "sf",     "synonyms": ["san francisco"] },
  { "objectID": "nola",     "type": "oneWaySynonym", "input": "nola",   "synonyms": ["new orleans"] },
  { "objectID": "pdx",      "type": "oneWaySynonym", "input": "pdx",    "synonyms": ["portland"] }
]
```

City abbreviations are **one-way** deliberately: `nyc` should find New York, but a search for
`new york` shouldn't be reshaped by the abbreviation. Keep the list short — over-synonymizing is
the fastest way to destroy precision.

`alternativesAsExact` includes `multiWordsSynonym` so `small plates` still counts as an exact
match on criterion 7 rather than losing to a single-word coincidence.

---

## 6. Rules

| Rule | Condition | Consequence |
|---|---|---|
| Budget intent | query contains `cheap` / `budget` / `affordable` | strip the word, `filters: price_tier = 2`, banner via `userData` |
| Date night | contains `romantic` / `date night` | strip, `optionalFilters: ["vibe_tags:date-night<score=2>"]` |
| Special occasion | contains `birthday` / `anniversary` / `celebration` | strip, boost `vibe_tags:special-occasion` |
| Cuisine + city | *(any query)* | `automaticFacetFilters: ["cuisine_group", "city"]` — turns `italian denver` into two facet filters plus an empty text query |
| Empty query | conditionless, context `discovery-home` | `renderingContent` reorder + curated `userData` for the mood tiles |

`automaticFacetFilters` is the highest-value one: it converts natural language into structured
refinement with no NLP of our own, and it visibly populates the facet UI so the user can see and
undo what the engine inferred. Use `optionalFilters` (boost) rather than `filters` (hard cut) for
vibe intent — "romantic" is a preference, not a requirement, and hard-filtering it produces
sparse, disappointing pages.

---

## 7. Open questions to resolve during the build

1. **`m` in the Bayesian formula.** ~~150~~ **Resolved: 140**, computed as the p25 review count
   at build time rather than hardcoded. Test 336 (median) if the ranking needs to be more
   conservative — higher `m` means more shrinkage and a flatter ranking.
2. **Rounding precision on `bayesian_rating`.** 1 decimal is the plan. If the top of the results
   feels arbitrary, that's a sign `popularity_score` is doing too much of the work and we should
   go to 2 decimals.
3. ~~**Is `chain_name` worth having in `searchableAttributes`?**~~ **Resolved: no.** Measured both
   ways across all 27 test queries — 0 differed. See §8.
4. **Should `vibe_tags` be searchable, not just facetable?** Cheaper than Rules, but risks
   matching `romantic` against restaurants where it's a weak inference. Rules are the safer
   default; revisit if the Rule coverage feels thin.

---

## 8. Settings the measurements overturned

Three settings specified above were tested against the full 27-query manifest during Phase 2 rather
than taken on trust. Two were removed and one was reversed. Each was measured by applying both
variants to the live index and diffing every query's hit count and top 5.

### `chain_name` in `searchableAttributes` — **removed**

**0 of 27 queries differed.** Not a hit count, not an ordering. That's structural rather than
lucky: a brand name is always a substring of the restaurant name it was derived from, and `name`
sits on an earlier line, so the name match already wins the attribute criterion before
`chain_name` is ever consulted. It remains in `attributesForFaceting`, which is what the brand
facet and `searchForFacetValues` actually use.

### `separatorsToIndex: "&'-"` — **removed**

Specified because 438 names carry an ampersand and 942 an apostrophe. **One query differed, by one
hit, with no ordering change.** Both characters are already stripped from queries *and* records, so
they match without help — `bar & grill` and `bar grill` both return the same 67. Spot-checked the
1,118 hyphenated names separately: `dinosaur bar-b-que`, `dinosaur bar b que`, `bar-b-que`,
`cafe des beaux-arts` and `cafe des beaux arts` all resolve without it.

Indexing a separator only pays when the character is itself the distinguishing token — `C++`,
`AT&T`. Restaurant names don't work that way.

### `removeStopWords: false` → **`true`**

The original reasoning: 375 names begin with a stop word, so stripping them would hide
*The Melting Pot* and *The Capital Grille*. **That does not reproduce** — both queries return an
identical top 3 either way, because those records still match on their distinctive words.

What `false` actually cost was every conversational location query. `italian in soho` returned
**1,069 hits** led by *In Vino Wine Bar*, which matches "in" + "italian" for a word count of 2 —
tying exactly with the SoHo restaurants matching "soho" + "italian". Being genuinely in SoHo
conferred no advantage. With stop words removed it returns **20 hits, all Italian restaurants in
SoHo**.

This one is a real trade-off, not a free win. `the kitchen` keeps the correct result at #1 but
drops that brand's Denver and Boulder locations out of the top 3 in favour of unrelated kitchens.
Chain grouping collapses them to a single row anyway, and losing rank on one known-item query is
cheaper than losing a whole class of discovery query.

### `optionalWords: ["and"]` — **added**, replacing a planned synonym

The plan called for an `and ↔ &` synonym. It would have required adding `&` to
`separatorsToIndex` first, to manufacture a token purely so the synonym could point at it. The
defect is one-directional: `&` is stripped, so `bar & grill` already finds all 67, but
`bar and grill` returned **22 of 67** — a silently truncated page, which is worse than an empty one
because nobody reports it. `optionalWords` returns all 67 while the **words** criterion still ranks
the literal "and" spellings first. `removeWordsIfNoResults` cannot fix it: that query already had
results, so the recovery never fires.

The same test on `"the"` improved nothing — on `the palm` it widened 30 → 120 hits while pushing
the actual *Palm Restaurant* chain down the page — so `"the"` was not added.
