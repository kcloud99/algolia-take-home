# Approach

The argument over the top of the evidence. [`data-decisions.md`](data-decisions.md) records what
happened to the data and [`relevance-testing.md`](relevance-testing.md) records what happened to the
results; this document says why, in the order the decisions were made. It links down rather than
repeating either.

---

## 1. What I built against

OpenTable's discovery notes describe two diners and five business outcomes. Every feature traces to
one of the two rows below, and anything that traced to neither was cut.

| Diner | Their stated pain | What answers it |
|---|---|---|
| **Knows the restaurant** | Hard-to-spell names; typos, concatenations, partial names, alternate spellings. **Chains with several locations in one city are hard to tell apart.** | Typo tolerance and prefix search on a deliberately narrow searchable set; federated autocomplete; derived `chain_name` with `distinct` grouping, and a way into a brand's branches |
| **Doesn't know yet** | No real discovery. Limited browse and refine. Feels dated. | The empty query is a *ranked* board rather than a blank page; cuisine and mood chips; six facets ordered by the index; three sorts; hierarchical location; distance-aware ranking |

The one thing I would push back on if this were a real engagement: the notes ask for "higher search
quality" without saying how it is currently measured. That is the first question in the room, because
until search is instrumented, every relevance argument is aesthetic. It is also why Insights events
are in this prototype rather than on the roadmap — see §7.

---

## 2. Architecture, and the three choices inside it

**One index, plus three virtual replicas.** No second index, no backend, no auth, no state library,
no monorepo tooling. 5,000 records is 0.5% of the free plan's ceiling; the interesting problems here
are all relevance and interface problems, and unnecessary architecture is harder to hand over than no
architecture. The two places where a second index would normally appear are both handled inside one:
sorting uses *virtual* replicas, which honour a sort while keeping relevant results near the top and
cost nothing against the record quota, and chain grouping uses `distinct`, which is a *query*
parameter over an index-level `attributeForDistinct` — so the same index serves the diner who wants
one row per brand and the diner who wants every restaurant nearby.

**Built fresh on React InstantSearch v7 rather than on the starter scaffold.** The supplied scaffold
is `algoliasearch-helper` on parcel 1.9.7 pinned to Node `^9.6.1` — both long end-of-life — and the
prospect's explicit ask is for something *more modern* than what they have. Demoing a 2018 build
chain would contradict the pitch. InstantSearch is also what Algolia would actually recommend to a
team this size, because it solves the parts most in-house search UIs get wrong: disjunctive facet
counts (which need extra queries to compute correctly), URL state, debouncing, keyboard and ARIA
behaviour. The helper-level API underneath it is worth being able to discuss either way.

**Every setting lives in code.** [`scripts/configure-index.ts`](../scripts/configure-index.ts) holds
the settings, the replicas, the synonyms and the Rules, each with an inline comment saying why, and
`npm run index:config` is idempotent. Nothing was clicked into the dashboard. This is the cheapest
possible win on process: the configuration is reviewable in a diff, reproducible from a clone, and
recoverable if someone changes it by hand.

The repository splits four ways — `scripts/` (19 files, ~2,080 lines), `app/` (39 files, ~3,400
lines), `docs/`, `data/` — and both halves of `data/` are committed: the untouched source files, so
the join is reproducible from a clone, and the generated `records.json`, so a reviewer can see
exactly what is in the index without an API key.

---

## 3. The pipeline

Two files, joined on `objectID` — an integer in the JSON and a string in the CSV, which is the only
thing standing between a clean join and a silent zero-match. 5,000/5,000 matched, no orphans, no
duplicates, and the build **stops** if any of those four conditions fails: a partial join would ship
an index where some restaurants silently have no cuisine and no rating.

The shape of the code is the point. Every derived field is one small named function —
`deriveChainName`, `bayesianRating`, `splitCuisines`, `deriveVibeTags` — so each can be reviewed,
tested and *explained* on its own, and `buildRecord` is pure assembly with no logic in it. The build
prints every figure quoted in the documentation, so the docs cannot drift from the data without the
next run saying so. Where a rule has a trap, the build asserts against it: `Café Des Beaux-Arts` must
not be split into a brand called "Café Des Beaux", so that case is a build-time assertion rather than
a comment.

