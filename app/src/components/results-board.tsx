import { Hits, Pagination, useStats } from 'react-instantsearch';

import { BoardRow } from './board-row';
import { EmptyBoard } from './empty-board';
import { SCALE_CEILING, SCALE_FLOOR } from './rating-gauge';
import type { Restaurant } from '../lib/restaurant';

/**
 * The results board: a column header, the rows, and pagination.
 *
 * Uses the stock `Hits` widget with `BoardRow` as its `hitComponent`, so the library owns the list and
 * this build only owns what a row looks like. An earlier version drove this from `useHits` and rendered
 * the `<ol>` by hand; the widget does that job, and dividing it this way means the only custom code is
 * the part that is genuinely custom.
 *
 * `Hits` has no empty state of its own — `emptyComponent` is a prop it manages internally — so the
 * zero-results board is switched in here off `nbHits`.
 */
const HITS_CLASSES = {
  list: '',
  item: 'flex items-center gap-4 border-b border-hairline py-3',
};

export function ResultsBoard() {
  const { nbHits } = useStats();

  if (nbHits === 0) {
    return <EmptyBoard />;
  }

  return (
    <section aria-label="Results">
      <BoardHeader />

      <Hits<Restaurant> hitComponent={BoardRow} classNames={HITS_CLASSES} />

      {/* Inside the populated branch on purpose: pagination belongs to a list of results, and rendering
          "‹ 1 ›" under a no-results message invites the diner to page through nothing. */}
      <div className="py-6">
        <Pagination classNames={PAGINATION_CLASSES} />
      </div>
    </section>
  );
}

const PAGINATION_CLASSES = {
  list: 'flex flex-wrap gap-1 font-mono text-xs',
  item: 'min-h-11 min-w-11',
  link: 'flex size-full min-h-11 min-w-11 items-center justify-center rounded-sm border border-hairline hover:border-signal hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
  selectedItem: '[&_a]:border-signal [&_a]:bg-signal [&_a]:text-porcelain',
  disabledItem: 'opacity-40',
};

/**
 * The column labels, in tracked uppercase mono per the signage grammar. Hidden below `sm`, where the
 * rows restack and a header row would describe a layout that is no longer there.
 */
function BoardHeader() {
  return (
    <div
      aria-hidden="true"
      className="hidden items-center gap-4 border-b border-ink py-2 font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase sm:flex"
    >
      {/* The gauge's non-zero baseline is stated here, once. A bar with an undisclosed floor overstates
          differences; disclosed, it is an instrument scale. */}
      <span className="w-[104px] shrink-0">
        Adj rating {SCALE_FLOOR.toFixed(1)}–{SCALE_CEILING.toFixed(1)}
      </span>
      <span className="w-10 shrink-0">Type</span>
      <span className="min-w-0 flex-1">Restaurant</span>
      <span className="w-[68px] shrink-0">Away</span>
      <span className="w-[42px] shrink-0">Price</span>
      <span className="w-[88px] shrink-0">Reviews</span>
      <span className="w-[104px] shrink-0" />
    </div>
  );
}
