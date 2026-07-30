import { autocomplete } from '@algolia/autocomplete-js';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import { useEffect, useRef } from 'react';
import { useInstantSearch, useSearchBox } from 'react-instantsearch';

import { VirtualRefinement } from './virtual-refinement';
import { citySource, cuisineSource, restaurantSource } from '../lib/autocomplete-sources';
import type { AutocompleteActions } from '../lib/autocomplete-sources';
import type { SearchCentre } from '../lib/geo';

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
 *
 * **`centre` is a prop for the same reason the bridge exists at all: Autocomplete issues its own
 * requests and `<Configure>` does not reach them.** The board was location-aware and the dropdown above
 * it was not, so a diner in Portland typing a chain name got suggestions from Honolulu while the board
 * behind the dropdown showed Portland — the one place where the two surfaces are read together is
 * exactly where they disagreed.
 */
export function FederatedSearch({ centre }: { centre: SearchCentre }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setIndexUiState, indexUiState } = useInstantSearch();

  /**
   * The actions are held in a ref so the autocomplete instance can be created exactly once while still
   * calling the *current* `setIndexUiState`. Recreating the instance whenever the search state changes
   * would tear the input down mid-keystroke.
   */
  const actionsRef = useRef<AutocompleteActions>({ setQuery: () => {}, applyFacet: () => {} });

  /**
   * The centre, held the same way and for the same reason: the sources are built once, so they must read
   * it per keystroke rather than close over the value they were handed on mount. Assigned during render
   * rather than in an effect, so a source firing before effects have flushed still sees the current one.
   */
  const centreRef = useRef(centre);
  centreRef.current = centre;

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

  /**
   * The last query Autocomplete told us about, and the instance to tell things back to. Both exist for
   * the sync effect below; Autocomplete exposes `setQuery` but no `getState`, so the only way to know
   * whether the input already holds a value is to remember what it last reported.
   */
  const inputQueryRef = useRef(initialQueryRef.current);
  const instanceRef = useRef<ReturnType<typeof autocomplete> | null>(null);

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
       * phone than a dropdown pinned under a sticky header. That modal is styled in `index.css` under
       * "Detached mode" — its class names are a different set from the inline field's, which is why it
       * rendered as unstyled body text next to a bare magnifier until somebody looked at a phone.
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
          inputQueryRef.current = state.query;
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
        return [
          restaurantSource(actions, () => centreRef.current),
          cuisineSource(actions),
          citySource(actions),
        ];
      },
    });

    instanceRef.current = instance;

    return () => {
      instanceRef.current = null;
      instance.destroy();
    };
  }, []);

  /**
   * Re-ask for suggestions when the diner moves the centre, rather than waiting for the next keystroke.
   *
   * Without this the panel can be left holding suggestions for the city the diner just left — the same
   * defect this change exists to fix, one interaction later. Cheap and safe: `refresh` re-runs the
   * sources for the query already in the box, and is a no-op when the panel is closed.
   */
  useEffect(() => {
    void instanceRef.current?.refresh();
  }, [centre]);

  /**
   * The one place the bridge runs the other way: when something *other than the input* changes the query,
   * push it into the input.
   *
   * The bridge is otherwise deliberately one-directional, because two components writing one query is how
   * you get an input that fights the user. This is not that. It fires only when InstantSearch's query has
   * moved away from the value Autocomplete last reported, which a keystroke can never do — typing sets
   * both to the same string on the same tick.
   *
   * It exists because the platform marker clears the query when it refines to a brand, and without this
   * the box went on reading `mccormick` over a board that had no query at all. That is the same shape of
   * defect as an unmounted refinement: the UI claiming state the search does not have. Autocomplete's own
   * facet sources avoid it a different way, with `getItemInputValue: () => ''`, which only works for
   * changes that originate inside Autocomplete.
   */
  useEffect(() => {
    const query = indexUiState.query ?? '';

    if (instanceRef.current && query !== inputQueryRef.current) {
      inputQueryRef.current = query;
      instanceRef.current.setQuery(query);
    }
  }, [indexUiState.query]);

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
 * Draws nothing, and the search does not work without it — the same reason as `VirtualRefinement`,
 * which now lives in its own file because three attributes need it.
 *
 * This is the specific trap in replacing `SearchBox` with Autocomplete. `SearchBox` was not only an
 * input, it was what claimed ownership of `uiState.query`. Removing it meant the query was dropped on
 * both paths at once: `?restaurants[query]=ruth` in a shared URL returned all 5,000 records, and typing
 * into the new input would have set state that never reached a search. The board looked completely
 * healthy while the search box did nothing at all.
 */
function VirtualSearchBox() {
  useSearchBox();
  return null;
}
