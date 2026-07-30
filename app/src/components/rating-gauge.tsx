/**
 * The rating gauge — a segmented signage scale, not a row of stars.
 *
 * **Why the scale starts at 3.0.** Measured over all 5,000 records, `bayesian_rating` runs 3.3 to
 * 4.9, with p5 at 4.0 and p95 at 4.6 — 77% of restaurants sit between 4.2 and 4.5. On a 0-to-5 bar
 * every row in the index renders between 84% and 92% full, which means the gauge would carry no
 * information at all and would be decoration wearing the costume of a chart.
 *
 * Ten segments of 0.2 from 3.0 to 5.0 makes the differences that exist visible. The floor is drawn
 * and labelled rather than implied, because a bar with a hidden non-zero baseline is the classic way
 * to overstate a difference, and the honest version of that shape is an instrument scale: discrete
 * ticks, a stated start, and a number that carries the actual value.
 *
 * The corrected rating is the primary figure and the raw stars are secondary, which is the whole
 * point of computing it — 89% of these restaurants sit in the 4-star bucket, and 15 of the 21 perfect
 * 5.0s come from fewer than 20 reviews.
 */

export const SCALE_FLOOR = 3.0;
export const SCALE_CEILING = 5.0;
const SEGMENTS = 10;

/** Segments lit, rounded to the nearest whole segment so equal ratings always render identically. */
function litSegments(rating: number): number {
  const position = (rating - SCALE_FLOOR) / (SCALE_CEILING - SCALE_FLOOR);
  return Math.min(SEGMENTS, Math.max(0, Math.round(position * SEGMENTS)));
}

export function RatingGauge({ corrected, raw }: { corrected: number; raw: number }) {
  const lit = litSegments(corrected);

  return (
    <div className="w-[104px] shrink-0">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-xl leading-none font-medium">{corrected.toFixed(1)}</span>
        <span className="font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">adj</span>
      </div>

      <div
        className="mt-1.5 flex gap-px"
        role="img"
        aria-label={`Corrected rating ${corrected.toFixed(1)} of 5, on a scale from ${SCALE_FLOOR.toFixed(1)}`}
      >
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 ${index < lit ? 'bg-signal' : 'bg-hairline'}`}
          />
        ))}
      </div>

      {/* The scale floor is disclosed once in the column header rather than on every row — repeated
          24 times it wrapped to a third line and made the rows ragged. */}
      <p className="mt-1 font-mono text-[0.625rem] text-steel">{raw.toFixed(1)} raw</p>
    </div>
  );
}
