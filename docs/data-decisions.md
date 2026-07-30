# Data Decisions

How two source files became 5,000 Algolia records — what we joined, what we changed, what we
threw away, and what we assumed. Written during the build, not reconstructed afterwards.

Everything below is reproducible with one command:

```bash
npm run data:build     # prints every figure quoted in this document
```

---

## 1. How the files were joined

| | `restaurants_list.json` | `restaurants_info.csv` |
|---|---|---|
| Rows | 5,000 | 5,000 |
| Key | `objectID` — **integer** | `objectID` — **string** |
| Delimiter | — | **semicolon**, not comma |
| Contributes | name, address, geo, price, payment, reserve URLs | cuisine, rating, reviews, neighborhood, phone, price band, dining style |

**The join is on `objectID`, with both sides coerced to string.** That coercion is the only thing
standing between a clean join and a silent zero-match — the key is an `int` in one file and a
`"string"` in the other. Coercing once, at the join, also produces the exact value Algolia
requires for `objectID`, so there is no second conversion later that could disagree.

**Result: 5,000 / 5,000 matched. No orphans in either direction, no duplicate IDs.**

The pipeline asserts all four of those conditions and **stops the build** if any fails. A partial
join would quietly ship an index where some restaurants have no cuisine and no rating, which is
far worse than a failed build.

### Parsing the CSV

The file uses no quoting whatsoever — zero `"` characters, and all 5,001 lines split into exactly
8 fields — so a delimiter split is exact and no CSV dependency is needed. To keep that honest, the
loader asserts the header, the field count on every row, and the absence of quote characters. If
the file ever changes shape, the build fails loudly instead of misparsing silently.

---

## 2. What we cleaned

Six independent cleanups, each a named function in `scripts/lib/`.

| Fix | Scope | What we did |
|---|---|---|
| **Whitespace-padded values** | 6 fields | Trim every CSV field on load. `" Noblesville"` and `"Noblesville"` would otherwise appear as two separate facet values. |
| **ZIP+4 postal codes** | 62 records | Truncate to the 5-digit code, so one postal area is one value. |
| **Malformed phone numbers** | see below | Take the CSV number and keep only the leading `(NNN) NNN-NNNN`. |
| **Price disagreements** | 220 records | Treat the CSV band as canonical, derive the numeric tier from it, flag the conflict. |
| **Composite cuisine values** | 8 values, 210 records | Split on `/` and `,` into atomic cuisines. |
| **Dead image URLs** | **all 5,000** | Encode cuisine as a drawn signage tile instead of substituting stock photography. |

### Phones, in detail

Neither source is clean, which is worth stating plainly:

- **2,532 JSON phone values (50.6%)** carry a trailing `x` fragment — 2,464 a bare `x`, 68 with
  real extension digits.
- **67 CSV values** end in a stray ` e`, a truncated "ext".
- **95 records** disagree between the two files on the actual 10-digit number. Not formatting —
  different numbers. `objectID 94183` is JSON `5166636395` against CSV `(516) 746-0011`.

We use the CSV value because it is the better of the two, and we clean it anyway. We also emit
`phone_e164` (`+1XXXXXXXXXX`) so `tel:` links work on mobile without the UI reformatting anything.

### Price, in detail

The two files disagree on **220 records (4.4%)**. We picked the CSV's `price_range` as canonical
for one reason: it is the human-readable string we display, so deriving the numeric `price_tier`
*from it* makes it impossible for the band a diner sees and the filter they applied to disagree.

The JSON `price` field is dropped, but every disagreement is recorded as `price_conflict: true`.
That costs nothing and turns an invisible data problem into a countable one.

---

## 3. What we derived

Eight fields that do not exist in the source data. Each is one small function, and each earns its
place by answering a specific need from the discovery notes.

### `chain_name`, `location_label`, `is_chain`, `chain_location_count`

**The finding:** exact-name matching says this dataset has almost no chains — 21 duplicate names,
all in different cities. That is wrong. The structure is hidden in the naming convention:
`Ruth's Chris Steak House - Waikiki`.

