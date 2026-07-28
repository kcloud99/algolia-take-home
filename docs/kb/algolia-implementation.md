# Algolia Implementation — Client & UI Libraries

Code-level reference: the JS client, React InstantSearch, Autocomplete, and Insights.
Companion to [algolia-core.md](algolia-core.md), which covers engine behavior.
Verified July 2026.

---

## 1. algoliasearch v5 — the JavaScript client

v5 is a **breaking rewrite** of v4. Most Algolia code you'll find online (and most model
training data) is v4. Getting this wrong is the fastest way to waste an hour.

### The v4 → v5 change

`initIndex()` **is gone.** There is no index object. Every method is flat on the client and
takes `indexName` as a parameter.

```js
// ❌ v4 — do not write this
const client = algoliasearch(appId, apiKey);
const index = client.initIndex('restaurants');
await index.saveObjects(records);
await index.setSettings(settings);
const res = await index.search('sushi');

// ✅ v5
import { algoliasearch } from 'algoliasearch';
const client = algoliasearch(appId, apiKey);
await client.saveObjects({ indexName: 'restaurants', objects: records });
await client.setSettings({ indexName: 'restaurants', indexSettings: settings });
const res = await client.searchSingleIndex({
  indexName: 'restaurants',
  searchParams: { query: 'sushi' },
});
```

Note the settings payload key is **`indexSettings`**, not `settings`.

### Imports

```js
import { algoliasearch } from 'algoliasearch';          // full client — write ops, admin key
import { liteClient } from 'algoliasearch/lite';        // search-only, small bundle — browser
```

Use `liteClient` in the frontend. It's search-only, which is both a bundle-size win and a
safety property: it physically cannot write.

### Methods we'll use

| Operation | v5 call |
|---|---|
| Search one index | `client.searchSingleIndex({ indexName, searchParams })` |
| Multi-index / federated search | `client.search({ requests: [{ indexName, query, ... }] })` |
| Add/replace records | `client.saveObjects({ indexName, objects })` |
| Atomic full reindex | `client.replaceAllObjects({ indexName, objects, batchSize })` |
| Partial field update | `client.partialUpdateObjects({ indexName, objects, createIfNotExists })` |
| Write settings | `client.setSettings({ indexName, indexSettings })` |
| Read settings | `client.getSettings({ indexName })` |
| Synonyms | `client.saveSynonyms({ indexName, synonymHit, replaceExistingSynonyms })` |
| Rules | `client.saveRules({ indexName, rules, clearExistingRules })` |
| Iterate all records | `client.browseObjects({ indexName, aggregator })` |
| Empty an index | `client.clearObjects({ indexName })` |
| Delete an index | `client.deleteIndex({ indexName })` |
| Facet value search | `client.searchForFacetValues({ indexName, facetName, searchForFacetValuesRequest })` |

`replaceAllObjects` is the right call for a rebuild-from-source pipeline: it indexes into a
temp index and atomically moves it over, so there's never a moment where the live index is
half-populated. Prefer it over `clearObjects` + `saveObjects`.

Most write methods return a task; `client.waitForTask({ indexName, taskID })` blocks until it's
applied. Do this before running relevance tests, or you'll test the old index and lose an hour
being confused.

### API keys — get this right

| Key | Where | Can |
|---|---|---|
| **Admin** | Scripts only, from `.env`, never committed, never in the browser | Everything |
| **Search-only** | Browser / `VITE_` env var | Query only |
| **Secured API key** | Generated server-side from a parent key | Query with locked-in filters — the multi-tenant pattern |

Never ship the admin key to the client. It's the one mistake that turns a demo into a security
conversation. In a real OpenTable engagement, per-user secured keys would be how you scope
results — worth mentioning even though this demo doesn't need it.

---

## 2. React InstantSearch v7

### Packages

```bash
npm i react-instantsearch algoliasearch
```

v7 unified the package (v6 was `react-instantsearch-hooks-web`). Everything imports from
`react-instantsearch`.

### Root

```jsx
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, SearchBox, RefinementList, Hits, Configure } from 'react-instantsearch';

const searchClient = algoliasearch(APP_ID, SEARCH_ONLY_KEY);

<InstantSearch
  searchClient={searchClient}
  indexName="restaurants"
  insights                                   // auto-sends view/click events
  routing                                    // sync UI state ↔ URL
  future={{ preserveSharedStateOnUnmount: true }}
>
  <Configure hitsPerPage={24} clickAnalytics />
  <SearchBox />
  <RefinementList attribute="cuisines" />
  <Hits />
</InstantSearch>
```

