# Algolia Core Engine — Reference

How the Algolia engine actually decides what to return and in what order. Read this before
touching index settings or arguing about relevance. Verified against docs at algolia.com/doc,
July 2026.

---

## 1. Mental model

Algolia is **not** a scoring engine like Elasticsearch/BM25. There is no single float score.

Algolia uses a **tie-breaking algorithm**: an ordered list of criteria applied one at a time.
Criterion 1 sorts all matching records into buckets. Criterion 2 only reorders *within* those
buckets. Criterion 3 only reorders within *those*, and so on. A later criterion can never
override an earlier one.

Two consequences that drive nearly every relevance decision:

1. **Order in the formula is absolute power.** If geo is criterion 2, nothing below it —
   including your custom ranking — can pull a nearer-but-worse record below a farther-but-better
   one. Unless they tie.
2. **Ties are the only way lower criteria get to speak.** This is why deliberately *reducing
   precision* (bucketing ratings, bucketing distance) is a core tuning technique rather than a
   hack. You create ties on purpose so the next criterion can do its job.

This is the single most important thing to be able to explain to a prospect coming from
Elasticsearch. Their mental model is "tune the scoring function." Algolia's is "order the
criteria, then engineer the ties."

**Retrieval vs. ranking.** Filters, facet filters, and geo *area* filters (`insideBoundingBox`,
`insidePolygon`) decide which records are eligible. The ranking formula then orders whatever
survived. `aroundRadius` is a filter; the geo criterion is ranking. Don't conflate them.

---

## 2. The default ranking formula

The `ranking` setting. Default, exactly:

```json
["typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"]
```

| # | Criterion | What it sorts by | Notes |
|---|---|---|---|
| 1 | **typo** | Fewest typos first | Exact → 1 typo → 2 typos. |
| 2 | **geo** | Distance, nearest first | Only active when a geo param is set. Default granularity 10 m — tune with `aroundPrecision`. |
| 3 | **words** | Most matching optional words first | Only active when `optionalWords` / `removeWordsIfNoResults: allOptional` is in play. Counts *distinct* query words matched, not term frequency. |
| 4 | **filters** | Most matching `optionalFilters` first | Zero matched filters scores 0. Scores tunable via filter scoring. |
| 5 | **proximity** | Query words closest together first | "George Clooney" (distance 1) beats "George Timothy Clooney" (distance 2). Capped by `minProximity`. |
| 6 | **attribute** | Best-matched attribute first | Driven by `searchableAttributes` order, then word position within the attribute. |
| 7 | **exact** | Whole-word, typo-free matches first | Synonym and singular/plural matches count as exact by default — see `alternativesAsExact`. |
| 8 | **custom** | Your `customRanking` array, in order | The final tie-breaker. |

**Do not reorder the default formula casually.** It is the product of a lot of tuning across
many customers. The legitimate reasons to touch `ranking` are (a) adding `asc()`/`desc()` at the
top for a standard replica's sort, and (b) genuinely unusual domains. Reordering because a
single query looked wrong is how you break a hundred queries you didn't test.

**`asc(attr)` / `desc(attr)`** can be inserted into the `ranking` array. Placed first, the index
becomes a strict sort — this is how standard replicas implement "sort by price."

---

## 3. Settings vs. search parameters

- **Settings** are index-level, set once via `setSettings`, and apply to every query.
- **Search parameters** are per-query.
- Many parameters are *both* — `hitsPerPage`, `typoTolerance`, `distinct`, `removeStopWords`,
  `ignorePlurals`, `attributesToRetrieve`, `maxValuesPerFacet`. A query-time value overrides
  the index setting for that query.
- A few are settings-only and structural: `searchableAttributes`, `attributesForFaceting`,
  `customRanking`, `ranking`, `replicas`, `attributeForDistinct`, `separatorsToIndex`,
  `unretrievableAttributes`. Changing these **reindexes the index**, so they aren't free.

---

## 4. searchableAttributes

Declares what is searchable and how strongly. Order = importance; it drives the **attribute**
criterion.

