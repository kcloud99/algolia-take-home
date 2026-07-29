# Build Plan

Written before any code, and kept accurate as the build progressed. The commit history follows
this plan step for step.

---

## Goal

A restaurant search-and-discovery prototype on Algolia, built from two messy source files, that
serves the two user needs OpenTable's discovery notes describe:

| Persona | Need | The pain to solve |
|---|---|---|
| **Known-item** | Find a specific restaurant fast, then book | Hard-to-spell names, typos, concatenations, partial names — and **chains with several locations in one city** |
| **Explorer** | Browse, compare, get inspired | No real discovery; limited browse and refine; feels dated |

Every feature below traces to one of those two rows.

---

## Constraints we set for ourselves

1. **One index.** Plus virtual replicas for sorting. No second index, no backend, no auth, no
   state-management library. The scope of the problem does not require them, and unnecessary
   architecture is harder to hand over than no architecture.
2. **Settings live in code.** Everything the index does is in `scripts/configure-index.ts` and
   committed — never clicked into the dashboard. Reproducible, reviewable, and diffable.
3. **Measure before tuning.** Relevance results are captured against *default* settings first, so
   the "after" has something honest to be compared against.
4. **Only the search-only API key reaches the browser.** The admin key lives in `.env` and is used
   by scripts only.
5. **Everything is explainable.** Every derived field and every non-default setting has a stated
   reason. If a choice needs a paragraph to justify, it is probably the wrong choice.

---

## Phases

Branch per phase, one commit per step, so each step is independently reviewable.

### Phase 0 — Foundation

| Step | Deliverable |
|---|---|
| 0.1 | Repo structure, TypeScript + `tsx` tooling, npm scripts, `.env.example`, raw data copied to `data/raw/`, this plan |

### Phase 1 — Data pipeline

Two source files, joined and cleaned into one flat record per restaurant. All pipeline code lives
in `scripts/`, as small named functions — one per derived field — so each transformation can be
reviewed and explained on its own.

| Step | Deliverable |
|---|---|
| 1.1 | Load both files and join on `objectID`. Assert 5,000/5,000, no orphans, no duplicates |
| 1.2 | Normalize scalars: ZIP codes, phone numbers, price. Flag records where the two sources disagree |
| 1.3 | Cuisine taxonomy: split composite values into `cuisines[]`, roll up to a browsable `cuisine_group` |
| 1.4 | Chain identity: derive `chain_name` / `location_label` from restaurant names |
| 1.5 | Quality signals: Bayesian-smoothed rating, log-scaled popularity, rating bucket |
| 1.6 | Location hierarchy (`area > city > neighborhood`) and discovery vibe tags |
| 1.7 | Imagery enrichment and final record emission to `data/out/records.json` |
| 1.8 | `docs/data-decisions.md` — the join, every transformation, every assumption |

### Phase 2 — Index and relevance

| Step | Deliverable |
|---|---|
| 2.1 | Algolia client and push script (`replaceAllObjects`), pushed with **default settings only** |
| 2.1a | Write the query manifest — **before a single result is observed** |
| 2.2 | Relevance test harness over that manifest → **`docs/relevance-baseline.md`** ⛔ *gate: no configuration is written before this exists* |
| 2.3 | Searchable attributes, faceting, custom ranking |
| 2.4 | Typo tolerance and query strategy |
| 2.5 | Synonyms and query rules |
| 2.6 | Virtual replicas for sorting, and facet display ordering |
| 2.7 | `docs/relevance-testing.md` — before/after, with commentary on what changed and why |

The query manifest deliberately covers every condition worth testing: exact, misspelled,
concatenated, prefix, punctuation and accents, broad, ambiguous, location-sensitive,
chain-in-a-single-city, intent/mood, zero-result, and empty.

### Phase 3 — Search experience

Vite + React + TypeScript + Tailwind, with React InstantSearch v7.