- **`insights`** — wires up the Insights client and auto-sends `view` events; `Hits` exposes a
  `sendEvent` for clicks/conversions.
- **`routing`** — two-way URL sync. Nearly free, and it makes a demo shareable/linkable, which
  matters when you're presenting.
- **`future.preserveSharedStateOnUnmount: true`** — the v7-recommended behavior; set it or
  conditionally-rendered widgets will drop their refinements unexpectedly.
- **`Configure`** — sets search parameters declaratively. This is where `aroundLatLng`,
  `aroundRadius`, `aroundPrecision`, `distinct`, `filters`, and `clickAnalytics` go.

### Widgets

`SearchBox` · `Hits` · `InfiniteHits` · `Highlight` · `Snippet` · `RefinementList` · `Menu` ·
`HierarchicalMenu` · `RangeInput` · `ToggleRefinement` · `NumericMenu` · `SortBy` · `Stats` ·
`Pagination` · `HitsPerPage` · `ClearRefinements` · `CurrentRefinements` · `Breadcrumb` ·
`DynamicWidgets` · `PoweredBy` · `Index` (for federated multi-index) · `Configure`.

### Hooks

Every widget has a hook: `useSearchBox`, `useHits`, `useInfiniteHits`, `useRefinementList`,
`useMenu`, `useHierarchicalMenu`, `useRange`, `useToggleRefinement`, `useSortBy`, `useStats`,
`usePagination`, `useHitsPerPage`, `useClearRefinements`, `useCurrentRefinements`,
`useBreadcrumb`, `useDynamicWidgets`, `useGeoSearch`, `useInstantSearch`, `useConnector`.

**Use hooks, not styled widgets, when you want a custom look.** Fighting the default CSS is
slower than rendering your own markup from a hook. `useInstantSearch()` gives access to
`results`, `status`, `error`, and `refresh` — that's how you build a custom empty state or a
"why this result" debug panel.

Three levels of control: widget → hook → `useConnector` for a fully custom connector.

---

## 3. Geo search UI

`useGeoSearch()` is **map-provider agnostic** — no Google Maps key required. Leaflet
(react-leaflet) or MapLibre both work and are free.

```jsx
const { items, refine, currentRefinement } = useGeoSearch();

// map bounds → insideBoundingBox
const map = useMapEvents({
  zoomend: onViewChange,
  dragend: onViewChange,
});

function onViewChange() {
  const b = map.getBounds();
  refine({ northEast: b.getNorthEast(), southWest: b.getSouthWest() });
}
```

Two distinct patterns — don't mix them up:

- **Radius mode** — `<Configure aroundLatLng="45.52,-122.68" aroundRadius="all"
  aroundPrecision={2000} />`. Geo participates in *ranking*. This is "near me."
- **Bounding-box mode** — `refine({ northEast, southWest })` from map bounds. This is a
  *filter*; it does **not** rank by distance. This is "search as I move the map."

To display distance, set `getRankingInfo: true` via `Configure` and read
`hit._rankingInfo.geoDistance` (meters). Cleaner than recomputing haversine client-side, and it
reports the distance the *engine* used — which is the number you want when explaining ranking.

---

## 4. Autocomplete

Separate library from InstantSearch. Handles input, keyboard nav, ARIA, and state — **you render
all the markup**. There are no prebuilt UI widgets.

```bash
npm i @algolia/autocomplete-js @algolia/autocomplete-plugin-recent-searches
```

```js
import { autocomplete, getAlgoliaResults } from '@algolia/autocomplete-js';

autocomplete({
  container: '#autocomplete',
  placeholder: 'Search restaurants, cuisines, neighborhoods',
  openOnFocus: true,
  plugins: [recentSearchesPlugin],
  getSources({ query }) {
    return [
      {
        sourceId: 'restaurants',
        getItems: () => getAlgoliaResults({
          searchClient,
          queries: [{ indexName: 'restaurants', query, params: { hitsPerPage: 6 } }],
        }),
        templates: { item: ({ item, components }) => /* your markup */ },
        onSelect: ({ item }) => navigateToRestaurant(item),
      },
      {
        sourceId: 'cuisines',
        getItems: () => getAlgoliaFacets({
          searchClient,
          queries: [{ indexName: 'restaurants', facet: 'cuisines', params: { facetQuery: query } }],
        }),
      },
    ];
  },
});
```

