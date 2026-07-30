import { getAlgoliaFacets, getAlgoliaResults } from '@algolia/autocomplete-js';
import type { AutocompleteSource } from '@algolia/autocomplete-js';
import type { BaseItem } from '@algolia/autocomplete-core';

import { geoQueryParameters } from './geo';
import type { SearchCentre } from './geo';
import { formatLocality } from './locality';
import type { Restaurant } from './restaurant';
import { indexName, searchClient } from './search-client';

/**
 * The things a diner might mean when they start typing, as independent sources rendered in one
 * dropdown. That is what "federated" means here, and it is the direct answer to persona 1: the
 * known-item seeker who cannot spell the name.
 *
 * Restaurants come from `getAlgoliaResults` — actual records. Cuisines and cities come from
 * `getAlgoliaFacets`, which returns facet *values* with counts. That distinction matters for this
 * project: Query Suggestions would be the usual source of "popular searches", but it is generated from
 * search analytics and a fresh account has none, so real facet values stand in. They beat a
 * hand-curated list because they cannot go stale or offer a search that returns nothing.
 *
 * **Two things about the query shapes below, both of which the types had to settle rather than
 * guesswork.** Autocomplete passes these straight to algoliasearch's legacy multi-query signature, so
 * for record searches the `query` sits *inside* `params`, while for facet searches `facetQuery` and
 * `maxFacetHits` sit at the *root* beside `type: 'facet'`. Putting either in the other place is a
 * compile error, which is the good outcome — the v4 spelling would otherwise have failed silently.
 *
 * **On the item types.** Autocomplete is generic over a single item type and these sources return two
 * different shapes. Each source is therefore declared over `BaseItem` and narrows once, in its own
 * templates and `onSelect`, where the shape is actually known — rather than casting the whole array at
 * the call site and losing the typing everywhere.
 */

/** What a selection does to the board. Implemented by the component that owns InstantSearch state. */
export type AutocompleteActions = {
  setQuery: (query: string) => void;
  applyFacet: (attribute: string, value: string) => void;
};

/**
 * Where the dropdown searches from, read **at keystroke time rather than at creation time**.
 *
 * A getter rather than a value because the autocomplete instance is deliberately created once and
 * never rebuilt — see `federated-search.tsx`. A plain `SearchCentre` argument would be captured in
 * these closures on mount and the dropdown would go on searching from New York for the rest of the
 * session, however many times the diner changed the location control. That failure is silent: the
 * suggestions look perfectly reasonable, they are just for the wrong city.
 */
export type CentreReader = () => SearchCentre;

/** A facet value as `getAlgoliaFacets` returns it. */
type FacetItem = { label: string; count: number };

/** Restaurants: the known-item path. Selecting one puts its name in the box and searches for it. */
export function restaurantSource(
  actions: AutocompleteActions,
  centre: CentreReader,
): AutocompleteSource<BaseItem> {
  return {
    sourceId: 'restaurants',
    getItems({ query }) {
      return getAlgoliaResults<BaseItem>({
        searchClient,
        queries: [
          {
            indexName,
            params: {
              query,
              hitsPerPage: 5,
              // Placed by the same centre as the board, for the reason in `geo.ts`: two surfaces
              // answering one question from different cities is worse than either answer alone.
              ...geoQueryParameters(centre()),
              /**
               * **Names only, and the geo parameters above are exactly why.**
               *
               * Geo is the second ranking criterion, so it runs *above* `attribute` — which means once
               * a query is placed, a nearby match in any searchable attribute outranks a distant match
               * in the name. The index makes `neighborhood,city,area,state` searchable, which is right
               * for the board ("seafood portland" should work on text alone) and wrong here: measured
               * from New York, "ruth" led with three restaurants in *Rutherford, NJ* — Cafe Matisse,
               * Paisano's, Pink — before the first Ruth's Chris. Correct by the formula, useless in a
               * dropdown whose one job is finding a restaurant by name.
               *
               * Restricting to `name` costs nothing that this dropdown was providing, because the
               * federated design already covers the other intents: cuisine and city have their own
               * sources below, and a neighborhood as famous as SoHo is in the restaurant names anyway
               * ("Koi - Soho", "Sant Ambroeus SoHo" still lead the "soho" suggestions). Measured across
               * eight test queries, this changed the result set for exactly two — "ruth", which it
               * fixes, and "italian", which the Cuisine source answers better. Enter still searches
               * everything: the board is unrestricted, so nothing is unreachable, only unsuggested.
               */
              restrictSearchableAttributes: ['name'],
            },
          },
        ],
      });
    },
    getItemInputValue: ({ item }) => asRestaurant(item).name,
    onSelect({ item }) {
      actions.setQuery(asRestaurant(item).name);
    },
    templates: {
      header({ html }) {
        return html`<span class="aa-SourceHeaderTitle">Restaurants</span>`;
      },
      item({ item, html }) {
        const restaurant = asRestaurant(item);
        return html`<div class="ac-row">
          <span class="ac-rowFigure">${restaurant.bayesian_rating.toFixed(1)}</span>
          <span class="ac-rowBody">
            <span class="ac-rowName">${restaurant.name}</span>
            <span class="ac-rowMeta"
              >${restaurant.cuisine_group} · ${formatLocality(restaurant)}</span
            >
          </span>
        </div>`;
      },
    },
  };
}

