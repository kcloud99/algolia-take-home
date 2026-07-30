# OpenTable Restaurant Discovery — Algolia SE Assignment

## Abstract

A take-home for an Algolia **Solutions Engineer** role. Build a restaurant search-and-discovery
prototype for a simulated prospect (OpenTable) on Algolia: a data pipeline that joins and cleans
two messy source files, a tuned index configuration, a modern search UI, and written answers to
three "customer" support questions.

Two follow-up interviews depend on this artifact — a **technical debrief** (explain and defend
every choice) and a **45-minute mock customer call** with interviewers role-playing OpenTable's
CTO and CPO. Therefore: **everything here must be explainable out loud.** Cleverness we can't
defend in one sentence is a liability, not a feature.

Repo: `git@github.com:kcloud99/algolia-take-home.git` — already our own repo; the assignment
forbids forking theirs, and we didn't.

**Owner:** Kyle McLeod · **Target effort:** ~10–14 hours (the scorecard asks how long it took, and
separately penalizes over-engineering — efficiency is scored, heroics are not).

---

## Read order

1. **This file** — orientation, data facts, house rules.
2. `docs/kb/algolia-core.md` — before touching any index setting or debating relevance.
3. `docs/kb/index-design.md` — before writing the pipeline or the config script.
4. `docs/kb/algolia-implementation.md` — before writing any client or UI code.
5. `DESIGN.md` — the design system ("The Concourse Board"). Normative for anything visual.
6. `.claude/strategy.md` — rubric mapping, demo narrative, build order. *(gitignored, private)*

---

## Knowledge base

Deep-dive docs in `docs/kb/`. Read the relevant one rather than guessing — Algolia's semantics
are unusual enough that guessing produces confident, wrong code.

| File | When to read |
|------|-------------|
| `docs/kb/algolia-core.md` | Ranking formula, settings catalogue, typo tolerance, geo, faceting, distinct, replicas, synonyms, Rules, Insights, limits, and a relevance-debugging playbook |
| `docs/kb/index-design.md` | Our actual record schema, every derived field with its rationale, the full index settings JSON, synonyms, Rules, geo params |
| `docs/kb/algolia-implementation.md` | algoliasearch **v5** client API, React InstantSearch v7, Autocomplete, geo UI, Insights events, and 12 gotchas |
| `docs/relevance-testing.md` | *(to be written during the build)* Test queries with before/after observations |
| `docs/data-decisions.md` | *(to be written during the build)* Join, transforms, assumptions |

---

## The prospect

OpenTable. In-house Elasticsearch stack, ~10 years old, hard to evolve. They want higher search
quality, a modern UX, real discovery, more platform usage, and more **conversion from search →
booking**.

| Persona | Need | Stated pain |
|---|---|---|
| **1. Known-item** | Find a specific restaurant fast, then book | Hard-to-spell names; typos, concatenations, partial names, alternate spellings; **chains with multiple locations in one city are hard to disambiguate** |
| **2. Explorer** | Browse, compare, get inspired | No real discovery; limited browse/refine/inspire; feels dated |

Every feature decision traces back to one of these two rows. If it doesn't, cut it.

---

## Source data — verified facts

Raw: `project-files/dataset/restaurants_list.json` (5,000 records) and `restaurants_info.csv`
(5,000 rows, **semicolon-delimited**). No nulls or empties in either file.

**The join is clean:** 5,000/5,000 on `objectID`, no dupes, no orphans. Gotcha — `objectID` is an
**int in JSON, a string in CSV**.

