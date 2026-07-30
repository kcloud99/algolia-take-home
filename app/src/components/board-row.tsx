import type { Hit } from 'instantsearch.js';
import type { SendEventForHits } from 'instantsearch.js/es/lib/utils';

import { CuisineTile } from './cuisine-tile';
import { Distance } from './distance';
import { PlatformMarker } from './platform-marker';
import { PriceTier } from './price-tier';
import { RankingEvidence } from './ranking-evidence';
import { RatingGauge } from './rating-gauge';
import { ReviewVolume } from './review-volume';
import { hitDistance } from '../lib/geo';
import { useBoard } from '../lib/board-context';
import { formatLocality } from '../lib/locality';
import type { Restaurant } from '../lib/restaurant';

/**
 * One result, as a guide entry.
 *
 * Three zones: the **score** in a fixed left column so the figures align down the page, the
 * **name block** — which is the entry, and the largest thing on it — and a right column carrying the
 * two facts a diner rejects on (price, distance) above the one action.
 *
 * DESIGN.md's Name-Dominates Rule is the load-bearing decision here. The previous version put a
 * saturated filled button in this position on every row, so a page of results was read as a column
 * of eight identical CTAs with restaurants attached. **Reserve is present, focusable and legible at
 * rest, and only fills with the accent once the diner is on the entry** — which is what an action
 * that has not been chosen yet should look like.
 *
 * Rendered as the `hitComponent` of the `Hits` widget, which owns the list and the `<li>` around each
 * entry — so this returns the entry's contents, and the entry's own layout classes live on the
 * widget's `item` class name.
 *
 * Takes `Hit<Restaurant>` rather than `Restaurant` because the distance lives in `_rankingInfo`, which
 * InstantSearch's `Hit` wrapper types and the index's own record shape does not. `sendEvent` comes from
 * the same place — `Hits` hands it to each entry, already carrying the `queryID` and its position.
 */
