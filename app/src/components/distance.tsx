import { formatDistance } from '../lib/geo';

/**
 * How far this restaurant is from wherever the index is searching from.
 *
 * This is the value that makes the geo decision legible. Bucketed ranking is invisible in a list of
 * names — but a column reading 1 mi · 1 mi · 12 mi · 103 mi · 138 mi shows an index radiating outward
 * from a three-restaurant market, and a column that stays under two miles while the scores climb shows
 * "nearby **and** good" rather than "nearest". It is also the honest disclosure that results are
 * ordered by somewhere in particular.
 *
 * Always rendered, never conditionally dropped: the column has to align down the page, and a value
 * that vanishes when it is missing takes the rest of the line with it. With no location set there is
 * no distance to report and it renders an em dash — the truthful answer, since geo is then not in the
 * ranking either.
 */
export function Distance({ metres, className = '' }: { metres: number | null; className?: string }) {
  return (
    <span className={`tabular shrink-0 text-sm text-graphite ${className}`}>
      {metres === null ? '—' : formatDistance(metres)}
    </span>
  );
}
