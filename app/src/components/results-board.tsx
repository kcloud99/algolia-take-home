import { useHits, useStats } from 'react-instantsearch';

import { CuisineTile } from './cuisine-tile';
import type { Restaurant } from '../lib/restaurant';

/**
 * The results board, in its plainest form: proof that the index answers.
 *
 * Step 3.1 is deliberately unstyled beyond the token palette — the point of this step is that the
 * wiring is real and the tuned ranking is visibly coming back. The board row from DESIGN.md, with
 * its rating gauge and cuisine bullets, is step 3.2.
 *
 * Built on `useHits` rather than the `<Hits>` widget because every later step needs custom markup,
 * and fighting the widget's default classes costs more than rendering our own.
 */
export function ResultsBoard() {
  const { items } = useHits<Restaurant>();
  const { nbHits, processingTimeMS } = useStats();

  if (items.length === 0) {
    return <p className="py-8 text-steel">No restaurants matched that search.</p>;
  }

  return (
    <section>
      <p className="border-b border-hairline py-3 text-sm text-steel">
        {nbHits.toLocaleString()} restaurants · {processingTimeMS}ms
      </p>

      <ol>
        {items.map((hit) => (
          <li key={hit.objectID} className="flex items-center gap-3 border-b border-hairline py-3">
            <CuisineTile group={hit.cuisine_group} />
            <span>
              <span className="font-medium">{hit.name}</span>{' '}
              <span className="text-sm text-steel">
                {hit.cuisine_group} · {hit.neighborhood}, {hit.city} · {hit.price_range} ·{' '}
                {hit.bayesian_rating.toFixed(1)} corrected ({hit.stars_count} raw,{' '}
                {hit.reviews_count.toLocaleString()} reviews)
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
