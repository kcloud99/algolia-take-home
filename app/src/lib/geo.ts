import type { PlainSearchParameters } from 'algoliasearch-helper';
import type { Hit } from 'instantsearch.js';

import type { Market } from './markets';
import type { Restaurant } from './restaurant';

/** Where the board is currently ranked from. See `use-search-centre.ts` for how one is chosen. */
export type SearchCentre =
  | { kind: 'market'; market: Market }
  /** A precise position from the browser's Geolocation API. */
  | { kind: 'device'; lat: number; lng: number }
  /** `aroundLatLngViaIP` — the engine derives the centre from the request IP, so we never learn it. */
  | { kind: 'network' }
  /** Geo off: the board reverts to pure textual relevance plus quality. */
  | { kind: 'none' };

/**
 * **The headline relevance decision of this build, and the one worth defending cold.**
 *
 * Distance is the *second* criterion in Algolia's tie-breaking formula, which means it runs before
 * `words`, `proximity`, `attribute`, `exact` and the whole of `customRanking`. At Algolia's default
 * granularity the geo criterion is effectively a strict distance sort, so **every signal below it is
 * dead** — including the Bayesian rating the pipeline exists to produce. Bucketing distance makes
 * nearby restaurants *tie* on geo, which is what lets quality decide inside the bucket. That is the
 * difference between "nearest at any cost" and "nearby **and** good".
 *
 * These three numbers were measured rather than inherited, and the measurement changed them. The
 * project's design docs specified 250 / 1,000 / 5,000 m; against the live index that performs
 * *identically to no bucketing at all* in a dense market, because 250 m in Midtown Manhattan is one
 * block and the records inside it still do not tie. The empty query from New York opened on The Long
 * Room (adjusted 4.2, 126 reviews) either way. Widening the first bucket to 1.5 km — a 15-to-20
 * minute walk, which is what "walking distance" actually means — opens the same board on Le Bernardin
 * (4.7, 4,232 reviews) and lifts the mean adjusted rating of the top 10 from 4.16 to 4.56.
 *
 * The graduation earns its keep at the other end, and that is measurable too. Coarsening to 25 km
 * buckets far out means distant restaurants tie with each other, so quality orders them: from the
 * three-restaurant Arkansas market, the Little Rock cluster 220–240 km away comes back best-rated
 * first, where a flat bucket returns it in raw distance order. Evidence in `docs/relevance-testing.md`.
 */
export const AROUND_PRECISION = [
  { from: 0, value: 1500 }, // within a walk: everything walkable ties, quality decides
  { from: 5000, value: 5000 }, // across town: 5 km rings
  { from: 25000, value: 25000 }, // another city: 25 km rings, so quality orders the tail
];

/**
 * The geo half of the search parameters, for `<Configure>`.
 *
 * These are query parameters rather than index settings on purpose: the centre changes per diner and
 * per session, and `distinct` and geo are the two things one index has to serve both personas with.
 *
 * `aroundRadius: "all"` is not a detail. It removes the distance cutoff while keeping distance in the
 * ranking, and this dataset needs it: coverage is lopsided enough that whole states hold three
 * records, so a fixed radius returns an empty page across most of the country. With `"all"`, a
 * three-restaurant market shows its three and then radiates outward — which is what graceful
 * degradation means here.
 *
 * `getRankingInfo` is **not** here, though the distance label needs it. It moved up to `App`, because a
 * second thing came to depend on it — the notice that says when nothing on the board is spelled the way
 * the diner typed it, which reads `nbTypos`. Requesting ranking evidence is an app-wide decision rather
 * than a geo detail, and tying it to the location control would have meant a notice that silently stopped
 * working when a diner chose "Anywhere in the US".
 */
export function geoSearchParameters(centre: SearchCentre): PlainSearchParameters {
  if (centre.kind === 'none') {
    return {};
  }

  const around: PlainSearchParameters =
    centre.kind === 'network'
      ? { aroundLatLngViaIP: true }
      : {
          aroundLatLng:
            centre.kind === 'device'
              ? `${centre.lat},${centre.lng}`
              : `${centre.market.lat},${centre.market.lng}`,
        };

  return {
    ...around,
    aroundRadius: 'all',
    // `algoliasearch-helper`'s types still declare `aroundPrecision` as a single number; the graduated
    // array has been part of the API for years and the engine applies it. Verified rather than
    // assumed: `_rankingInfo.geoPrecision` comes back as 250 / 1000 / 5000 on the same page when the
    // three-band form is sent, which is the engine reporting which band it used per record.
    aroundPrecision: AROUND_PRECISION as unknown as number,
  };
}

/**
 * How far this restaurant is from the centre the engine used, in metres — or `null` when geo is off.
 *
 * **Read from `matchedGeoLocation.distance`, not from `geoDistance`, and that is the whole point of
 * this function.** `geoDistance` is not a distance once `aroundPrecision` is set: it is the *bucket
 * ordinal* the geo criterion sorted on. Measured from New York with the graduated buckets, the Ruth's
 * Chris in Pittsburgh — 509 km away — reports `geoDistance: 10099`. Printing that as a distance would
 * put "6 mi" beside a restaurant in another state. `matchedGeoLocation.distance` stays the true
 * distance under every bucketing we tested, agreeing with a haversine check to within 0.1%.
 *
 * The bucket ordinal is still the interesting number — it is literally what the engine ranked on — but
 * it belongs in a "why is this result here?" panel, not in a row a diner reads.
 */
export function hitDistance(hit: Hit<Restaurant>): number | null {
  return hit._rankingInfo?.matchedGeoLocation?.distance ?? null;
}

const METRES_PER_MILE = 1609.344;

/** Miles, because the dataset is entirely US. Precise while it matters, rounded once it does not. */
export function formatDistance(metres: number): string {
  const miles = metres / METRES_PER_MILE;

  if (miles < 0.1) {
    return '<0.1 mi';
  }
  return miles < 10
    ? `${miles.toFixed(1)} mi`
    : `${Math.round(miles).toLocaleString()} mi`;
}