```json
"searchableAttributes": [
  "unordered(name)",
  "unordered(chain_name)",
  "cuisines,food_type",
  "neighborhood,city,area,state",
  "address"
]
```

- **Position matters.** Earlier = ranks higher on the attribute criterion.
- **Comma-separated on one line = equal importance.** `"cuisines,food_type"` is one tier.
- **`unordered(attr)`** — word position inside the attribute is ignored. Default is *ordered*,
  where matching the first word of an attribute beats matching the fifth.
  Use `unordered` for names/titles where users type words out of order.
  Use ordered for attributes where the front genuinely matters more.
- **Not listed = not searchable.** Unlisted attributes still work for filtering, faceting,
  custom ranking, and display. Default (empty list) = everything is searchable, which is almost
  never what you want.
- **Don't include** URLs, image paths, IDs you'd never type, or numeric ranking fields. They
  add index size and create bizarre matches.
- Nested attributes are addressed with dots: `"author.name"`.

**Rule of thumb:** if a match in attribute A should always outrank a match in attribute B,
put A on an earlier line. If they're equivalent, same line.

---

## 5. customRanking

The last criterion. **It only breaks ties.** It does not "boost."

```json
"customRanking": ["desc(bayesian_rating)", "desc(popularity_score)"]
```

### The high-cardinality trap — the single most common mistake

If a custom ranking attribute has near-unique values (a raw float rating like `4.3213`, a raw
timestamp, a raw view count), **records almost never tie on it**, so every subsequent custom
ranking attribute is dead code. You wrote a three-attribute custom ranking and only the first
one ever fires.

**Fix: deliberately reduce precision.** Round `4.3213` → `4.3`. Bucket view counts into
log-scale tiers. Now records tie, and attribute two gets to break the tie.

Corollary: put the *coarsest, most decisive* signal first and finer signals after.

### Choosing attributes

Good: numeric or boolean, reflects genuine business value — bookings, sales, clicks, smoothed
rating, recency, availability, `is_promoted`, `is_discontinued` (as `asc`).

Bad: raw averages without volume weighting. A 5.0 from 3 reviews outranking a 4.7 from 5,000 is
the classic failure. **Smooth with a Bayesian/shrinkage estimator:**

```
smoothed = (v / (v + m)) * R  +  (m / (v + m)) * C

R = this record's mean rating
v = this record's rating count
m = a "confidence threshold" count (a low percentile of v across the dataset)
C = global mean rating across the dataset
```

Records with few ratings get pulled toward the global mean; records with many keep their own.
Then **round the result** (see the trap above) so it can still tie.

Also bad: anything a user would expect to control themselves (price). That belongs in a sort
replica, not custom ranking.

---

## 6. Typo tolerance

Distance = insertions + deletions + substitutions + transpositions. Max 2 typos per word
(3 if the first error is on the first letter).

| Setting | Default | Meaning |
|---|---|---|
| `typoTolerance` | `true` | `true` \| `false` \| `"min"` \| `"strict"` |
| `minWordSizefor1Typo` | `4` | Words shorter than this get zero typo tolerance |
| `minWordSizefor2Typos` | `8` | Words shorter than this get at most one typo |
| `allowTyposOnNumericTokens` | `true` | Set `false` for SKUs, ZIPs, years, phone numbers |
| `disableTypoToleranceOnAttributes` | `[]` | Per-attribute kill switch |
| `disableTypoToleranceOnWords` | `[]` | Per-word kill switch, for brand names that are near-misses of common words |

- `"min"` — if there are typo-free results, show only those; otherwise fall back to typo matches.
- `"strict"` — more aggressive version of the same idea, harder cut.

**Typo tolerance does not apply to:** punctuation, special characters, logogram languages
(Chinese/Japanese), quoted phrases under `advancedSyntax`, and — importantly —
**splits and concatenations**. `meltingpot` → `melting pot` is *not* typo tolerance; that's
handled separately by the engine's word-splitting/concatenation logic, which is on by default
for supported languages.

