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
 * One result, as a departure-board line.
 *
 * Column-aligned and separated by a hairline keyline rather than made into a card, which is the
 * difference between a board and a grid of tiles. Every fixed-width cell is fixed so the columns line
 * up down the page; only the name column is fluid, and it truncates rather than wrapping, because a
 * row that changes height breaks the scan.
 *
 * The order runs quality → cuisine → identity → price → volume → action, so the two signals a diner
 * uses to reject a row fast sit at the left edge where the eye already is.
 *
 * Rendered as the `hitComponent` of the `Hits` widget, which owns the list and the `<li>` around each
 * row — so this returns the row's contents, and the row's own layout classes live on the widget's
 * `item` class name.
 *
 * Takes `Hit<Restaurant>` rather than `Restaurant` because the distance lives in `_rankingInfo`, which
 * InstantSearch's `Hit` wrapper types and the index's own record shape does not. `sendEvent` comes from the
 * same place — `Hits` hands it to each row, already carrying the `queryID` and the row's position.
 */
export function BoardRow({ hit, sendEvent }: { hit: Hit<Restaurant>; sendEvent: SendEventForHits }) {
  const locality = formatLocality(hit);
  const { grouped, explain } = useBoard();

  return (
    <>
      {/* `order` is what restacks the row below 880px; above it the row does not wrap and order is inert.
          880px is measured, not chosen: the fixed cells come to 543px, so anything narrower leaves the
          name — the only cell allowed to shrink — unreadable. It was 105px at a 680px viewport.

          Reading order on a phone is name first, then what it is, then the numbers and the action, because
          a diner scrolling a list decides on the name and rejects on the distance. */}
      <RatingGauge corrected={hit.bayesian_rating} raw={hit.stars_count} className="order-3 min-[880px]:order-none" />

      <CuisineTile group={hit.cuisine_group} className="order-1 min-[880px]:order-none" />

      {/* min-w-0 is what lets the name truncate instead of forcing the row wider. The basis takes the rest
          of the first line on a phone — 100% less the 40px tile, its 8px gap and a little slack — so the
          name gets ~306px instead of the nothing it was left with. Measured: at 2.75rem the sum came to
          362px against a 358px row and the name wrapped to a line of its own, leaving the tile stranded. */}
      <div className="order-2 min-w-0 flex-1 basis-[calc(100%-3.25rem)] min-[880px]:order-none min-[880px]:basis-0">
        {/* h2, not h3: the strip's logo is the page's h1 and there is no level between them. `title`
            because the longest names here are chain branches, whose suffix is the whole point. */}
        <h2
          className="truncate font-display text-[1.375rem] leading-tight font-semibold"
          title={hit.name}
        >
          {hit.name}
        </h2>

        {/* The platform marker leads the meta line rather than sitting beside the name, and rendering it
            the other way is what showed why: chain branch names are the longest in the dataset, and
            `McCormick & Schmick's Seafood - Pittsburgh Downtown` lost its branch — the disambiguation
            the diner came for — to make room. The meta line was already the one designed to truncate,
            and leading it means the marker is the last thing to go rather than the first. */}
        <p className="flex min-w-0 items-center gap-2 text-sm text-steel">
          {grouped && hit.is_chain && hit.chain_name && (
            <PlatformMarker brand={hit.chain_name} locations={hit.chain_location_count} />
          )}
          <span className="truncate">
            {hit.cuisine_group} · {locality} · {hit.dining_style}
          </span>
        </p>
      </div>

      {/* Beside the locality rather than in its own place further right: distance qualifies *where*
          a restaurant is, and a diner rejects a row on how far it is before anything else here. */}
      <Distance metres={hitDistance(hit)} className="order-4 min-[880px]:order-none" />

      <PriceTier tier={hit.price_tier} band={hit.price_range} className="order-5 min-[880px]:order-none" />

      {/* The one cell a phone does without. The second line already carries the corrected rating and its
          raw sub-label, which is the quality story; the volume meter is desktop context, and keeping it
          would have pushed Reserve onto a fourth line. */}
      <ReviewVolume
        reviews={hit.reviews_count}
        popularity={hit.popularity_score}
        className="order-6 hidden min-[880px]:block"
      />

      {/* Deep-link out: there is no live inventory behind this, and pretending otherwise would be the
          one dishonest thing on the page.

          **Both events fire from this one action, and that is the honest mapping for this prototype.**
          There is no restaurant detail page here, so pressing Reserve is simultaneously the only
          engagement signal and the only booking intent. `click` is what Click Analytics, Dynamic
          Re-Ranking and Personalization all learn from; `conversion` named `Reservation Started` is the
          number the CPO actually asked about. In a real OpenTable flow they would separate — the click
          would be opening the restaurant, the conversion a completed booking — and until they do,
          click-through rate and conversion rate being identical here is a fact about the prototype rather
          than a distortion of the data. Worth saying out loud rather than letting someone find it. */}
      <a
        href={hit.reserve_url}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          sendEvent('click', hit, 'Restaurant Clicked');
          sendEvent('conversion', hit, 'Reservation Started');
        }}
        className="order-7 ml-auto flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-signal px-4 font-mono text-xs tracking-[0.08em] text-porcelain uppercase hover:bg-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal min-[880px]:ml-0"
      >
        Reserve <span aria-hidden="true">→</span>
      </a>

      {/* Last in the row and full width, so it reads as a footnote to the line above rather than another
          cell competing with it. */}
      {explain && <RankingEvidence hit={hit} />}
    </>
  );
}