Eight derived fields, six cleanups, seven stated assumptions, all with rationale:
[`data-decisions.md`](data-decisions.md).

Two judgements from it are worth surfacing here because they shaped the demo:

- **The chain rule under-counts on purpose.** A looser rule finds 207 brands rather than 158, but 20
  of those are name collisions — `Town` in Carbondale and `Town` in Honolulu are different
  businesses. Since grouped results show one row per brand, a false brand *hides a real restaurant*,
  so the rule requires positive evidence (a location suffix on the name itself) before it groups
  anything. The cost is visible on screen: `mccormick` grouped returns five rows, not one.
- **The rating is rounded to one decimal deliberately**, not for tidiness. See §4.

---

## 4. How relevance is actually constructed

The thing worth explaining to a team coming from Elasticsearch is that **Algolia does not compute a
score.** It walks an ordered list of criteria, and each one only reorders what the previous one left
tied:

```
typo → geo → words → filters → proximity → attribute → exact → custom
```

That has three consequences, and the whole configuration follows from them.

**A later criterion can never rescue an earlier one.** So the work is in engineering the ties, not in
balancing weights. There is no "we boosted title and broke category search."

**The order of `searchableAttributes` *is* the attribute criterion.** It is not documentation. Four
tiers, and they encode a claim about what a word in the search box most likely means:

```
1. unordered(name)                       a diner typing a name wants that restaurant
2. cuisines, food_type                   cuisine is the stronger signal of intent…
3. neighborhood, city, area, state       …and location narrows it
4. address                               street names are coincidences
```

Tier 2 above tier 3 is the one that does real work: reversed, a restaurant *named* "Denver Chophouse"
would outrank actual Italian restaurants in Denver for `italian denver`. And tier 4 exists to be
last — `mccormick` returns two Scottsdale restaurants on **McCormick Parkway**, correctly ranked
third and fourth rather than displacing a real name match. The reason `address` sits at the bottom is
demonstrable in one query.

**`customRanking` only breaks ties, so its values have to be coarse enough to tie.** This is the trap
most worth naming. `desc(bayesian_rating)` then `desc(popularity_score)` does nothing at all if the
first attribute has near-unique values, because then no two records ever reach the second. Rounding
the Bayesian rating to one decimal produces 17 distinct values across 5,000 records against 38
popularity values — coarse first, finer second, which is the shape that lets both signals
participate. The clearest evidence is the empty query: at baseline it opened on three mid-rated San
Diego restaurants in insertion order, because with `customRanking: null` there was nothing left to
break a universal tie.