Typo is criterion 1, so a 1-typo match can never outrank an exact match regardless of how much
better it is on every other axis. If that's wrong for your domain, the answer is usually
`disableTypoToleranceOnWords`, not reordering `ranking`.

---

## 7. Query strategy

| Setting | Default | Notes |
|---|---|---|
| `queryType` | `"prefixLast"` | Only the **last** word is treated as a prefix — correct for as-you-type. `prefixAll` = every word is a prefix (noisy, slow). `prefixNone` = exact words only. |
| `removeWordsIfNoResults` | `"none"` | See below. |
| `optionalWords` | `[]` | Words that *may* match. Activates the **words** criterion. |
| `advancedSyntax` | `false` | Enables `"quoted phrases"` and `-negation`. |
| `exactOnSingleWordQuery` | `"attribute"` | What "exact" means for one-word queries: `attribute` \| `word` \| `none`. |
| `alternativesAsExact` | `["ignorePlurals", "singleWordSynonym"]` | Which alternatives still count as *exact*. Add `"multiWordsSynonym"` to let multi-word synonyms count too. |
| `disablePrefixOnAttributes` | `[]` | Prefix matching off for specific attributes. |
| `disableExactOnAttributes` | `[]` | Excludes attributes from the exact criterion. |

### `removeWordsIfNoResults`

Recovery strategy when a multi-word query returns nothing. Removes up to 5 words.

- **`none`** (default) — return zero results. Honest, sometimes correct.
- **`lastWords`** — drop from the end. `blue leather italian shoes` → `blue leather italian` → …
  Best when the *first* words carry the intent (brand-first queries).
- **`firstWords`** — drop from the front. Best when trailing words carry the intent.
- **`allOptional`** — retry once with all words optional (OR instead of AND). The **words**
  criterion then ranks records by how many query words they matched, so best-overlap wins.
  Best for exploratory/conversational queries.

For natural-language-ish queries (`romantic italian near me`), `allOptional` degrades far more
gracefully than `lastWords`.

---

## 8. Text processing

| Setting | Notes |
|---|---|
| `ignorePlurals` | `true`, `false`, or an array of language codes. Handles boots/boot. |
| `removeStopWords` | Same shape. Strips "the", "a", "of". Careful: names like *The Palm* rely on stop words. |
| `separatorsToIndex` | Characters normally stripped that you want indexed. Add `&`, `'`, `+` when brand names depend on them. |
| `keepDiacriticsOnCharacters` | By default Algolia **normalizes diacritics** — `Wallsé` is findable as `wallse` with no config. Only set this if you need to *preserve* the distinction. |
| `customNormalization` | Custom char→char mapping. Max 10 per application. |
| `decompoundQuery` / `decompoundedAttributes` | Splits compound words. Relevant for German/Dutch/etc., not English. |
| `camelCaseAttributes` | Splits `camelCase` into words. |
| `queryLanguages` / `indexLanguages` | Set these — several of the above are language-aware and quietly no-op without them. |

Accent/diacritic normalization being **on by default** is a nice demo moment: it just works,
with zero configuration, on data that would need explicit analyzers in Elasticsearch.

---

## 9. Geo search

### Record shape

`_geoloc` with **numeric** lat/lng. Strings silently break it.

```json
{ "_geoloc": { "lat": 40.639751, "lng": -73.778925 } }
```

Multiple positions per record (a chain with many branches in ONE record) is an array:

```json
{ "_geoloc": [ { "lat": 47.27, "lng": 5.10 }, { "lat": 47.29, "lng": 5.00 } ] }
```

### Ranking vs. filtering

| Parameter | Type | Effect |
|---|---|---|
| `aroundLatLng` | ranking + filter | `"lat,lng"` string. Activates the geo criterion. |
| `aroundLatLngViaIP` | ranking + filter | Derives the center from the request IP. **IPv4 only.** |
| `aroundRadius` | filter | Meters, or `"all"`. `"all"` = no distance cutoff, still ranked by distance. |
| `aroundPrecision` | ranking | **Bucket size in meters for the geo criterion.** See below. |
| `minimumAroundRadius` | filter | Floor on the auto-computed radius. Useful in dense areas. |
| `insideBoundingBox` | filter only | Rectangle. Does **not** affect ranking. |
| `insidePolygon` | filter only | Polygon. Does **not** affect ranking. Ignored if bounding box is also set. |
| `getRankingInfo: true` | debug | Returns `matchedGeoLocation` + distance per hit. Use this to *prove* tuning worked. |

