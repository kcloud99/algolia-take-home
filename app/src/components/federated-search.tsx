import { autocomplete } from '@algolia/autocomplete-js';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import { useEffect, useRef } from 'react';
import { useInstantSearch, useRefinementList, useSearchBox } from 'react-instantsearch';

import { citySource, cuisineSource, restaurantSource } from '../lib/autocomplete-sources';
import type { AutocompleteActions } from '../lib/autocomplete-sources';

/**
 * The search input, owned by Autocomplete.
 *
 * Autocomplete is a separate library from InstantSearch and it owns the input element, the keyboard
 * navigation, the ARIA wiring and its own state. **`SearchBox` must not be mounted at the same time**
 * — two components writing the same query is a documented way to get an input that fights the user.
 * That is why this component replaced it in the board strip rather than sitting beside it.
 *
 * The bridge between the two libraries is one-directional and deliberately small: on select or submit,
 * push into InstantSearch's UI state. Everything else about the board keeps working the way it did.
 */
export function FederatedSearch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setIndexUiState, indexUiState } = useInstantSearch();

  /**
   * The actions are held in a ref so the autocomplete instance can be created exactly once while still
   * calling the *current* `setIndexUiState`. Recreating the instance whenever the search state changes
   * would tear the input down mid-keystroke.
   */
  const actionsRef = useRef<AutocompleteActions>({ setQuery: () => {}, applyFacet: () => {} });

  actionsRef.current = {
    setQuery(query) {
      setIndexUiState((previous) => ({ ...previous, query, page: 1 }));
    },
    applyFacet(attribute, value) {
      setIndexUiState((previous) => ({
        ...previous,
        // Selecting a cuisine or a city is a filter, not a search, so the typed text is cleared —
        // leaving "ital" in the box next to an Italian filter would narrow the results twice.
        query: '',
        page: 1,
        refinementList: {
          ...previous.refinementList,
          [attribute]: [value],
        },
      }));
    },
  };

  // The query as it stood when the input mounted, so a shared URL arrives with its text in the box.
  const initialQueryRef = useRef(indexUiState.query ?? '');

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const actions: AutocompleteActions = {
      setQuery: (query) => actionsRef.current.setQuery(query),
      applyFacet: (attribute, value) => actionsRef.current.applyFacet(attribute, value),
    };

    const recentSearches = createLocalStorageRecentSearchesPlugin({
      key: 'opentable-recent-searches',
      limit: 4,
    });

    const instance = autocomplete({
      container: containerRef.current,
      placeholder: 'Search restaurants, cuisines, neighborhoods',
      initialState: { query: initialQueryRef.current },
      openOnFocus: true,
      /**
       * Set explicitly, and it has to be.
       *
       * Autocomplete reads this default from a CSS custom property, `--aa-detached-media-query`, which
       * only its classic theme defines — and this build deliberately does not import that theme. The
       * property therefore resolved to an empty string, and `matchMedia('')` matches *everything*, so
       * the input was permanently stuck in detached mode: a button that opens a full-screen modal,
       * rendered on desktop where an inline field belongs.
       *
       * Below 680px detached is the behaviour we want — a full-screen search overlay is better on a
       * phone than a dropdown pinned under a sticky header. Styling that modal belongs to step 3.8.
       */
      detachedMediaQuery: '(max-width: 680px)',
      // Deliberately not autofocused: on a phone this opens the keyboard, and in Autocomplete's
      // detached mode it would open a full-screen overlay before the diner has seen a single result.
      autoFocus: false,
      plugins: [recentSearches],
      /**
       * Every keystroke reaches the board, not just submits.
       *
       * Without this the dropdown updated as you typed while the board behind it sat on the previous
       * query — technically defensible, but it makes the search feel like it is waiting for permission,
       * and "instant results as you type" is the behaviour this prototype exists to demonstrate.
       *
       * No loop risk: the autocomplete instance is created once and never reads InstantSearch state
       * again, so pushing into InstantSearch cannot feed back into Autocomplete.
       */
      onStateChange({ state, prevState }) {
        if (state.query !== prevState.query) {
          actions.setQuery(state.query);
        }
      },
      // Submitting without picking a suggestion is still a search — Enter should close the panel and
      // leave the board on that query rather than doing nothing.
      onSubmit({ state }) {
        actions.setQuery(state.query);
      },
      // No custom `render`. Each source supplies its own header template, so Autocomplete's default
      // panel layout groups them correctly — which means one less thing between the library and the
      // markup, and the sources stay self-describing.
      getSources() {
        return [restaurantSource(actions), cuisineSource(actions), citySource(actions)];
      },
    });

    return () => instance.destroy();
  }, []);

  return (
    <>
      <VirtualSearchBox />
      <VirtualRefinement attribute="cuisines" />
      <VirtualRefinement attribute="city" />
      <div ref={containerRef} className="min-w-0 flex-1" />
    </>
  );
}

/**
 * The three virtual widgets below draw nothing. They exist because **UI state alone does not search.**
 *
 * InstantSearch translates UI state into search parameters through its *mounted widgets*: each widget
 * owns a slice of the state and contributes the parameters for it. Nothing is mounted, nothing is
 * applied — silently, with no error.
 *
 * This is the trap in replacing `SearchBox` with Autocomplete. `SearchBox` was not only an input, it
 * was what claimed ownership of `uiState.query`. Removing it meant the query was dropped on both paths
 * at once: `?restaurants[query]=ruth` in a shared URL returned all 5,000 records, and typing into the
 * new input would have set state that never reached a search. The board looked completely healthy
 * while the search box did nothing at all.
 */
function VirtualSearchBox() {
  useSearchBox();
  return null;
}

/**
 * The same registration, for the two attributes autocomplete can refine on.
 *
 * `cuisines` (116 values) and `city` (948) are deliberately absent from the signage panel — neither is
 * a list anyone scrolls — so autocomplete is the only way in, and without this a selection would update
 * the URL and change nothing. Registering them is also what lets the route strip display and remove
 * them. `limit: 1` because no values are ever rendered; this exists for the state mapping alone.
 */
function VirtualRefinement({ attribute }: { attribute: string }) {
  useRefinementList({ attribute, limit: 1 });
  return null;
}