export function BoardRow({ hit, sendEvent }: { hit: Hit<Restaurant>; sendEvent: SendEventForHits }) {
  const locality = formatLocality(hit);
  const { grouped, explain } = useBoard();

  return (
    <>
      {/* `order` is what restacks the entry below 880px; above it the entry does not wrap and order is
          inert. 880px is measured, not chosen: the fixed cells come to 320px, so anything narrower
          leaves the name — the only cell allowed to shrink — unreadable.

          Reading order on a phone is name first, then what it is, then the numbers and the action,
          because a diner scrolling a list decides on the name and rejects on the distance. */}
      {/* First in the source so it leads the entry on desktop — the guide's score sits in the left
          margin, which is what puts the figures on one edge and lets the column be read on its own. */}
      <RatingGauge
        corrected={hit.bayesian_rating}
        raw={hit.stars_count}
        className="order-3 min-[880px]:order-none"
      />

      <CuisineTile
        group={hit.cuisine_group}
        className="order-1 mt-1 text-graphite transition-colors duration-[120ms] group-hover:text-ink min-[880px]:order-none"
      />

      {/* min-w-0 is what lets the name truncate instead of forcing the entry wider. The basis takes the
          rest of the first line on a phone — 100% less the symbol, its gap and a little slack — so the
          name gets the width rather than being squeezed to nothing beside a column it no longer has. */}
      <div className="order-2 min-w-0 flex-1 basis-[calc(100%-3rem)] min-[880px]:order-none min-[880px]:basis-0">
        {/* h2, not h3: the masthead's mark is the page's h1 and there is no level between them. `title`
            because the longest names here are chain branches, whose suffix is the whole point. */}
        {/* **It wraps below 880px and truncates above it**, and the asymmetry is the point. Truncating
            costs a chain branch its suffix — `Ruth's Chris Steak House - P…` — which is the exact
            disambiguation the known-item diner came for, and on a phone there is no column integrity
            left to protect anyway. Above 880px the entries are a column and a name that wraps would
            make the rows ragged, so there it truncates and `title` carries the rest.

            1.75rem, and 1.875rem was measured and rejected. The name column is 556px at the desktop
            measure; `Ruth's Chris Steak House - North Raleigh` needs ~560px at 30px and ~520px at 28px.
            The two point sizes are nearly indistinguishable, and the larger one costs the branch on
            every long chain entry — which is the one thing the known-item diner is here to read. */}
        <h2
          className="text-[1.375rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance min-[880px]:truncate min-[880px]:text-[1.75rem]"
          title={hit.name}
        >
          {hit.name}
        </h2>

        {/* The platform marker leads the meta line rather than sitting beside the name, and rendering it
            the other way is what showed why: chain branch names are the longest in the dataset, and
            `McCormick & Schmick's Seafood - Pittsburgh Downtown` lost its branch — the disambiguation
            the diner came for — to make room. The meta line was already the one designed to truncate,
            and leading it means the marker is the last thing to go rather than the first. */}
        <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-graphite">
          {grouped && hit.is_chain && hit.chain_name && (
            <PlatformMarker brand={hit.chain_name} locations={hit.chain_location_count} />
          )}
          <span className="truncate">
            {hit.cuisine_group} · {locality} · {hit.dining_style}
          </span>
        </p>

        {/* The one line a phone does without. Reserve has to stay on the third reading line, and the
            volume meter is desktop context — keeping it would push the action to a fourth. */}
        <ReviewVolume
          reviews={hit.reviews_count}
          popularity={hit.popularity_score}
          className="mt-1 hidden text-sm text-graphite min-[880px]:inline-flex"
        />
      </div>

      {/* Price, distance and the action, right-aligned so they land on one edge. On a phone this is the
          third reading line and lays out horizontally with Reserve pushed to the end. */}
      <div className="order-4 ml-auto flex items-center gap-4 min-[880px]:order-none min-[880px]:ml-0 min-[880px]:w-[132px] min-[880px]:flex-col min-[880px]:items-end min-[880px]:gap-3 min-[880px]:self-center">
        <p className="flex items-baseline gap-2">
          <PriceTier tier={hit.price_tier} band={hit.price_range} />
          <span aria-hidden="true" className="text-rule-strong">
            ·
          </span>
          <Distance metres={hitDistance(hit)} />
        </p>

        {/* Deep-link out: there is no live inventory behind this, and pretending otherwise would be the
            one dishonest thing on the page.

            **Both events fire from this one action, and that is the honest mapping for this prototype.**
            There is no restaurant detail page here, so pressing Reserve is simultaneously the only
            engagement signal and the only booking intent. `click` is what Click Analytics, Dynamic
            Re-Ranking and Personalization all learn from; `conversion` named `Reservation Started` is the
            number the CPO actually asked about. In a real OpenTable flow they would separate — the click
            would be opening the restaurant, the conversion a completed booking — and until they do,
            click-through rate and conversion rate being identical here is a fact about the prototype
            rather than a distortion of the data. Worth saying out loud rather than letting someone find it. */}
        <a
          href={hit.reserve_url}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            sendEvent('click', hit, 'Restaurant Clicked');
            sendEvent('conversion', hit, 'Reservation Started');
          }}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm border border-rule px-3.5 text-sm font-semibold text-ink transition-colors duration-[120ms] group-hover:border-brand-deep group-hover:bg-brand-deep group-hover:text-card hover:border-brand-deep hover:bg-brand-deep hover:text-card focus-visible:border-brand-deep focus-visible:bg-brand-deep focus-visible:text-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep min-[880px]:min-h-9"
        >
          Reserve <span aria-hidden="true">→</span>
        </a>
      </div>

      {/* Last in the entry and full width, so it reads as a footnote to the lines above rather than
          another cell competing with them. */}
      {explain && <RankingEvidence hit={hit} />}
    </>
  );
}