Key ideas:

- **Sources** are independent result groups rendered in one dropdown — this is what "federated"
  means. Restaurants, cuisines, cities, and recent searches are four sources, one panel.
- **`getAlgoliaResults`** for record hits; **`getAlgoliaFacets`** for facet-value suggestions.
  `getAlgoliaFacets` is how you get "Italian · 850 restaurants" rows without a separate index —
  which matters here since Query Suggestions needs analytics traffic we won't have.
- **Plugins:** `autocomplete-plugin-recent-searches` (localStorage, zero backend) and
  `autocomplete-plugin-query-suggestions` (needs a suggestions index).
- **Combining with InstantSearch on one page:** Autocomplete owns the input; on submit/select
  you push the query into InstantSearch state (via `useInstantSearch().setIndexUiState` or the
  `routing` URL). Don't mount `SearchBox` at the same time — two components fighting over the
  same query is a classic bug.

---

## 5. Insights events

```js
// InstantSearch v7: the `insights` prop does view events automatically.
// For clicks and conversions, use sendEvent from the Hits render props:
<Hits hitComponent={({ hit, sendEvent }) => (
  <article onClick={() => sendEvent('click', hit, 'Restaurant Clicked')}>
    ...
    <a onClick={() => sendEvent('conversion', hit, 'Reservation Started')}>Reserve</a>
  </article>
)} />
```

- `clickAnalytics: true` on the search (via `Configure`) is what generates the `queryID` that
  attributes the event back to the query. Without it you get events but no per-query CTR.
- A `queryID` must be used within **1 hour** of its search.
- `userToken` is set automatically by InstantSearch (anonymous), or explicitly for logged-in users.
- Conversion subtypes `addToCart` / `purchase` are e-commerce-shaped; for a reservation flow,
  a plain `conversion` named `Reservation Started` is the honest mapping.

Instrumenting this is cheap and it's the bridge from "search demo" to "measurable business
outcome" — every AI feature downstream (Re-Ranking, Personalization, Recommend, NeuralSearch)
is trained on exactly these events.

---

## 6. Gotchas

1. **v4 vs v5.** Any snippet with `initIndex` is v4. Translate it before pasting.
2. **`indexSettings`, not `settings`,** in `setSettings`.
3. **`objectID` must be a string** in records. Numeric IDs get coerced — coerce them yourself so
   joins across files behave predictably.
4. **`_geoloc` lat/lng must be numbers.** Strings fail silently: no error, just no geo ranking.
5. **Wait for tasks.** `waitForTask` after settings/index writes before testing, or you're
   testing the previous configuration.
6. **Settings changes that alter the index structure reindex it.** `searchableAttributes`,
   `attributesForFaceting`, `customRanking` are not free on large indices.
7. **Facets need declaring.** `RefinementList` on an attribute missing from
   `attributesForFaceting` renders empty with no error. First thing to check when a facet is blank.
8. **`liteClient` cannot write.** That's the point — but it means you can't reuse the frontend
   client in a script.
9. **Query Suggestions needs analytics volume.** A fresh account has none. Use `getAlgoliaFacets`
   or a hand-curated list instead.
10. **`aroundLatLngViaIP` is IPv4-only** and resolves poorly on localhost/VPN. Always ship an
    explicit location picker as a fallback.
11. **`distinct` needs `attributeForDistinct` as an index setting.** Setting `distinct: true` at
    query time with no `attributeForDistinct` configured does nothing.
12. **Disjunctive facet counts require multiple queries.** InstantSearch does this for you;
    hand-rolled raw-API code usually gets it wrong and shows counts that shift as you refine.

---

## 7. Useful tooling

- **Algolia CLI** (`brew install algolia/algolia-cli/algolia`) — `algolia objects import`,
  `algolia settings import/export`, `algolia index clear|delete`. Good for the fast
  iterate-and-reset loop, and the answer to "clearing indices takes too many clicks."
- **Dashboard → Search API Logs** — see the exact parameters of recent queries. Invaluable when
  the UI sends something you didn't expect.
- **`getRankingInfo: true`** — per-hit ranking breakdown. The debugging tool.
- **Dashboard Explorer / relevance test tool** — side-by-side query comparison.
- **`algolia.com/llms.txt`** — machine-readable docs index; useful for finding exact doc URLs
  when a guessed one 404s.
