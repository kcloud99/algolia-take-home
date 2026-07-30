import type { Hit } from 'instantsearch.js';

import { CuisineTile } from './cuisine-tile';
import { Distance } from './distance';
import { PriceTier } from './price-tier';
import { RatingGauge } from './rating-gauge';
import { ReviewVolume } from './review-volume';
import { hitDistance } from '../lib/geo';
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
 * InstantSearch's `Hit` wrapper types and the index's own record shape does not.
 */
export function BoardRow({ hit }: { hit: Hit<Restaurant> }) {
  const locality = formatLocality(hit);

  return (
    <>
      <RatingGauge corrected={hit.bayesian_rating} raw={hit.stars_count} />

      <CuisineTile group={hit.cuisine_group} />

      {/* min-w-0 is what lets the name truncate instead of forcing the row wider. */}
      <div className="min-w-0 flex-1">
        {/* h2, not h3: the strip's logo is the page's h1 and there is no level between them. */}
        <h2 className="truncate font-display text-[1.375rem] leading-tight font-semibold">
          {hit.name}
        </h2>
        <p className="truncate text-sm text-steel">
          {hit.cuisine_group} · {locality} · {hit.dining_style}
        </p>
      </div>

      {/* Beside the locality rather than in its own place further right: distance qualifies *where*
          a restaurant is, and a diner rejects a row on how far it is before anything else here. */}
      <Distance metres={hitDistance(hit)} />

      <PriceTier tier={hit.price_tier} band={hit.price_range} />

      <ReviewVolume reviews={hit.reviews_count} popularity={hit.popularity_score} />

      {/* Deep-link out: there is no live inventory behind this, and pretending otherwise would be the
          one dishonest thing on the page. The Insights conversion event attaches in step 3.9. */}
      <a
        href={hit.reserve_url}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-signal px-4 font-mono text-xs tracking-[0.08em] text-porcelain uppercase hover:bg-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        Reserve <span aria-hidden="true">→</span>
      </a>
    </>
  );
}
