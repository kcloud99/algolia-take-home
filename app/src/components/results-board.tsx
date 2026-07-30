import { Hits, Pagination, useStats } from 'react-instantsearch';

import { BoardRow } from './board-row';
import { EmptyBoard } from './empty-board';
import { SCALE_CEILING, SCALE_FLOOR } from './rating-gauge';
import { useBoard } from '../lib/board-context';
import type { Restaurant } from '../lib/restaurant';

/**
 * The entry index: a column head, the entries, and pagination.
 *
 * Uses the stock `Hits` widget with `BoardRow` as its `hitComponent`, so the library owns the list and
 * this build only owns what an entry looks like. An earlier version drove this from `useHits` and
 * rendered the `<ol>` by hand; the widget does that job, and dividing it this way means the only custom
 * code is the part that is genuinely custom.
 *
 * `Hits` has no empty state of its own — `emptyComponent` is a prop it manages internally — so the
 * zero-results state is switched in here off `nbHits`.
 */

/**
 * The entry wraps below 880px and does not above it.
 *
 * At 390px the fixed cells add up to more than the row, so a single line silently squeezed the one cell
 * that is allowed to shrink — the name — down to nothing. Every phone entry rendered a score, a symbol,
 * a distance and a price for a restaurant it never named.
 *
 * `flex-wrap` plus `order` on the cells restacks it into three reading lines without a second component:
 * symbol and name first, then the meta line inside that block, then the score, price, distance and
 * Reserve.
 *
 * **The entry stays `flex-wrap` at every width**, and an earlier `min-[880px]:flex-nowrap` had to come
 * out. Above 880px the cells never wrap on their own — they sum to 252px and the name shrinks to fill —
 * so the only thing wrapping is a child that asks to, which is exactly what the ranking-evidence
 * footnote does with `basis-full`. With `nowrap` it could not, so it rendered as a very wide *inline*
 * cell and crushed every name on the index to four characters. The name's `basis-0` above 880px is what
 * keeps a long name from triggering a wrap of its own: flexbox decides line breaks from hypothetical
 * sizes before it shrinks anything, so a content-sized basis would break the entry.
 *
 * `group` is what lets Reserve and the cuisine symbol respond to the *entry* being hovered rather than
 * only themselves, and the negative margin is what lets the hover surface and the hairline rule bleed
 * past the text into the gutter — so a hovered entry reads as a band, not as a tinted paragraph.
 */
const HITS_CLASSES = {
  list: '',
  item: 'group relative -mx-4 flex flex-wrap items-start gap-x-5 gap-y-3 rounded-sm border-b border-rule px-4 py-4 transition-colors duration-[120ms] hover:bg-card',
};

export function ResultsBoard() {
  const { nbHits } = useStats();

  if (nbHits === 0) {
    return <EmptyBoard />;
  }

  return (
    <section aria-label="Results">
      <IndexHead />

      <Hits<Restaurant> hitComponent={BoardRow} classNames={HITS_CLASSES} />

      {/* Inside the populated branch on purpose: pagination belongs to a list of results, and rendering
          "‹ 1 ›" under a no-results message invites the diner to page through nothing. */}
      <div className="py-8">
        <Pagination classNames={PAGINATION_CLASSES} />
      </div>
    </section>
  );
}

const PAGINATION_CLASSES = {
  list: 'tabular flex flex-wrap gap-1.5 text-sm',
  item: 'min-h-11 min-w-11',
  link: 'flex size-full min-h-11 min-w-11 items-center justify-center rounded-sm border border-rule font-medium text-graphite transition-colors duration-[120ms] hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep',
  selectedItem: '[&_a]:border-ink [&_a]:bg-ink [&_a]:text-card',
  disabledItem: 'opacity-35 [&_a]:pointer-events-none',
};

/**
 * The column head. Hidden below 880px, where the entries restack and a head would describe a layout
 * that is no longer there.
 *
 * It carries exactly two things: the score's disclosed scale, and the one control that belongs with the
 * index's own metadata rather than with the diner's controls. Price and distance get no label — `$$$`
 * and `0.4 mi` explain themselves, and a label over each was two more words of chrome above a page
 * whose first job is to be read.
 */
function IndexHead() {
  return (
    // Not `aria-hidden`: the labels are decorative, but the toggle is a real control and hiding it from
    // assistive tech to keep the labels quiet is the wrong trade.
    <div className="hidden items-center gap-5 border-b border-ink pb-2.5 text-[0.6875rem] font-semibold tracking-[0.1em] text-graphite uppercase min-[880px]:flex">
      {/* 140px = the 92px score column plus the 20px gap plus the 28px symbol, so "Restaurant" lands
          exactly on the name below it. The gauge's non-zero baseline is stated here, once: a rule with
          an undisclosed floor overstates differences, and disclosed it is an instrument scale. */}
      <span className="tabular w-[140px] shrink-0">
        Score {SCALE_FLOOR.toFixed(1)}–{SCALE_CEILING.toFixed(1)}
      </span>
      <span className="min-w-0 flex-1">Restaurant</span>
      {/* "Why is this result here?" is a question about the engine, so it sits among the index's own
          labels and not beside Sort. Desktop only by construction: a ranking-criteria footnote per
          entry is a debrief tool read on a laptop. */}
      <ExplainToggle />
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
      title="Show the ranking criteria that placed each entry"
      className={`shrink-0 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase transition-colors duration-[120ms] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep ${explain ? 'text-brand-deep' : 'text-graphite'}`}
    >
      {explain ? 'Hide why' : 'Why?'}
    </button>
  );
}
