import { formatDistance } from '../lib/geo';

/**
 * How far this restaurant is from wherever the board is searching from.
 *
 * This is the column that makes the geo decision legible. Bucketed ranking is invisible in a list of
 * names — but a column reading 1 mi · 1 mi · 12 mi · 103 mi · 138 mi shows a board radiating outward
 * from a three-restaurant market, and a column that stays under two miles while the ratings climb shows
 * "nearby **and** good" rather than "nearest". It is also the honest disclosure that results are
 * ordered by somewhere in particular.
 *
 * Fixed width and always rendered, like every other cell on the row: the column has to align down the
 * page, and a cell that vanishes when a value is missing takes the rest of the row with it. With no
 * location set there is no distance to report and it renders an em dash — which is the truthful answer,
 * since geo is then not in the ranking either.
 */
export function Distance({ metres }: { metres: number | null }) {
  return (
    <p className="w-[68px] shrink-0 font-mono text-xs text-steel">
      {metres === null ? '—' : formatDistance(metres)}
    </p>
  );
}
