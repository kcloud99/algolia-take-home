import { useCallback, useState } from 'react';
import { Configure, InstantSearch } from 'react-instantsearch';

import { BoardStrip } from './components/board-strip';
import { DiscoveryHeader } from './components/discovery-header';
import { NoExactMatchNotice } from './components/no-exact-match-notice';
import { RelevantSortNotice } from './components/relevant-sort-notice';
import { ResultsBoard } from './components/results-board';
import { RouteStrip } from './components/route-strip';
import { SignagePanel } from './components/signage-panel';
import { VirtualRefinement } from './components/virtual-refinement';
import { geoSearchParameters } from './lib/geo';
import { GroupingProvider } from './lib/grouping-context';
import { indexName, searchClient } from './lib/search-client';
import { useSearchCentre } from './lib/use-search-centre';

/**
 * Searching 5,000 restaurants is a wayfinding problem — orientation and disambiguation. So the
 * results are a departure BOARD, the facets a signage PANEL, and a chain a PLATFORM: a bright cool
 * concourse, with a bounded dark board reserved for live information, one blue that owns every
 * interaction, and every number set in tabular mono so the columns align like a real timetable.
 *
 * The search root.
 *
 * `routing` syncs UI state to the URL in both directions. It is nearly free and it makes any state of
 * the demo a shareable link, which matters when the artifact is presented on a call.
 *
 * `preserveSharedStateOnUnmount` is the v7-recommended behaviour: without it, a widget that unmounts
 * discards refinements another widget is still reading. That bites as soon as the same facet renders
 * in both a sidebar and a mobile sheet, which is where this build is heading.
 *
 * `<Configure>` carries the two parameters that are properties of the *diner* rather than of the index —
 * where they are and whether they want one row per brand. `hitsPerPage` stays an index setting, because
 * repeating it here would give two places to change one number.
 *
 * Note that neither round-trips through the URL, and this is the library's decision rather than ours:
 * both of InstantSearch's routing state mappings strip `configure` from the route on the way out. So a
 * shared link carries the query and the refinements, and resolves location and grouping fresh.
 */
export function App() {
  const { centre, choice, choose, notice } = useSearchCentre();

  // Off by default, matching `distinct: false` on the index. Browsing is the more common arrival, and
  // collapsing a brand to one row is the deliberate act of someone who already knows which brand.
  const [grouped, setGrouped] = useState(false);

  // Stable, because it goes into a context: a fresh function each render would re-memoise the value and
  // push a new context object to every row on every render.
  const ungroup = useCallback(() => setGrouped(false), []);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      routing
      future={{ preserveSharedStateOnUnmount: true }}
    >
      {/* `getRankingInfo` is app-wide rather than part of the geo parameters, because two things read it:
          the per-row distance, and the notice that says when nothing on the board is spelled the way the
          diner typed it. Tying it to geo would have meant the second one silently stopped working
          whenever a diner chose "Anywhere in the US". */}
      <Configure {...geoSearchParameters(centre)} distinct={grouped} getRankingInfo />

      {/* Refined by the platform marker on a grouped row, and by nothing else — 158 brands is not a list
          anyone scrolls, so it has no place in the signage panel. Without the widget mounted the
          refinement would update the URL and change no results at all. */}
      <VirtualRefinement attribute="chain_name" />

      <BoardStrip />
      <RouteStrip
        grouped={grouped}
        onGroupedChange={setGrouped}
        locationChoice={choice}
        onChooseLocation={choose}
        locationNotice={notice}
      />

      <div className="mx-auto flex max-w-[1240px] gap-8 px-4 py-6">
        {/* The rail appears at `xl`, not `lg`, and the breakpoint was measured rather than picked. A
            single-line board row needs 543px of fixed cells plus a readable name; at 1024px the rail
            left the name column 137px wide, which is the same defect a phone had. Below `xl` the panel
            lives in `FilterSheet` instead. */}
        <aside className="hidden w-[280px] shrink-0 xl:block" aria-label="Refine results">
          <SignagePanel />
        </aside>

        <main className="min-w-0 flex-1">
          <RelevantSortNotice />
          <NoExactMatchNotice />

          {/* Discovery is a state of this board rather than a route: it draws two chip rows above the
              same results and nothing else changes. It renders itself only on arrival. */}
          <DiscoveryHeader />

          {/* Only the board needs to know how it is arranged, or to change it — see
              `grouping-context.tsx` for why this is a context rather than a prop. */}
          <GroupingProvider grouped={grouped} ungroup={ungroup}>
            <ResultsBoard />
          </GroupingProvider>
        </main>
      </div>
    </InstantSearch>
  );
}