Splitting on a **whitespace-padded** dash and promoting a name to a brand only when it occurs
twice or more yields **158 brands across 604 restaurants, and 113 of those brands have two or more
locations in a single metro** — Atria's ×8 in Pittsburgh, Perry's ×6 in Houston, Stanford's ×5 in
Portland.

That is exactly the third pain point in the discovery notes, and it is invisible without this step.

Two details that matter:

- **The whitespace padding is the rule.** 46 names contain a bare hyphen that belongs to the name.
  `Café Des Beaux-Arts` must not become the brand "Café Des Beaux", and `Dinosaur Bar-B-Que` must
  survive intact. The build asserts both.
- **The rule is deliberately conservative.** A restaurant joins a brand only if its own name
  carries a location suffix. A looser rule that also groups restaurants merely *sharing* a name
  finds 207 brands — but 20 of those are collisions, not chains. `Town` in Carbondale and `Town` in
  Honolulu are different businesses. Since grouped results show one row per brand, a false brand
  **hides a real restaurant**. We would rather under-count.

### `cuisines[]` and `cuisine_group`

`food_type` ships **114 distinct values** including composites like `Creole / Cajun / Southern` and
near-duplicates like `American` (865) against `Contemporary American` (649).

Splitting the composites gives **116 atomic cuisines** — note that splitting makes the taxonomy
*bigger*, not smaller. It is done for matching, so a search for `small plates` reaches
`Tapas / Small Plates`.

A hand-written rollup then reduces those 116 to **23 groups** for browsing. Both are indexed
because they do different jobs: `cuisines` for precise matching and filtering, `cuisine_group` for
a facet a diner can actually scan.

### `bayesian_rating`, `popularity_score`, `rating_bucket`

**The finding:** ratings in this dataset cannot be used raw.

- **4,435 of 5,000 (89%)** sit in the four-star bucket. Full spread: 1★ 3 · 2★ 11 · 3★ 530 ·
  4★ 4,435 · 5★ 21.
- Only 21 restaurants hold a perfect 5.0, and **15 of those have fewer than 20 reviews**.

Sorting by raw rating opens the page with 5.0s from **two, three and five reviews**, while
*Mama's Fish House* — 4.8 from 12,669 reviews — is nowhere to be seen.

`bayesian_rating` shrinks each rating toward the dataset mean in proportion to how little evidence
supports it:

```
bayesian = (v / (v + m)) * R  +  (m / (v + m)) * C

R = the restaurant's rating      C = 4.294  (global mean, measured)
v = its review count             m = 140    (p25 review count, measured)
```

`C` and `m` are computed from the data at build time, not hardcoded, so the pipeline stays correct
if the dataset is refreshed. **`m` is the tuning knob**: it is how many reviews a restaurant needs
before its own rating outweighs the crowd's. Raise it and the ranking gets more conservative.

**Rounded to one decimal on purpose.** Two decimals would give near-unique values, records would
never tie, and every ranking signal below this one would be dead code. The measured result is 17
distinct rating values against 38 popularity values — coarse first, finer second, which is the
shape that lets both signals actually participate.

`popularity_score` is `round(log10(reviews + 1) * 10)`. Review counts span 1 to 12,669 with a heavy
tail, so raw values would let a handful of famous restaurants win every tie-break.

`rating_bucket` is `floor(stars)`, for the rating filter. Given 89% of records land in one bucket,
this should be presented as **"4 stars and up"**, never as discrete checkboxes.

### `location.lvl0/1/2`

`area > city > neighborhood`, giving **51 areas → 948 cities → 1,267 neighborhood paths**.

Required because `neighborhood` alone is ambiguous: 185 records sit in a neighborhood called
"Downtown", spread across 10 different cities. A flat facet would offer the diner one "Downtown"
that means ten different places.

### `vibe_tags[]`

The dataset ships no inspirational axis at all, and the browse-and-discover persona needs one.
Each tag is a **combination** of signals, never a restatement of a single field — anything one
field already answers is better served by that field's own facet.

| Tag | Rule | Share |
|---|---|---|
| `good-for-groups` | shareable cuisine, price tier ≤ 3 | 31.6% |
| `date-night` | Fine Dining or Casual Elegant, rating ≥ 4.4 | 30.2% |
| `budget-friendly` | cheapest band **and** rating ≥ 4.4 | 22.1% |
| `hidden-gem` | rating ≥ 4.4 but fewer reviews than the median | 14.7% |
| `crowd-favorite` | review count in the top 10% | 10.0% |
| `special-occasion` | top price band, or excellent fine dining | 9.6% |

