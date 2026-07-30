import { useInstantSearch } from 'react-instantsearch';

import { useBoard } from '../lib/board-context';

/**
 * The platform marker — a brand's location count, boxed, and the way into its other locations.
 *
 * This is the payoff of the chain work. A collapsed row raises a question — *why is there only one
 * Atria's?* — and this both answers it and acts on it: there are eight, this is the one the ranking
 * chose, and clicking shows the rest. That is the third pain point in the discovery notes answered
 * rather than demonstrated: a diner who searched a chain gets one row, then the branches.
 *
 * The dark Ink surface is spent here on purpose. DESIGN.md's One Board Rule reserves it for live
 * information and names chain platforms as one of the three places it is allowed, which is what makes
 * the marker read as part of the board rather than as another tag. The directional arrow is the design's
 * own platform motif, and it is only here because it now goes somewhere.
 *
 * It leads the row's meta line rather than sitting beside the name. That was the second arrangement:
 * beside the name it took 90px from the one column that could least afford it, and the rows that carry a
 * marker are by definition the ones with the longest names — `McCormick & Schmick's Seafood - Pittsburgh
 * Downtown` lost its branch to make room, which is the exact information a diner searching a chain came
 * for.
 *
 * The count is `chain_location_count`, which is how many locations the *pipeline could group* under this
 * brand — not how many match the current search. Under a city filter it can exceed the rows on screen,
 * and it can undercount a real brand: McCormick & Schmick's reads 10 because three of its thirteen
 * records do not carry the location suffix the chain rule requires (`docs/data-decisions.md` §3). The
 * label therefore states a fact about the brand rather than about the result set — and clicking it
 * refines on `chain_name`, so the rows that arrive are exactly the ones the count is counting.
 */
export function PlatformMarker({ brand, locations }: { brand: string; locations: number }) {
  const { ungroup } = useBoard();
  const { setIndexUiState } = useInstantSearch();

  /**
   * Two things have to happen together, and neither alone is any use: refine to the brand, and stop
   * grouping. Refining while still grouped would collapse the brand straight back to one row.
   *
   * The typed query is cleared, matching what selecting a cuisine or a city already does — "show me this
   * brand's locations" is a filter, not a search. It also has to be: a brand can be on the board because
   * something *else* matched, and then the query would hide most of what was just asked for. Searching
   * `mccormick` surfaces Chart House - Scottsdale on a street-name match, and clicking its "5 locations"
   * would otherwise return the one Chart House that happens to sit on McCormick Parkway.
   */
  function showAllLocations() {
    setIndexUiState((previous) => ({
      ...previous,
      query: '',
      page: 1,
      refinementList: {
        ...previous.refinementList,
        chain_name: [brand],
      },
    }));
    ungroup();
  }

  return (
    <button
      type="button"
      onClick={showAllLocations}
      className="flex shrink-0 items-center gap-1 rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[0.625rem] tracking-[0.08em] text-amber uppercase hover:bg-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      aria-label={`Show all ${locations} ${brand} locations`}
    >
      {locations} locations <span aria-hidden="true">→</span>
    </button>
  );
}