### `aroundPrecision` — the high-leverage setting

Default geo granularity is **10 m**, which means the geo criterion is effectively a strict
distance sort. Since geo is criterion 2, everything below it — proximity, attribute, exact, and
all your custom ranking — is dead. You get "nearest," not "best nearby."

Setting `aroundPrecision: 2000` buckets all records within the same 2 km ring as **tied** on
geo, so the remaining criteria decide the order inside each ring. The result is
**"nearby AND good"** rather than "nearest at any cost."

It also accepts a graduated array — tight buckets close in, loose buckets far out:

```json
"aroundPrecision": [
  { "from": 0,     "value": 250 },
  { "from": 2000,  "value": 1000 },
  { "from": 10000, "value": 5000 }
]
```

Read: within 2 km use 250 m buckets; from 2–10 km use 1 km buckets; beyond that 5 km. This is
the correct default for "restaurants near me" — precision matters when you're walking, not when
you're deciding between neighborhoods.

**Pair with `aroundRadius: "all"`** so sparse markets degrade to "here's the nearest thing,
even if it's 40 miles away" instead of an empty result set.

---

## 10. Faceting and filtering

### Declaring facets

```json
"attributesForFaceting": [
  "cuisines",
  "searchable(chain_name)",
  "filterOnly(objectID)",
  "afterDistinct(category)",
  "afterDistinct(searchable(publisher))"
]
```

| Modifier | Effect |
|---|---|
| *(none)* | Filterable **and** returns facet counts for UI display. |
| `filterOnly(attr)` | Filterable only, no counts. Smaller index, faster. Use for attributes you filter on but never display as a facet list. |
| `searchable(attr)` | Enables `searchForFacetValues` — type-ahead *within* facet values. Required for any facet with hundreds+ of values. **Incompatible with `filterOnly`.** |
| `afterDistinct(attr)` | Facet counts computed after `distinct` dedup. Combinable: `afterDistinct(searchable(attr))`. |

Attribute names are **case-sensitive**. Filter *values* are case-insensitive (except `objectID`).
**Never put a colon in a facet name** — `filters` syntax uses `:` as its delimiter.

No hard cap on faceted attributes, but a bloated list slows `getSettings` and the dashboard.

### Filter syntax

- **`filters`** — SQL-ish string: `"cuisines:Italian AND price_tier < 3 AND NOT closed"`.
  Supports `AND`/`OR`/`NOT`, parentheses, numeric comparators, and `attr:lower TO upper`.
- **`facetFilters`** — array form. **Nesting encodes the boolean**:
  `[["cuisines:Italian", "cuisines:French"], "city:Denver"]` = *(Italian OR French) AND Denver*.
  Inner array = OR, outer = AND.
- **`numericFilters`** — same array/nesting semantics for numeric comparisons.
- **`tagFilters`** — operates on the special `_tags` attribute.
- **`optionalFilters`** — does **not** filter. Boosts (or with `-`, demotes) matching records via
  the **filters** ranking criterion. This is how you "prefer, but don't require."

### Conjunctive vs. disjunctive

- **Conjunctive (AND)** — selecting two values narrows. Cheap.
- **Disjunctive (OR)** — selecting two values within the same facet widens, and the facet must
  still show counts *as if unfiltered*. This requires extra queries, which **InstantSearch
  handles for you** via multi-query. At raw-API level you'd build those queries yourself.
  A good reason to use InstantSearch rather than hand-rolling.

### Hierarchical facets

Convention, not a special type — a set of flat attributes with full paths at each level:

```json
"location": {
  "lvl0": "New York / Tri-State Area",
  "lvl1": "New York / Tri-State Area > New York",
  "lvl2": "New York / Tri-State Area > New York > SoHo"
}
```