**Geo is criterion *two*, which makes it the most dangerous setting in the file.** At default
granularity it is effectively a strict distance sort, and everything below it — words, proximity,
attribute, exact and all of `customRanking` — is inert. Bucketing distance with `aroundPrecision`
makes nearby restaurants *tie* on geo so quality decides inside the bucket: "nearby **and** good"
rather than "nearest at any cost." This project's own design specified 250 / 1,000 / 5,000 m and
**measurement said that was wrong by an order of magnitude** — 250 m is one Midtown block, the
records inside it never tie, and it returned the same ten restaurants as no bucketing at all, merely
reordered among themselves. Shipped at 1,500 / 5,000 / 25,000 m, and the graduation is kept because
it earns its keep at the far end, where 25 km rings make distant restaurants tie with each other so
quality orders them. Seven configurations, two markets, in
[`relevance-testing.md` § Geo](relevance-testing.md#geo--tested-separately-and-the-measurement-changed-the-design).

`aroundRadius: "all"` is what makes a thin market work. Coverage is lopsided — whole states hold
three records — so a fixed radius returns an empty page in Arkansas. Removing the cutoff while
keeping distance in the *ranking* means the same board radiates outward with no special case and
nothing to detect.

**Rules and synonyms are the layer a merchandising team can own**, because they apply at query time
with no reindex and are instantly reversible. Seven synonyms close vocabulary gaps between diner and
data — the dataset spells it "Barbecue" and never "BBQ", so `bbq` was returning four coincidental
name matches while every barbecue restaurant stayed invisible. Three Rules map mood words that appear
nowhere in the data (`romantic`, `cheap eats`, `birthday dinner`) onto the `vibe_tags` and
`price_tier` fields the pipeline derived. Structural settings are the ones that reindex; that
distinction is worth making explicitly to a team whose current stack reindexes to change an analyzer.

**Facet order lives in the index too**, via `renderingContent`, and the app reads it with
`DynamicWidgets`. Reordering the sidebar should not need a deploy — and the price bands are pinned in
the index because alphabetical ordering of `$30 and under · $31 to $50 · $50 and over` is correct
only by luck, and a `$100 and over` band would jump to the front.

---

## 5. How it was tested

Three rules, because it is easy to produce a relevance "improvement" that measures nothing.

1. **The 27 test queries were written before a single result was observed** and committed as their
   own step, ahead of the first run. Choosing them afterwards lets the configuration be tuned to
   flatter the test set. Queries could be added later; none were removed or reworded.
2. **The baseline was captured against Algolia's stock defaults before anything was configured.**
   Default results are unrecoverable once settings are written, and an improvement with no "before"
   is an assertion. Both runs are committed, each embedding the live `getSettings` output that
   produced it.
3. **Every result carries its ranking evidence** — `nbTypos`, `nbExactWords`, `proximityDistance`,
   `words` — because "this result is wrong" only becomes actionable once you can see which criterion
   put it there.

Hard zero-results went from 6 of 27 to 1. The more useful outcome is the queries that were passing
*by accident*: `mccormick and schmicks` returned 10 hits where the complete answer is 13, matching
through attributes that had no business being searchable, at a proximity distance of 16. Narrowing
the index dropped it to 0 — which looked like a regression and was the truth surfacing. The general
version of that defect is why it matters: 438 restaurant names use "&" and 190 spell out "and", and
`bar and grill` was returning 22 of 67 while looking perfectly healthy. A silently truncated page is
more dangerous than an empty one, because nobody reports it.

**Three settings from the original design did not survive measurement** and were removed or reversed
rather than defended: `chain_name` in `searchableAttributes` (0 of 27 queries differed — a brand name
is always a substring of the restaurant name, and `name` ranks earlier), `separatorsToIndex: "&'-"`
(1 query differed, by 1 hit), and `removeStopWords: false` (reversed to `true`, which fixed an entire
class of conversational location queries at the cost of rank on one known-item query). Each with its
evidence in [`kb/index-design.md` § 8](kb/index-design.md).

---

## 6. The interface

**The thesis.** Searching 5,000 restaurants is a wayfinding problem — orientation and
disambiguation — so the interface is a departure board: results are a *board*, facets a *signage
panel*, a chain a *platform*. A bounded dark surface is spent only on live information, one blue owns
every interaction, and every number is set in tabular mono so columns align down the page like a real
timetable. The full system is [`DESIGN.md`](../DESIGN.md); what matters here is that it is a system,
so each decision is a lookup rather than an opinion.

That register also does information work rather than decoration. Every row shows the *adjusted*
rating on a ten-segment gauge running 3.0–5.0 with the floor printed in the column header, because
`bayesian_rating` spans 3.3 to 4.9 with 77% of restaurants between 4.2 and 4.5 — on a 0-to-5 bar
every row in the index renders 84–92% full, and the chart would be decoration in the shape of a
chart. An undisclosed non-zero baseline is how a bar lies; a disclosed one is an instrument scale.
The review meter is literally `popularity_score`, the same value `customRanking` ranks on, so the bar
a diner sees is the signal the engine used.

**Cuisine is drawn, not photographed.** All 5,000 image URLs are dead, and the first plan was to
substitute cuisine-keyed stock photography. That was reversed: a photograph of somebody else's steak,
sitting where a restaurant's own photo belongs, is the one element on screen pretending to be data.
23 pictograms on eight line colours encode cuisine as something *scannable down a column*, which a
photograph cannot do. The data gap becomes a signal instead of a lie, and it stays a finding to raise
with the customer.

**Discovery is a state, not a page.** An empty query already returns the 24 best-ranked restaurants
in the country — that is what the Bayesian rating was built for — so the board is already a good
answer to "I don't know what I want." What it lacked was a way in, and two chip rows above the same
board cost no second route, nothing to navigate back from, and no surface to keep in sync.

**Stock widgets first; custom rendering has to earn it.** An earlier version of the facet rail
rendered `RefinementList` and `HierarchicalMenu` from their hooks — 156 lines of hand-written facet
UI — to put thousands separators in the counts. That was deleted. "I reimplemented the refinement
list so the counts had commas" is a poor answer to a customer asking why they should adopt a library
that already solves disjunctive facet counts, URL state and ARIA behaviour. Custom rendering is
reserved for three cases: the widget does not exist in 7.41 (`NumericMenu`, `RelevantSort`), there is
no widget for reading a value (`useStats`, `useSearchBox`), or the library's documented contract is
that you render everything (Autocomplete).

**The interface discloses where the engine is uncertain**, in three places, and each of those was a
measurement rather than a guess. It says when every hit on the page needed a typo to match
(*"nothing here is spelled 'michelin'"*) — keyed on `nbTypos`, after the obvious rule on
`nbExactWords` was measured and thrown away for firing on four successful queries. It renders a `~`
on the result count when `distinct` makes `nbHits` an estimate and the engine says so. And a "Why?"
toggle prints all eight ranking criteria under every row, which is the one question an Elasticsearch
team asks that nothing else answers — not *what* ranked, but *how*. Two adjacent rows and the first
column where they differ is the criterion that decided them.

**Mobile was built, not promised.** The starting state was not unpolished, it was broken: at 390px
the row's fixed cells sum to 543px against a 358px row, so every phone row rendered a rating, a tile,
a distance, a price and a review count for a restaurant it never named. The row now restacks, the
facet rail becomes a bottom sheet with the applied-refinement count on its trigger, and Autocomplete's
detached overlay — which *is* the mobile search experience and was entirely unstyled — is styled.
Both breakpoints were measured rather than picked from a device list: the row un-stacks at 880px and
the rail appears at 1280px, because at 1024px a 280px rail left the name column 137px wide and
reproduced the phone defect on a laptop.

**Nine defects in this phase were found only by rendering the page or watching the network**, which
is the practice worth carrying rather than the list. Two are worth naming because they are
InstantSearch-specific and silent: unstable props to a connector hook (an inline `transformItems`)
**hang the page** rather than warn, and removing `SearchBox` in favour of Autocomplete removed the
widget that owned `uiState.query`, so the board returned all 5,000 records and looked completely
healthy. Every visual claim in this build was checked against a screenshot; an end-of-phase pass over
eleven demo cases caught a defect that five individually-verified steps had not.

---

## 7. From search to booking

The outcome OpenTable named is conversion from search into bookings, so the prototype sends Insights
`view`, `click` and `conversion` events, with `clickAnalytics` on to mint the `queryID` that
attributes a booking back to the query that produced it. Without that, events still train
Personalization — but per-query click-through and conversion rate are not computable, which is the
number being asked for.

This is a prerequisite rather than a reward. Dynamic Re-Ranking, Personalization, Recommend and
NeuralSearch all train on exactly these events, so instrumenting on day one is what makes any of them
possible in month three. Two honest notes: the `search-insights` client is *bundled* rather than
injected from a CDN, because a demo presented live must not depend on a third party that can be slow
or blocked and would take the analytics story down silently; and because this prototype has no
restaurant detail page, pressing Reserve is both the click and the conversion, so those two rates are
identical here in a way they would not be in a real booking flow.

---

## 8. What I would raise with OpenTable in the first week

Not search work, but found while doing it, and some of it is worth more to the business than the
relevance improvement: **every image URL in the catalogue is dead** (5,000 of 5,000, all redirecting
to the same 2.2 KB placeholder); the **two source systems disagree** on price for 220 restaurants and
on 95 phone numbers — different numbers, not formatting; **half the catalogue has `neighborhood`
identical to `city`**, so the field carries no information on 2,500 records; and the cuisine taxonomy
has no controlled vocabulary, splitting inventory across `American`/`Contemporary American` and
`Steak`/`Steakhouse`. Full table with scale and consequence in
[`data-decisions.md` § 6](data-decisions.md#6-data-quality-summary--for-the-customer).

One more, from configuring the index rather than the data: a Rule's `filters` string is invisible to
`CurrentRefinements` by design, so a merchandising team can ship a filter a diner can neither see nor
undo. Worth knowing before it happens rather than after.

---

## 9. Limits, stated

Volunteered because being caught by a limitation is worse than naming it. The full list is
[`relevance-testing.md` § What is still wrong](relevance-testing.md#what-is-still-wrong); the ones
that would come up first:

| Limit | Why it is left |
|---|---|
| `fogodechao` returns nothing | Algolia splits a concatenated token into at most two words, so three-word brands need a punctuation-stripped `name_compact` field. A pipeline change for a long-tail case; the way to size it is a query log, not a guess |
| `michelin` returns three restaurants | Typo tolerance finds *Michelangelo* for a word in no record. Tightening typos enough to stop it breaks `benihanna`, which matters more. Disclosed in the UI instead |
| Vibe tags are inferred | Dining style, price, rating and review volume — not menus or reviews. Stated as an assumption rather than presented as data |
| The cuisine rollup is editorial | 23 groups from 116 cuisines is my judgement. In production it comes from OpenTable's taxonomy |
| Two Build-plan ceilings | Three Rules per index, so date-night and special-occasion merged; no `optionalFilters` in Rules, so the occasion rule hard-filters where it should boost. Both noted in the source with the paid-plan version alongside |
| The live map was cut | Geo *ranking* is the valuable half and costs a `<Configure>` block; a map is a whole surface. Recorded as a scope decision, with reasoning, in [`build-plan.md`](build-plan.md#phase-3--search-experience) |
| One row-design case | In a brand-refined view two Pittsburgh branches both truncate to `McCormick & Schmick's Seafood - Pitt…`. 50-character chain names do not fit the name column; the fix is to render the pipeline's existing `location_label` once the board is refined to one brand. They stay separable by distance, rating and hover title |

---

## 10. What I would do next

Query Suggestions once there are real searches behind it; A/B testing and Dynamic Re-Ranking, since
the events are already flowing — starting with the Bayesian `m` (the review count at which a
restaurant's own rating outweighs the crowd's), which is currently set from the data's p25 and should
be set from conversion; **availability as a filter**, which is the single largest relevance win
available to OpenTable and not to this dataset, because a restaurant with no table at 7pm tonight is
not a relevant result however good it is; OpenTable's own cuisine taxonomy in place of the rollup;
and Personalization keyed on `authenticatedUserToken` so it is per-diner rather than per-browser.

---

## 11. How the work was organised

One step, one commit, one reviewable unit, every one leaving `typecheck` and `build` clean and
carrying its reasoning recorded when the decision was made rather than reconstructed afterwards.
[`build-plan.md`](build-plan.md) was written before any code and kept accurate as the build
progressed, including where it was wrong: the three scope decisions taken when the plan and the
design disagreed are recorded as decisions, and the one feature that was cut is marked cut.

Two sequencing rules did the most work. **Nothing was configured before the baseline was captured**,
because default results are unrecoverable and a before/after with no before proves nothing. And
**documentation was written inside its phase**, not at the end: rationale reconstructed afterwards is
rationalisation, and it reads like it. Where a documented figure disagreed with a measurement, the
measurement won and the correction got its own commit — that happened five times, and every figure
corrected was one this project had asserted itself rather than one it had read.

Roughly 20 hours end to end, with the breakdown in the [README](../README.md#hours). AI tooling was
used throughout, which the exercise encourages; [`CLAUDE.md`](../CLAUDE.md) is committed as the record
of how it was directed, and [`docs/kb/`](kb/) is the reference it was held to.
