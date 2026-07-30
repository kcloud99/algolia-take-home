import { InstantSearch } from 'react-instantsearch';

import { BoardStrip } from './components/board-strip';
import { RelevantSortNotice } from './components/relevant-sort-notice';
import { ResultsBoard } from './components/results-board';
import { RouteStrip } from './components/route-strip';
import { SignagePanel } from './components/signage-panel';
import { indexName, searchClient } from './lib/search-client';

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
 * No `<Configure>` yet: `hitsPerPage` is already set on the index, and repeating it here would give
 * two places to change one number. Insights and the geo parameters arrive in their own steps.
 */
export function App() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      routing
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <BoardStrip />
      <RouteStrip />

      <div className="mx-auto flex max-w-[1240px] gap-8 px-4 py-6">
        {/* The rail is desktop-only for now. Step 3.8 moves it behind a bottom sheet rather than
            leaving a 280px column to collapse badly on a phone. */}
        <aside className="hidden w-[280px] shrink-0 lg:block" aria-label="Refine results">
          <SignagePanel />
        </aside>

        <main className="min-w-0 flex-1">
          <RelevantSortNotice />
          <ResultsBoard />
        </main>
      </div>
    </InstantSearch>
  );
}