Declare each level in `attributesForFaceting`. `HierarchicalMenu` in InstantSearch renders the
drill-down. **Disjunctive faceting is not supported on hierarchical facets.**

Hierarchy is the right answer whenever a value is ambiguous without its parent — e.g. a
neighborhood called "Downtown" that exists in thirty different cities.

### Facet counts

`maxValuesPerFacet` default 100, max 1,000. Counts on very large indices may be approximate;
check `exhaustiveFacetsCount` in the response. `searchForFacetValues` returns 10 by default,
up to `maxFacetHits` = 100.

---

## 11. distinct / attributeForDistinct

Deduplicates or groups results by a shared attribute value.

```json
{ "attributeForDistinct": "chain_name", "distinct": true }
```

- `distinct: true` (or `1`) → **one** record per group. `distinct: 3` → up to three per group.
- **Which record survives?** The best-ranked one, by the full ranking formula. So you control
  the representative via `customRanking` — e.g. put `desc(is_flagship)` first, or rely on geo so
  the *nearest* branch of a chain represents it.
- Set `attributeForDistinct` as a **setting**; `distinct` can be toggled per query. That means
  you can offer "group chains" as a UI switch on the same index.
- Requires **flat records** — one record per variant, with the grouping key repeated on each.
  Don't nest variants inside a parent record.
- `nbHits` reflects post-dedup counts. For facet counts to agree, use `afterDistinct(...)` or
  `facetingAfterDistinct: true`.

Canonical uses: product variants (one row per design, not per colorway), chunked documents (best
chunk per page), and **multi-location brands** (one row per brand, nearest branch shown).

---

## 12. Sorting: standard vs. virtual replicas

A replica is a second index with a different ranking. You never write to a replica; it syncs
from the primary automatically.

| | Standard replica | Virtual replica |
|---|---|---|
| Storage | Full copy — **counts against your record quota** | View over the primary; adds <10 MB per 1M records |
| Limit | Unlimited | **20 per index** |
| Settings | All settings customizable | ~33 settings only; **cannot** change `ranking`, `searchableAttributes`, `attributesForFaceting` (change those on the primary) |
| Sort behavior | **Exhaustive sort** — strict order by the attribute | **Relevant Sort** — applies the sort while preserving relevance |

**Exhaustive sort** returns literally every match in strict attribute order. Correct for
"newest first" on a news archive.

**Relevant Sort** keeps highly relevant results near the top even if strict order would bury
them — searching "notebook" sorted by price still shows laptops before laptop *accessories*.
For consumer discovery UIs this is almost always what users actually mean by "sort by rating,"
and it's the more defensible choice in a demo.

Configure by listing replica names on the primary's `replicas` setting; virtual ones are wrapped:
`["virtual(myindex_rating_desc)", "myindex_price_asc"]`.

---

## 13. Synonyms

Separate objects on the index, managed via `saveSynonyms`.

| Type | Shape | Behavior |
|---|---|---|
| `synonym` (regular, multi-way) | `{ type, synonyms: ["pants","trousers","slacks"] }` | All terms fully interchangeable |
| `oneWaySynonym` | `{ type, input: "tablet", synonyms: ["ipad"] }` | `tablet` finds `ipad`; `ipad` does **not** find `tablet` |
| `altCorrection1` / `altCorrection2` | `{ type, word, corrections: [...] }` | Treated as a 1- or 2-typo match, so exact matches still outrank the alternative |
| `placeholder` | `{ type, placeholder: "<model>", replacements: ["13","14"] }` | Token substitution inside records |

Gotchas that bite people:

- **Plurals are not implied.** A `boot`/`shoe` synonym does not cover `boots`/`shoes`.
  Combine with `ignorePlurals`.
- **No transitivity.** A↔B and B↔C does not give you A↔C.
- **Multi-word synonyms are order-sensitive.** "high definition" won't match "definition high".
- **Synonym matches count as *exact*** by default via `alternativesAsExact`
  (`ignorePlurals`, `singleWordSynonym`). Add `multiWordsSynonym` if you want multi-word ones
  to count too — otherwise they lose on criterion 7.