`budget-friendly` is cheap *and* good, because "cheap" alone covers 62% of the index and tells a
diner nothing. Review thresholds come from the data's own percentiles rather than constants.

**34% of records carry no tag, deliberately.** A mid-rated casual restaurant has no distinctive
vibe, and inventing one for it would make all six tags meaningless.

The build enforces that no tag covers more than 40% or less than 1% of the index — a tag on
two-fifths of the data distinguishes nothing, and a tag under 1% is a dead facet value.

### Imagery — the field we removed

**Every one of the 5,000 `image_url` values redirects to the same 2.2 KB generic placeholder.**
There is no usable photography in this dataset at all.

The record carries **no image field**, and arriving there took two passes worth recording.

The first plan was to substitute a small set of cuisine-keyed stock photographs, bundled locally
rather than hotlinked so a live demo could not be rate-limited mid-presentation. The pipeline emitted
a deterministic path per record — a cuisine slug plus a stable hash of `objectID`, so a restaurant
kept the same asset across rebuilds, where random assignment would reshuffle the grid on every
reindex and read as a bug.

That was dropped in favour of **drawn cuisine tiles** in the application: one geometric pictogram per
cuisine group, on that group's line colour, with colour carrying the cuisine *family* and the mark
separating the 23 groups within it.

Two reasons, and they are the reasons worth defending. A stock photograph of somebody else's steak,
sitting where a restaurant's own photo belongs, is the one element on screen pretending to be data —
and it is precisely the kind of thing a diner would notice before a reviewer did. It is also what the
interface actually needs: a coloured mark encodes cuisine as something scannable down a column, where
a photograph carries no information about the restaurant it sits beside.

Once nothing consumed the paths, the field went too. A record pointing at 62 image files that do not
exist is worse than a record that admits the gap, and **the gap is the finding**: it belongs in the
conversation with OpenTable, not papered over in the demo.

---

## 4. Which attributes we indexed, and what each one does

35 fields per record. Largest record is 1,281 bytes, mean 1,099 — comfortably inside the 10 KB
limit, with room to enrich further.

| Purpose | Attributes |
|---|---|
| **Searchable** | `name`, then `cuisines` + `food_type`, then `neighborhood` + `city` + `area` + `state`, then `address` — in that order, because the order *is* the ranking signal. Justified below |
| **Facetable** | `cuisines`, `cuisine_group`, `dining_style`, `price_range`, `price_tier`, `rating_bucket`, `chain_name`, `city`, `neighborhood`, `area`, `state`, `location.lvl0/1/2`, `vibe_tags` |
| **Filter-only** | `payment_options`, `price_conflict`, `objectID` — filterable but never shown as a facet list |
| **Ranking** | `bayesian_rating` then `popularity_score` as custom ranking; `_geoloc` for distance |
| **Grouping** | `chain_name` as `attributeForDistinct`, so chain collapsing is a per-query toggle |
| **Display only** | `stars_count`, `reviews_count`, `phone`, `phone_e164`, `reserve_url`, `mobile_reserve_url`, `postal_code`, `country`, `cash_only`, `is_chain`, `location_label`, `chain_location_count` |

Deliberately **not** searchable: URLs, postal codes and the numeric ranking fields. They add index
size and produce bizarre matches.

### Why the searchable attributes are in that order

In Algolia, the order of `searchableAttributes` is not documentation — it *is* the **attribute**
ranking criterion. A match in an earlier line beats a match in a later one, and attributes on the
same line are treated as equally important. So the four tiers are a claim about what a word in the
search box most likely means:

```
1.  unordered(name)
2.  cuisines, food_type
3.  neighborhood, city, area, state
4.  address
```

**`name` first**, because a diner typing a restaurant name is trying to reach one specific
restaurant, and nothing should outrank that. It is `unordered` so word position inside the name is
ignored — someone typing "chris ruths" is looking for Ruth's Chris.

