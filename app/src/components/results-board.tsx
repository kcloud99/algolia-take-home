import { Hits, Pagination, useStats } from 'react-instantsearch';

import { BoardRow } from './board-row';
import { EmptyBoard } from './empty-board';
import { SCALE_CEILING, SCALE_FLOOR } from './rating-gauge';
import { useBoard } from '../lib/board-context';
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
/**
 * The row wraps below `sm` and does not above it.
 *
 * At 390px the fixed cells add up to 543px against 358px of row, so the single line silently squeezed the
 * one cell that is allowed to shrink — the name — down to nothing. Every phone row rendered a rating, a
 * tile, a distance, a price and a review count for a restaurant it never named.
 *
 * `flex-wrap` plus `order` on the cells restacks it into three reading lines without a second component:
 * tile and name first, then the meta line inside that block, then the gauge, distance, price and Reserve.
 * DESIGN.md asks for two lines and was written before the distance column and the platform marker existed;
 * three keeps its actual requirement, which is that each line stays column-aligned across rows.
 *
 * **The row stays `flex-wrap` at every width**, and an earlier `min-[880px]:flex-nowrap` had to come out.
 * Above 880px the cells never wrap on their own — they sum to 543px and the name shrinks to fill — so the
 * only thing wrapping is a child that asks to, which is exactly what the ranking-evidence footnote does with
 * `basis-full`. With `nowrap` it could not, so it rendered as a very wide *inline* cell and crushed every
 * name on the board to four characters. The name's `basis-0` above 880px is what keeps a long name from
 * triggering a wrap of its own: flexbox decides line breaks from hypothetical sizes before it shrinks
 * anything, so a content-sized basis would break the row.
 */
const HITS_CLASSES = {
  list: '',
  item: 'flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-hairline py-3 min-[880px]:gap-4',
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
    // Not `aria-hidden` any more: the column labels are decorative, but the toggle in the last cell is a
    // real control and hiding it from assistive tech to keep the labels quiet is the wrong trade.
    <div className="hidden items-center gap-4 border-b border-ink py-2 font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase min-[880px]:flex">
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
      {/* The trailing spacer over the Reserve column, spent on the one control that belongs with the board's
          metadata rather than with the diner's controls. "Why is this result here?" is a question about the
          engine, so it sits among the column labels and not beside Sort.

          Desktop only, and by construction rather than by choice: this whole header is hidden below 880px,
          where the row stacks. A ranking-criteria footnote per row is a debrief tool read on a laptop. */}
      <span className="flex w-[104px] shrink-0 justify-end">
        <ExplainToggle />
      </span>
    </div>
  );
}

function ExplainToggle() {
  const { explain, toggleExplain } = useBoard();

  return (
    <button
      type="button"
      onClick={toggleExplain}
      aria-pressed={explain}
      title="Show the ranking criteria that placed each row"
      className={`font-mono text-[0.625rem] tracking-[0.08em] uppercase hover:text-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${explain ? 'text-signal' : 'text-steel'}`}
    >
      {explain ? 'Hide why' : 'Why?'}
    </button>
  );
}