- Over-synonymizing ambiguous words is a classic way to wreck precision. Fewer, sharper synonyms.

**Synonyms vs. Rules:** synonyms expand *matching* and don't guarantee identical result sets
between the two terms. If two queries must return *exactly* the same thing, use a Rule that
rewrites the query.

Limit: 10,000 synonyms per index (1,000 on Build).

---

## 14. Rules

Conditional overrides applied at query time. No reindex, instantly reversible, optional validity
window. Structure: **condition(s)** (optional) → **consequence** (required) → **validity**
(optional).

### Conditions

- **`pattern` + `anchoring`** — `is` (whole query) | `contains` | `startsWith` | `endsWith`.
  `alternatives: true` also matches plurals, synonyms, and typos of the pattern.
- **`filters`** — fires when the query's filters exactly match. Attributes must already be in
  `attributesForFaceting`.
- **`context`** — fires when the query passes a matching string in `ruleContexts`. This is how
  you do device-, page-, or campaign-specific behavior.
- **No condition** — applies to every search. Good for seasonal merchandising.

Up to 25 conditions per rule, OR'd together.

### Consequences

- `promote` — pin specific `objectID`s to positions
- `hide` — remove specific records
- `params.query` — edit the query: remove words, replace words, or replace it wholesale
  (`edits` with `remove`/`replace`)
- `params.filters` / `params.optionalFilters` — inject filters or boosts
- `params.automaticFacetFilters` — **turn a detected query token into a facet filter.** This is
  the intent-detection workhorse: query `italian denver` → `cuisines:Italian` + `city:Denver`,
  with the matched words stripped from the text query
- `params.renderingContent` — reorder/hide facets for this query only
- `userData` — arbitrary JSON returned to the frontend, for banners and custom UI

```json
{
  "objectID": "intent-cheap",
  "conditions": [{ "pattern": "cheap", "anchoring": "contains", "alternatives": true }],
  "consequence": {
    "params": {
      "query": { "edits": [{ "type": "remove", "delete": "cheap" }] },
      "filters": "price_tier = 2"
    },
    "userData": { "banner": "Showing budget-friendly picks" }
  },
  "validity": [{ "from": 1688774400, "until": 1738972800 }]
}
```

Limits: max rules per index is plan-dependent; 100 rule tags; 300 promoted items per rule.
`enableRules` (default `true`) toggles the whole system per query.

---

## 15. renderingContent — backend-driven facet display

Lets the *index* (or a Rule) decide which facets to show and in what order, so merchandisers
change the UI without a deploy. InstantSearch's `DynamicWidgets` consumes it automatically.

```json
"renderingContent": {
  "facetOrdering": {
    "facets": { "order": ["cuisines", "price_range", "dining_style"] },
    "values": {
      "cuisines":    { "sortRemainingBy": "count" },
      "price_range": { "order": ["$30 and under", "$31 to $50", "$50 and over"],
                       "sortRemainingBy": "hidden" },
      "dining_style":{ "hide": ["Home Style"], "sortRemainingBy": "alpha" }
    }
  }
}
```

`sortRemainingBy`: `count` | `alpha` | `hidden`. `order` pins values to the front; `hide` removes
them. Useful beyond merchandising: it's how you force an inherently ordered facet (price bands,
sizes) to display in logical rather than alphabetical order.

---

## 16. Insights, analytics, and the AI features

### Events

Sent to the Insights API, either from the browser (`search-insights`, or InstantSearch's built-in
`insights` prop) or server-side.

- **Types:** `click`, `conversion` (with subtypes `addToCart`, `purchase`), `view`.
- **Required:** `eventName`, `eventType`, `index`, `userToken`, `objectIDs` (or `filters`).
- **Search-attributed events** additionally carry `queryID` and `positions`. `queryID` only
  exists if the search was sent with **`clickAnalytics: true`**, and must be used within
  **1 hour** of the search. Without `queryID`, the event still counts for Personalization and
  Recommend but **not** for click-through/conversion *rate* on that query.