**Cuisine above location** is the tier that does real work. If they were reversed, a restaurant
*named* "Denver Chophouse" would outrank actual Italian restaurants in Denver for the query
`italian denver`. Cuisine is the stronger signal of intent; location narrows it.

**`cuisines` and `food_type` share a tier** because they are the same fact at two levels of
precision — the split values and the raw source value. Neither should beat the other.

**The four location fields share a tier** because their relative importance depends on the query,
not on the schema. "SoHo" is a neighborhood and "Denver" is a city, and a diner typing either has
been equally specific.

**`address` last**, because street names generate coincidences — Church Street, Market Street,
Union Avenue — and a coincidental street match should never displace a real name or cuisine match.

**`chain_name` is not searchable at all**, despite being a derived field built for exactly this
kind of matching. It was measured both ways against all 27 test queries and changed nothing: a
brand name is always a substring of the restaurant name it came from, and `name` ranks earlier, so
the name match wins the attribute criterion before `chain_name` is ever consulted. It stays
*facetable*, which is what the brand facet and chain grouping actually need. Evidence in
[`relevance-testing.md`](relevance-testing.md).

The exact settings live in `scripts/configure-index.ts` — as code, committed and reviewable, never
clicked into a dashboard.

---

## 5. Assumptions we made

Stated plainly, because every one of them is a judgement call someone could reasonably make
differently.

1. **The cuisine rollup is editorial, not ground truth.** Twenty-three groups from 116 cuisines is
   our judgement about what a diner wants to browse. `Middle Eastern & African` and
   `Vegetarian & Organic` are the most obviously opinionated. In production this should come from
   OpenTable's own taxonomy.
2. **Vibe tags are heuristics, not facts.** No restaurant in this data told us it was good for a
   date. We inferred it from dining style, price, rating and review volume. In production these
   would come from menu data, review text, or an enrichment pass over real reviews.
3. **The CSV is authoritative for price and phone.** Where the two files disagree we believed one
   of them. That is a guess. The right answer is a discovery question — *which of your two systems
   is the system of record?* — not an engineering one.
4. **The price scale starts at 2.** The JSON `price` field never contains 1, so `price_tier` runs
   2–4 rather than being renumbered 1–3. This keeps our values comparable to the source system.
5. **Chains are inferred from names.** There is no brand ID in this data. If OpenTable has one, we
   would use it and the inference disappears entirely.
6. **There is no imagery, and the interface says so by not inventing any.** Every source URL is
   dead, so the board shows a drawn cuisine tile rather than a photograph. Nothing on screen claims
   to be a picture of the restaurant. Real photography is OpenTable's to supply.
7. **The dataset is US-only.** All 5,000 records are US, so `country` is constant and no
   internationalisation decisions were made. Multi-market would change language settings and
   possibly the index topology.

---

## 6. Data quality summary — for the customer

Findings worth raising with OpenTable regardless of the search project, discovered during
ingestion:

| Finding | Scale | Why it matters |
|---|---|---|
| **Every image URL is dead** | 5,000 / 5,000 | All redirect to the same 2.2 KB placeholder. A restaurant listing with no photograph is a listing a diner scrolls past. |
| **The two files disagree on price** | 220 (4.4%) | A diner filtering by budget gets a different answer depending on which system answered. |
| **Malformed phone numbers** | 2,532 (50.6%) in JSON, 67 in CSV | Trailing `x` and ` e` fragments. Breaks click-to-call. |
| **The two files disagree on phone** | 95 | Different numbers, not formatting. Someone is calling the wrong restaurant. |
| **Cuisine taxonomy has no controlled vocabulary** | 114 values | `American` and `Contemporary American` are separate; `Steak` and `Steakhouse` are separate. Splits your own inventory across near-duplicate labels. |
| **Neighborhood names are ambiguous** | 1,062 values | 185 records in a neighborhood called "Downtown" across 10 cities. |
| **Ratings carry no confidence signal** | 15 of 21 perfect scores have <20 reviews | Any naive "top rated" view recommends the least-evidenced restaurants first. |
| **Whitespace in reference data** | 6 values | Silently creates duplicate facet values. |

None of these block the search project. All of them are cheap to fix at the source, and several
are worth more to the business than the search improvement itself.