| Finding | Detail | Consequence |
|---|---|---|
| **Chains are hidden** | Exact-duplicate names: only 21 pairs, all in *different* cities. But splitting names on a whitespace-padded dash reveals **158 brand families over 604 restaurants**, and **113 brands have 2+ locations in one metro** (Atria's ×8 Pittsburgh, Perry's ×6 Houston, Dinosaur Bar ×6 NY, Stanford's ×5 Portland) | Derive `chain_name`; use `distinct`. Directly answers persona 1's third pain |
| **Ratings are a trap** | `stars_count` mean **4.294**; **4,435 of 5,000 (89%) sit in the 4★ bucket** (`floor(stars) == 4`). Only 21 hit 5.0 — and **15 of those have <20 reviews**; the naive top 10 is 5.0s from 2, 3 and 5 reviews | Never `desc(stars_count)`. Bayesian smoothing required |
| **Reviews are heavy-tailed** | 1 → 12,669; median 336, p90 1,355, p99 3,528 | Log-scale and bucket, never use raw |
| **All images are dead** | Every `image_url` 302s to a 2.2 KB generic placeholder on `cdn.otstatic.com` | Must enrich. Also: tell the customer |
| **Price sources disagree** | JSON `price` (2–4, never 1) vs CSV `price_range` conflict on **220 records (4.4%)** | Pick `price_range` as canonical; flag conflicts |
| **Phones are dirty** | **50.6%** (2,532) of JSON `phone` values carry a trailing `x` fragment — 2,464 bare `x`, 68 with extension digits. **95** genuinely disagree with the CSV on the 10-digit number (160 if extension digits are counted as disagreement). The CSV is *cleaner but not clean*: **67** values end in a stray ` e` | Use CSV `phone_number`, keeping only the leading `(NNN) NNN-NNNN` |
| **Cuisine taxonomy is messy** | 114 `food_type` values incl. composites (`Creole / Cajun / Southern`, `Global, International`) and near-dupes (`American` 865 / `Contemporary American` 649; `Steak` 123 / `Steakhouse` 328) | Split into multi-value `cuisines[]` + a `cuisine_group` rollup |
| **Neighborhoods are ambiguous** | 1,062 distinct; top value is **`Downtown` (185)** across many cities. 6 values also arrive whitespace-padded (`" Noblesville"`), which would split one neighborhood into two facet values | Hierarchical facet `area > city > neighborhood`; trim every CSV field on load |
| **Geo coverage is lopsided** | All 5,000 US with valid `_geoloc`. NY 1,086 · CA 722 · TX 433 · CO 360 · **OR 193** — but **IL 3 · WA 3**. No Chicago, no Seattle | "Near me" must degrade gracefully. `aroundRadius: "all"`. Default to a dense market |
| **Names are punctuation-heavy** | 942 apostrophes, 1,118 hyphens, 438 ampersands, 59 accented (`Wallsé`, `Tía Pol`, `Lüke`) | All match unaided — `separatorsToIndex` measured and dropped (`index-design.md` §8). Diacritic normalization is a free demo win |
| Clean fields | `dining_style` 4 values · `price_range` 3 values · `payment_options` 9 (long tail: `Cash Only` = 7) · 62 ZIP+4 to normalize | Straightforward |

Full record schema and per-field rationale: `docs/kb/index-design.md`.

---

## Algolia non-negotiables

The ten things that must survive every session. Depth in `docs/kb/algolia-core.md`.

1. **The client is algoliasearch v5. `initIndex()` does not exist.** Every method is flat on the
   client with `indexName` as a parameter: `client.saveObjects({ indexName, objects })`,
   `client.setSettings({ indexName, indexSettings })`. Most snippets online (and most model
   priors) are v4 — translate before pasting. Settings key is `indexSettings`, not `settings`.
2. **Algolia ranks by tie-breaking, not scoring.** Ordered criteria:
   `typo → geo → words → filters → proximity → attribute → exact → custom`. Criterion N only
   reorders *within* ties from criterion N−1. A later criterion can never override an earlier one.
   This is the core thing to explain to an Elasticsearch shop.
3. **`customRanking` only breaks ties — it does not boost.** And if its first attribute has
   near-unique values, nothing after it ever fires. **Round and bucket deliberately** so records
   tie and later signals get to speak.
4. **Geo is criterion 2, so it eats everything below it.** Default granularity is 10 m, which makes
   it a strict distance sort. Without `aroundPrecision`, our custom ranking is inert. Bucketing
   distance is what turns "nearest" into "nearby AND good." **This is our headline relevance
   decision.**
5. **Don't reorder the default `ranking` array casually.** Legit reasons: `asc()`/`desc()` at the
   top for a standard replica. "One query looked wrong" is not a reason.
6. **`objectID` must be a string; `_geoloc` lat/lng must be numbers.** Strings in `_geoloc` fail
   silently — no error, just no geo ranking.
7. **A facet must be declared in `attributesForFaceting` or it renders empty with no error.**
   First thing to check when a `RefinementList` is blank.
8. **Only the search-only key reaches the browser.** Admin key lives in `.env`, used by scripts
   only. Use `liteClient` in the frontend — it physically cannot write.
9. **`waitForTask` after settings or index writes** before running relevance tests, or you're
   testing the previous configuration and will lose an hour.
10. **Settings live in code, not the dashboard.** Everything in `scripts/configure-index.ts`,
    committed. Reproducible, reviewable, and the single cheapest way to score on process
    organization.

---

## Architecture

**Decision: build fresh with React InstantSearch; keep `project-files/` as reference only.**
The supplied scaffold is `algoliasearch-helper` + **parcel 1.9.7** with `"node": "^9.6.1"` — EOL,
and demoing it would contradict the prospect's explicit ask for something modern. InstantSearch is
what Algolia would actually recommend to OpenTable. Be ready to discuss the helper-level API
anyway; they may probe it.

| Layer | Choice |
|---|---|
| Runtime | Node 22, TypeScript, ESM |
| Pipeline | `tsx` scripts, `algoliasearch` v5 |
| Frontend | Vite 7 + React 19 + TypeScript + Tailwind v4 |
| Search UI | `react-instantsearch` v7 + `@algolia/autocomplete-js` |
| Map | MapLibre or react-leaflet (no API key required) |
| Deploy | Vercel |
| Plan | Algolia Build (free): 1M records, 10k searches/mo — 5,000 records is trivial |

```
/
├── CLAUDE.md
├── README.md              ← submission-facing: approach, decisions, how to run
├── .env.example           ← ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, VITE_ALGOLIA_SEARCH_KEY
├── data/
│   ├── raw/               ← copies of the two provided files
│   └── out/records.json   ← generated, committed for reviewability
├── scripts/
│   ├── build-records.ts   ← join, clean, derive, enrich
│   ├── configure-index.ts ← ALL settings, replicas, synonyms, rules — as code
│   └── push-records.ts    ← replaceAllObjects
├── app/                   ← Vite + React + TS + Tailwind
└── docs/
    ├── kb/                ← durable reference (see table above)
    ├── approach.md
    ├── data-decisions.md
    ├── relevance-testing.md
    └── customer-questions.md
```

**Scope discipline:** the rubric explicitly scores "avoid over-engineering." One index + virtual
replicas, one pipeline, one app. No Next.js, no backend, no auth, no state library, no monorepo
tooling.

---

## Commands

```bash
npm run data:build      # join + clean + derive → data/out/records.json
npm run index:config    # push settings, replicas, synonyms, rules
npm run index:push      # upload records (replaceAllObjects)
npm run dev             # vite dev server
npm run build           # production build
```

---

## Code conventions

- **TypeScript everywhere**, ESM. `scripts/` uses `.js` extensions on relative imports because it
  resolves as NodeNext; `app/` omits them because Vite resolves as a bundler. Each side follows its
  own tsconfig, and `npm run typecheck` runs both.
- **File naming:** kebab-case — `build-records.ts`, `restaurant-card.tsx`.
- **Pipeline shape:** small pure functions, one per derived field, each independently testable and
  independently explainable. `deriveChainName(name, counts)` beats a 200-line transform.
- Comments explain **why**, not what. Every non-obvious relevance choice gets one.
- Clean and readable over clever. If it needs a paragraph to justify, it's probably wrong.
- Secrets in `.env` (gitignored); only `.env.example` is committed.
- **Record decisions as you make them** in `docs/data-decisions.md` / `docs/relevance-testing.md`.
  Reconstructing rationale the night before the debrief is how debriefs go badly.

---

## Rules for Claude Code

1. **Do not over-engineer.** It's an explicit scorecard line. Simplest thing that fully meets the
   requirement, every time.
2. **Stick to official Algolia documentation and current APIs.** When unsure of a parameter name,
   default, or method signature, check `docs/kb/` first, then the live docs — don't guess. Algolia
   fails silently on several misconfigurations, so a wrong guess costs debugging time, not an error.
3. **Never write algoliasearch v4 code.** See non-negotiable #1.
4. **Capture the "before" state before tuning anything.** The relevance story needs evidence, and
   default-config results are unrecoverable once overwritten.
5. Follow existing patterns in the repo before introducing new ones.
6. Don't write or run tests unless asked.
7. Ask for clarification rather than assuming — the scorecard rewards it, and so does the mock call.
8. Prioritize readability and explainability over performance micro-optimization. At 5,000 records
   nothing here is performance-bound.

---

## Submission checklist

- [ ] Live demo URL (Vercel)
- [ ] Repo link
- [ ] Written explanation of approach (`README.md` + `docs/approach.md`)
- [ ] Data prep + import script in the repo
- [ ] Evidence of relevance testing (`docs/relevance-testing.md`)
- [ ] Answers to the three customer questions (`docs/customer-questions.md`)
- [ ] **Algolia dashboard → Settings → Support Access → "Allow Algolia employees to access my
      account" enabled** — explicitly required, easy to forget
- [ ] Honest hours figure ready
