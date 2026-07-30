import type { Hit } from 'instantsearch.js';

import { formatDistance } from '../lib/geo';
import type { Restaurant } from '../lib/restaurant';

/**
 * Why this result is here — the ranking criteria that decided it, in the order the engine applies them.
 *
 * This is the answer to the one question an Elasticsearch team asks that nothing else in this app answers:
 * *how* did it rank. Algolia does not compute a score, it walks an ordered list of criteria and each one
 * only reorders what the one before it left tied. That is the single most important thing to convey to a
 * team used to tuning a scoring function — and a line per row makes it readable instead of assertable.
 * Compare two adjacent rows and the first column where they differ is the criterion that decided them.
 *
 * It costs no extra request. `getRankingInfo` is already on for every query, because the distance label and
 * the no-exact-match notice both read it, so this renders data the response already carried.
 *
 * **`geo` prints two numbers on purpose, and this is the finding it exists to make visible.** Once
 * `aroundPrecision` is set, `_rankingInfo.geoDistance` is not a distance — it is the bucket ordinal the geo
 * criterion sorted on. The Ruth's Chris in Pittsburgh, 509 km from New York, reports 10099. So the ordinal
 * is labelled as the sort key and the true distance is shown beside it: two rows with the same ordinal are
 * *tied* on geo no matter how far apart they are, which is exactly what bucketing buys and exactly what a
 * single number would hide.
 *
 * `custom` is last because it is last: `bayesian_rating` then `popularity_score`, the two values the
 * pipeline exists to produce, and the two that only ever get to speak when everything above them ties.
 */
export function RankingEvidence({ hit }: { hit: Hit<Restaurant> }) {
  const info = hit._rankingInfo;

  if (!info) {
    return null;
  }

  const geoOrdinal = info.matchedGeoLocation ? info.geoDistance : null;

  return (
    <dl className="order-8 basis-full overflow-x-auto border-l-2 border-amber bg-porcelain px-3 py-1.5 font-mono text-[0.625rem] whitespace-nowrap text-steel">
      <Criterion label="1 typo" value={info.nbTypos} />
      <Criterion
        label="2 geo"
        value={
          geoOrdinal === null
            ? 'off'
            : `bucket ${geoOrdinal.toLocaleString()} · ${formatDistance(info.matchedGeoLocation!.distance)}`
        }
      />
      <Criterion label="3 words" value={info.words} />
      <Criterion label="4 filters" value={info.filters} />
      <Criterion label="5 prox" value={info.proximityDistance ?? '—'} />
      {/* The attribute criterion has no per-hit figure in `_rankingInfo`; it is decided by which line of
          `searchableAttributes` matched, which the response does not report. Said rather than skipped. */}
      <Criterion label="6 attribute" value="not reported" />
      <Criterion label="7 exact" value={info.nbExactWords} />
      <Criterion
        label="8 custom"
        value={`adj ${hit.bayesian_rating.toFixed(1)} · pop ${hit.popularity_score}`}
      />
    </dl>
  );
}

/** One criterion, as a term and its value, inline so the whole formula reads as one line. */
function Criterion({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="mr-4 inline-block">
      <dt className="inline tracking-[0.08em] uppercase">{label}</dt>{' '}
      <dd className="inline text-ink">{value}</dd>
    </span>
  );
}