- Backfill: `sendEvents` accepts events up to 4 days old; Recommend accepts a 90-day CSV upload.
- `authenticatedUserToken` for logged-in users; plain `userToken` for anonymous.

### What events unlock

Everything downstream depends on them, which is the strategic point: instrument on day one or
none of the AI features have anything to learn from.

| Feature | Needs |
|---|---|
| Click & Conversion Analytics | `clickAnalytics` + click/conversion events |
| Dynamic Re-Ranking | Behavioral events; detects trending records and promotes them, refreshed hourly |
| Personalization | Events + user profiles; `enablePersonalization`, `userToken`, `personalizationImpact` |
| Recommend (Related Items, FBT, Trending) | Historical events; served from a separate Recommend API |
| A/B testing | `enableABTest` + analytics |
| NeuralSearch | Hybrid vector + keyword retrieval, trained on your click/conversion data. Enterprise tier. |
| Query Suggestions | Search analytics volume — a **new demo account has none**, so a suggestions index must be seeded or hand-curated |

### Query Suggestions

A generated *separate index* of popular past queries, built from analytics. Config takes
`sourceIndices` (with `minHits`, `minLetters`, `facets`, `generate` for facet combinations) plus
optional `external` suggestions. Records carry `query`, `popularity`, `nb_words`, and per-source
hit counts. Rendered as an Autocomplete source.

**Practical note for demos:** with no traffic there are no suggestions. Either hand-build a small
suggestions index or drive the autocomplete from real facet values instead.

---

## 17. Limits worth remembering

| Limit | Build | Grow | Premium/Enterprise |
|---|---|---|---|
| Record size | 10 KB | 10–100 KB by plan | up to 100 KB |
| Index / app size | 1 GB | 100 GB | 100 GB |
| Indices per app | 10 (20 per some sources) | 50 | 1,000 |
| Synonyms per index | 1,000 | 10,000 | 10,000 |

Plan-independent: **20 virtual replicas** per index · **1,000** facet values per query ·
**1,000** filters per query · **20,000** max pagination offset (`paginationLimitedTo`) ·
25 conditions and 300 promotions per rule · 5,000 API keys per app · 10 custom normalizations
per app.

**Pricing shape (2026):** Build is free — 1M records / 10k search requests per month. Grow bills
requests at ~$0.50/1k and records at ~$0.40/1k. Grow Plus adds AI Synonyms, AI Ranking, advanced
Personalization, Query Categorization, Collections, 90-day analytics. Enterprise (Elevate) adds
NeuralSearch, SLAs, more indices. Verify current numbers at algolia.com/pricing before quoting
them to anyone.

---

## 18. Relevance debugging playbook

When a query looks wrong, work the formula in order — the bug is almost always at the highest
criterion that isn't tying.

1. **Turn on `getRankingInfo: true`.** It returns per-hit `nbTypos`, `firstMatchedWord`,
   `proximityDistance`, `nbExactWords`, `geoDistance`, `userScore`, and which words matched.
   This converts arguments into evidence.
2. **Wrong record at #1?** Find the first criterion where the two records differ. That's your
   culprit — nothing below it matters.
3. **Custom ranking seems ignored?** Almost always because records never tie on an earlier
   criterion. Check whether geo (criterion 2) is silently sorting everything — the fix is
   `aroundPrecision`, not more custom ranking.
4. **Second/third custom ranking attribute never fires?** High cardinality in attribute one.
   Round or bucket it.
5. **Irrelevant matches?** An attribute is searchable that shouldn't be, or typo tolerance is
   firing on a short/numeric token. Trim `searchableAttributes`; consider `typoTolerance: "min"`.
6. **Right record missing entirely?** That's retrieval, not ranking: a filter excluded it, the
   word isn't in any searchable attribute, or `aroundRadius` cut it. Re-run with no filters.
7. **Zero results on a long query?** `removeWordsIfNoResults` is `none`. Choose a strategy.
8. **Test the edges deliberately** — broad, specific, misspelled, ambiguous, location-sensitive,
   and empty. Those six are exactly what a serious reviewer will type.