| Step | Deliverable |
|---|---|
| 3.1 | App shell wired to Algolia — working before pretty |
| 3.1a | Source and bundle the cuisine image set — must land before the cards below |
| 3.2 | Restaurant card and results grid |
| 3.3 | Refinements, sorting, and an always-visible summary of what is currently applied |
| 3.4 | Federated autocomplete: restaurants, cuisines, cities, recent searches |
| 3.5 | Location awareness, with a fallback chain that degrades gracefully |
| 3.6 | Chain grouping toggle |
| 3.7 | Discovery home for the empty query |
| 3.8 | Mobile and touch pass |
| 3.9 | Insights click and conversion events |
| 3.10 | Map view *(optional)* |
| 3.11 | "Why is this result here?" debug panel *(optional)* |

### Phase 4 — Deliverables

| Step | Deliverable |
|---|---|
| 4.1 | `README.md` and `docs/approach.md` |
| 4.2 | `docs/customer-questions.md` |
| 4.3 | Deploy, enable dashboard Support Access, walk the submission checklist ⛔ *gate* |

---

## Design decisions made up front

These were settled before the build started, from an analysis pass over the raw data.

**Chains are the hidden structure in this dataset.** Exact-name matching finds almost none —
only 21 duplicate names, all in different cities. Splitting names on a whitespace-padded dash
reveals 158 brand families across 604 restaurants, and 113 of those brands have two or more
locations in a *single* metro. That is precisely the third pain point in the discovery notes, so
chain identity is a derived field and `distinct` grouping is a first-class feature.

The grouping rule is deliberately conservative: a restaurant joins a brand only if its own name
carries a location suffix. Looser rules that also group restaurants merely sharing a name find up
to 207 brands, but 20 of those are collisions rather than chains — `Town` in Carbondale and `Town`
in Honolulu are not the same business. Because grouped results show one row per brand, a false
brand hides a real restaurant, so the rule requires positive evidence before it groups anything.

**Ratings cannot be used raw.** 4,435 of 5,000 restaurants — 89% — sit in the four-star bucket,
and 15 of the 21 perfect 5.0 scores come from fewer than 20 reviews. Sorting by raw rating opens
the page with 5.0s from two, three and five reviews. A Bayesian shrinkage estimator solves this,
and it is rounded to one decimal *deliberately* so that records still tie and the next ranking
signal can act.

**Geo needs bucketing, not just a centre point.** Distance is the second criterion in Algolia's
ranking formula, and at its default 10 m granularity it becomes a strict distance sort that
silently disables every criterion below it. Graduated `aroundPrecision` buckets turn "nearest at
any cost" into "nearby *and* good."

**Sorting uses virtual replicas.** Relevant Sort keeps quality results near the top while
honouring the sort, costs nothing against the record quota, and needs no second index to keep
in sync.

---

## Sequencing rules

- **Nothing is configured before the baseline is captured.** Default-configuration results are
  unrecoverable once overwritten, and the before/after comparison is the evidence that the
  tuning was reasoned rather than guessed.
- **The test queries are written before any results are seen.** Choosing them after looking at
  output would let the configuration be tuned to flatter the test set, and the improvement would
  measure nothing. The manifest is committed in its own step, ahead of the baseline run, and is
  not edited afterwards — queries can be *added* later, but nothing that was tested is removed.
- **Working before pretty.** The app is wired end-to-end and returning live results before any
  visual design work starts.
- **Documentation is written inside its phase**, not reconstructed afterwards.

If time runs short, features are cut in this order: map view → relevance debug panel → mood
tiles. Not cut under any circumstances: the mobile experience, the relevance testing record, the
customer questions, and dashboard Support Access.

---

## Repository layout

```
data/raw/          untouched copies of the two provided files
data/out/          generated records.json — committed, so the index contents are reviewable
scripts/           pipeline, index configuration, push, relevance harness
app/               Vite + React search experience
docs/              this plan, data decisions, relevance testing, approach, customer questions
docs/kb/           reference notes on Algolia used while building
```

## Commands

```bash
npm run data:build     # join + clean + derive → data/out/records.json
npm run index:config   # push settings, replicas, synonyms, rules
npm run index:push     # upload records (replaceAllObjects)
npm run index:test     # run the relevance query manifest
npm run dev            # start the app
npm run build          # production build
npm run typecheck      # tsc --noEmit
```