/**
 * Cuisines, applied as a facet refinement rather than as query text.
 *
 * Selecting "Italian" filters rather than searches, which is the more precise action and leaves the
 * diner a removable chip in the route strip.
 */
export function cuisineSource(actions: AutocompleteActions): AutocompleteSource<BaseItem> {
  // `cuisines`, not `cuisine_group`. Facet search requires `searchable()` in `attributesForFaceting`,
  // and Phase 2 declared it on `cuisines` (116 values, too many to scan) but not on `cuisine_group`
  // (23 values, browsable as a list). Asking the API for the wrong one is a hard error —
  // "Cannot search in `cuisine_group` attribute" — which is how this was caught before it shipped.
  // It is also the right attribute: the panel browses the rollup, autocomplete searches the precise
  // taxonomy, which is the division of labour the panel's own comment already claimed.
  return facetSource({ sourceId: 'cuisines', attribute: 'cuisines', title: 'Cuisine', actions });
}

/**
 * Cities. `city` is faceted on the index but deliberately absent from the signage panel — 948 values
 * is not a list anyone scrolls. Autocomplete is the right way in, and the chip in the route strip is
 * how the applied filter stays visible and undoable.
 */
export function citySource(actions: AutocompleteActions): AutocompleteSource<BaseItem> {
  return facetSource({ sourceId: 'cities', attribute: 'city', title: 'City', actions });
}

/**
 * Both facet sources differ only by which attribute they search, so they share one implementation.
 *
 * **These two are deliberately not placed by the diner's centre, and the reason is measured rather
 * than assumed.** Sending the board's geo parameters here changes the returned facet values by
 * nothing at all — `aroundRadius: "all"` keeps distance in the *ranking* and out of the *filtering*,
 * and a facet search returns values ordered by count, not by rank. From New York, "por" returns
 * `Portland (117) · Port Chester (2) · Port Jefferson (2) · La Porte (1)` with the geo parameters and
 * without them, identically. Adding them would be dead code that looked like a feature.
 *
 * Making them genuinely local would take a real radius, and that is the wrong trade for both. The City
 * source is *how a diner relocates* — from New York with a 50 km radius, "por" returns Port Chester and
 * hides Portland, which breaks its only job. And a local cuisine count would stop matching the board:
 * the dropdown would promise "American (198)" and open a board of 882.
 */
function facetSource({
  sourceId,
  attribute,
  title,
  actions,
}: {
  sourceId: string;
  attribute: string;
  title: string;
  actions: AutocompleteActions;
}): AutocompleteSource<BaseItem> {
  return {
    sourceId,
    getItems({ query }) {
      return getAlgoliaFacets<BaseItem>({
        searchClient,
        queries: [
          { indexName, type: 'facet', facet: attribute, facetQuery: query, maxFacetHits: 4 },
        ],
      });
    },
    // Empty, because selecting a facet clears the query rather than writing into it.
    getItemInputValue: () => '',
    onSelect({ item }) {
      actions.applyFacet(attribute, asFacet(item).label);
    },
    templates: {
      header({ html }) {
        return html`<span class="aa-SourceHeaderTitle">${title}</span>`;
      },
      item({ item, html }) {
        const facet = asFacet(item);
        return html`<div class="ac-row">
          <span class="ac-rowBody"><span class="ac-rowName">${facet.label}</span></span>
          <span class="ac-rowCount">${facet.count.toLocaleString()}</span>
        </div>`;
      },
    },
  };
}

/** The two narrowing points. Autocomplete hands back `BaseItem`; the source knows what it asked for. */
function asRestaurant(item: BaseItem): Restaurant {
  return item as unknown as Restaurant;
}

function asFacet(item: BaseItem): FacetItem {
  return item as unknown as FacetItem;
}
