import { useCurrentRefinements, useRefinementList, useStats } from 'react-instantsearch';

import { CuisineTile } from './cuisine-tile';
import { humanizeTag } from '../lib/labels';

/**
 * Discovery — the board's arrival state, not a second page.
 *
 * The explorer persona is half the assignment: someone with no restaurant in mind, whose complaint about
 * the current product is that there is no way to browse or be inspired. The answer here is deliberately
 * *not* a landing page. An empty query already returns the 24 best-ranked restaurants in the country —
 * that is what the Bayesian rating was built for — so the board is already a good answer. What it lacks is
 * a way in, and two chip rows above the same board supply it: pick a cuisine, or pick an occasion.
 *
 * No second route, no separate surface to design and maintain, and nothing to navigate back from. That was
 * a scope decision taken at the start of the phase and written down in `docs/build-plan.md`.
 *
 * **Shown only on arrival** — an empty query with nothing refined. Once a diner has typed or refined, they
 * have a direction, and a row of alternatives above their results is clutter competing with the signage
 * panel that already offers the same values.
 */

/**
 * Eight of the 23 groups — 81.4% of the index, and the same eight the signage panel shows before its
 * show-more, so the two surfaces agree on what "the main cuisines" are.
 *
 * Twelve was tried first and rejected on the render. Chip widths vary with the label, so twelve wrapped to
 * three rows and left `Asian` orphaned on the last one, and the whole block pushed the first board row
 * more than 300px down the page. The board is already the good answer to an empty query; the chips are the
 * way in, and a way in should not bury what it leads to.
 */
const CUISINE_CHIPS = 8;

export function DiscoveryHeader() {
  const { query } = useStats();
  const { items: refinements } = useCurrentRefinements();

  const isArrival = query.trim() === '' && refinements.length === 0;

  if (!isArrival) {
    return null;
  }

  return (
    <section className="mb-8 space-y-6" aria-label="Browse">
      <CuisineChips />
      <MoodChips />
    </section>
  );
}

/**
 * Cuisine as the primary way in, using the same drawn tile the board rows use.
 *
 * Reusing `CuisineTile` is the point rather than a shortcut: the mark a diner picks here is the mark they
 * then scan down the results column, so the chip teaches the encoding at the moment it starts mattering.
 *
 * No counts, and that is a choice. A chip row is an invitation, not a filter list — numbers in a wrapping
 * row do not form a column, so they would break the Tabular Rule rather than serve it, and the board's
 * readout gives the count the instant a chip is clicked.
 *
 * This mounts a second `useRefinementList` on `cuisine_group`, which the signage panel also renders. That
 * is supported and intended — `future.preserveSharedStateOnUnmount` exists for exactly the case of one
 * facet appearing in two places — and it keeps this surface self-sufficient rather than depending on a
 * panel that a phone hides. It is not the duplication `facet-panel.tsx` avoids: that wrapper is
 * attribute-agnostic and has no attribute to ask about.
 */
function CuisineChips() {
  const { items, refine } = useRefinementList({ attribute: 'cuisine_group', limit: CUISINE_CHIPS });

  return (
    <div>
      <SectionLabel>Browse by cuisine</SectionLabel>

      {/* One scrolling line on a phone, wrapping from `sm` up. Wrapped, the two rows cost over 900px
          before a single result — two full screens of chips on a 844px phone. DESIGN.md's own answer for
          content wider than the viewport is a container that scrolls inside itself rather than a page that
          scrolls sideways, and a swipeable chip rail is what a phone expects here anyway. The chip clipped
          at the right edge is the affordance; overlay scrollbars are transient and take no layout space.

          The rail deliberately does not bleed to the screen edge. A `-mx-4 px-4` version measured with its
          first chip at x=0 — a horizontally scrolling flex container drops the leading padding — so the
          first chip lost its left border to the viewport edge. Staying inside the content box is correct
          and one rule shorter than fighting it. */}
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {items.map((item) => (
          <li key={item.value} className="shrink-0">
            <button
              type="button"
              onClick={() => refine(item.value)}
              className="flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-sm border border-hairline bg-porcelain py-1 pr-3 pl-1 text-sm hover:border-signal hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              <CuisineTile group={item.value} size="sm" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The occasion row, over `vibe_tags`.
 *
 * This is the axis the dataset does not ship and the explorer persona needs — the fields OpenTable gave us
 * describe what a restaurant *is*, never what it is *for*. The tags are the pipeline's inference from
 * dining style, price, rating and review volume, and `docs/data-decisions.md` says so plainly rather than
 * presenting them as data.
 *
 * Order comes from the index's `renderingContent`, the same as the panel's, so the two agree without this
 * file holding an opinion about which mood matters most.
 */
function MoodChips() {
  const { items, refine } = useRefinementList({ attribute: 'vibe_tags' });

  return (
    <div>
      <SectionLabel>In the mood for</SectionLabel>

      {/* One scrolling line on a phone, wrapping from `sm` up. Wrapped, the two rows cost over 900px
          before a single result — two full screens of chips on a 844px phone. DESIGN.md's own answer for
          content wider than the viewport is a container that scrolls inside itself rather than a page that
          scrolls sideways, and a swipeable chip rail is what a phone expects here anyway. The chip clipped
          at the right edge is the affordance; overlay scrollbars are transient and take no layout space.

          The rail deliberately does not bleed to the screen edge. A `-mx-4 px-4` version measured with its
          first chip at x=0 — a horizontally scrolling flex container drops the leading padding — so the
          first chip lost its left border to the viewport edge. Staying inside the content box is correct
          and one rule shorter than fighting it. */}
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {items.map((item) => (
          <li key={item.value} className="shrink-0">
            <button
              type="button"
              onClick={() => refine(item.value)}
              className="flex min-h-11 shrink-0 snap-start items-center rounded-sm border border-hairline bg-porcelain px-3 text-sm hover:border-signal hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {humanizeTag(item.label)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tracked uppercase mono, with more space above than below it — the signage grammar for a section label. */
function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mb-3 font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">{children}</h2>
  );
}
