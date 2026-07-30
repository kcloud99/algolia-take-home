import { SortBy } from 'react-instantsearch';

import { indexName } from '../lib/search-client';

/**
 * The board's route selector, mapped onto the three virtual replicas configured in step 2.6.
 *
 * Names are derived from `indexName` rather than hardcoded, matching `scripts/configure-index.ts`, so
 * pointing the app at a scratch index picks up that index's own replicas instead of the demo's.
 *
 * Worth knowing before demoing it: **"Top rated" returns an identical top 5 to "Best match" on 21 of
 * the 27 test queries.** That is not a bug — the primary index's `customRanking` is already
 * `desc(bayesian_rating)`, so default relevance is quality-weighted and the sort mostly confirms it.
 * The control stays because diners look for it, and it does differ on the other six.
 */
export function SortControl() {
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">Sort</span>
      <SortBy
        items={[
          { value: indexName, label: 'Best match' },
          { value: `${indexName}_rating_desc`, label: 'Top rated' },
          { value: `${indexName}_reviews_desc`, label: 'Most reviewed' },
          { value: `${indexName}_price_asc`, label: 'Price: low to high' },
        ]}
        classNames={{
          select:
            'min-h-11 rounded-sm border border-hairline bg-porcelain px-2 py-1 text-sm sm:min-h-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
        }}
      />
    </label>
  );
}
