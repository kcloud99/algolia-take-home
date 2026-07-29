# Index Design — Records & Settings

The bridge from Algolia theory ([algolia-core.md](algolia-core.md)) to this build. Every derived
field and every setting below has a stated reason, because the technical debrief will ask for one.

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
  "image_url": "/img/cuisine/steakhouse-03.jpg",   // enriched — source URLs are dead
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
  C = 4.294   (global mean across all 5,000)
  m = 150     (≈ p25 of review counts)

bayesian_rating = round(bayesian, 1)
```

Fixes the concrete defect in this dataset: 21 restaurants have a perfect 5.0 and **15 of them
have under 20 reviews**. Naive `desc(stars_count)` puts a 5.0-from-3-reviews above
*Mama's Fish House* (4.8 from 12,669). The smoothing pulls thin-evidence records toward the mean.

**Rounded to 1 decimal on purpose.** Two decimals would give near-unique values, records would
never tie on criterion 8a, and `popularity_score` would be dead code. This is the
high-cardinality trap from [algolia-core.md](algolia-core.md) §5, and demonstrating that we
avoided it deliberately is worth more than the extra precision.

### `popularity_score`
`round(log10(reviews_count + 1) * 10)` → roughly 0–41. Review counts span 1 → 12,669 with a heavy
tail (median 336, p99 3,528); raw values would let a handful of famous restaurants dominate every
tie-break. Log-scaling compresses the tail; rounding creates ties.

### `rating_bucket`
`floor(stars_count)` → the "4 stars & up" facet. Note that 4,086 of 5,000 land in bucket 4, so
this facet is nearly useless as a filter and should be presented as **"X stars and up"**
(a `NumericMenu`), not as discrete checkboxes.

### `location.lvl0/1/2`
`area > city > neighborhood`. Required because `neighborhood` alone is ambiguous — 185 records
sit in a neighborhood literally called "Downtown," spread across many cities. Hierarchy scopes it.

### `vibe_tags[]`
Heuristic rules over `dining_style` + `price_tier` + `cuisine_group` + `bayesian_rating`:
`date-night`, `special-occasion`, `big-group`, `budget-friendly`, `casual`, `seafood-spot`, etc.
Keep the rule set small and readable — it must be explainable in one sentence in the debrief.

*Assumption to state plainly:* derived, not ground truth. In production these come from menu
data, review text, or an LLM enrichment pass.

### `phone` / `phone_e164`
CSV `phone_number` is the display value; the JSON `phone` field is dropped (52% carry a trailing
`x`/`x27` fragment). `phone_e164` is digits-only with a `+1` prefix for `tel:` links.

### `image_url`
All 5,000 source URLs 302 to a 2.2 KB placeholder. Map deterministically from `cuisine_group` to
a small bundled image set — bundled, not hotlinked, so the live demo has no rate limits or
third-party failure mode. Cheap, honest, and a good thing to flag to the prospect.

---

## 3. Index settings

```jsonc
{
  "searchableAttributes": [
    "unordered(name)",                      // persona 1 lives here; unordered so "chris ruths" works
    "unordered(chain_name)",                // brand match even when the suffix is noise
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
  "ignorePlurals": true,
  "removeStopWords": false,                 // "The Palm", "The Kitchen" need their stop words
  "separatorsToIndex": "&'-",               // 438 names have &, 942 have apostrophes
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

**`removeStopWords: false`** — counter to the usual default. 366 names begin with "The", and
*The Palm* / *The Kitchen* / *The Melting Pot* are real, searched-for names. Stripping stop words
would make them harder to find, not easier. Worth calling out as a dataset-specific decision.

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

```jsonc
{
  "aroundLatLng": "45.5152,-122.6784",
  "aroundRadius": "all",
  "aroundPrecision": [
    { "from": 0,     "value": 250 },
    { "from": 2000,  "value": 1000 },
    { "from": 10000, "value": 5000 }
  ],
  "getRankingInfo": true
}
```

- **`aroundRadius: "all"`** — no hard cutoff. Essential given the coverage skew: Illinois has 3
  records and Washington has 3. A fixed radius returns an empty page in most of the country.
- **`aroundPrecision` graduated** — 250 m buckets while you're walking, 5 km buckets once you're
  choosing between metros. Without this, geo (criterion 2) strict-sorts by distance and our entire
  custom ranking is inert. **This is the headline relevance decision of the build.**
- **`getRankingInfo`** — gives `_rankingInfo.geoDistance` for the "0.4 mi away" label and for the
  debug panel.

**Fallback chain** — browser geolocation → `aroundLatLngViaIP` → explicit city picker → default
market. `aroundLatLngViaIP` is IPv4-only and unreliable on VPN/localhost, so the city picker
isn't a nicety, it's the load-bearing fallback. Default to Portland (117 city / 197 metro) or
NYC (695 / 1,414).

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

1. **`m` in the Bayesian formula.** 150 (≈p25) is the starting point. Test 336 (median) too —
   higher `m` means more shrinkage and a flatter, more conservative ranking.
2. **Rounding precision on `bayesian_rating`.** 1 decimal is the plan. If the top of the results
   feels arbitrary, that's a sign `popularity_score` is doing too much of the work and we should
   go to 2 decimals.
3. **Is `chain_name` worth having in `searchableAttributes`?** It's mostly a substring of `name`.
   Measure whether it changes any test query before keeping it.
4. **Should `vibe_tags` be searchable, not just facetable?** Cheaper than Rules, but risks
   matching `romantic` against restaurants where it's a weak inference. Rules are the safer
   default; revisit if the Rule coverage feels thin.
