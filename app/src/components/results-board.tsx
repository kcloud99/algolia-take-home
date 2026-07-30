import { Pagination, useHits } from 'react-instantsearch';

import { BoardRow } from './board-row';
import { EmptyBoard } from './empty-board';
import { SCALE_CEILING, SCALE_FLOOR } from './rating-gauge';
import type { Restaurant } from '../lib/restaurant';

/**
 * The results board: a column header and a list of hairline-separated rows.
 *
 * Built on `useHits` rather than the `<Hits>` widget because every cell here is custom, and fighting
 * the widget's default classes costs more than rendering the markup.
 *
 * The header exists so the columns are named once rather than guessed at. On a timetable the column
 * labels are what turn a grid of numbers into information.
 */
export function ResultsBoard() {
  const { items } = useHits<Restaurant>();

  if (items.length === 0) {
    return <EmptyBoard />;
  }

  return (
    <section aria-label="Results">
      <BoardHeader />
      <ol>
        {items.map((hit) => (
          <BoardRow key={hit.objectID} hit={hit} />
        ))}
      </ol>

      {/* Inside the populated branch on purpose: pagination belongs to a list of results, and
          rendering "‹ 1 ›" under a no-results message invites the diner to page through nothing. */}
      <div className="py-6">
        <Pagination
          classNames={{
            list: 'flex flex-wrap gap-1 font-mono text-xs',
            item: 'min-h-11 min-w-11',
            link: 'flex size-full min-h-11 min-w-11 items-center justify-center rounded-sm border border-hairline hover:border-signal hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
            selectedItem: '[&_a]:border-signal [&_a]:bg-signal [&_a]:text-porcelain',
            disabledItem: 'opacity-40',
          }}
        />
      </div>
    </section>
  );
}

/** Tracked uppercase mono, per the signage grammar. Hidden on small screens, where rows restack. */
function BoardHeader() {
  return (
    <div
      aria-hidden="true"
      className="hidden items-center gap-4 border-b border-ink py-2 font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase sm:flex"
    >
      {/* The gauge's non-zero baseline is stated here, once. A bar with an undisclosed floor
          overstates differences; disclosed, it is an instrument scale. */}
      <span className="w-[104px] shrink-0">
        Adj rating {SCALE_FLOOR.toFixed(1)}–{SCALE_CEILING.toFixed(1)}
      </span>
      <span className="w-10 shrink-0">Type</span>
      <span className="min-w-0 flex-1">Restaurant</span>
      <span className="w-[42px] shrink-0">Price</span>
      <span className="w-[88px] shrink-0">Reviews</span>
      <span className="w-[104px] shrink-0" />
    </div>
  );
}
