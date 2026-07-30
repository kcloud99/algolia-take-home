/**
 * The review-volume meter.
 *
 * Review counts run 1 to 12,669 with a heavy tail — median 336, p90 1,355. On a linear bar, Mama's
 * Fish House at 12,669 fills it and everything else is a sliver, so the meter would distinguish one
 * restaurant from 4,999 others.
 *
 * The width comes from `popularity_score`, which the pipeline already derived as
 * `round(log10(reviews + 1) * 10)` and which runs 3 to 41 across the index. Reusing it rather than
 * recomputing a log here is deliberate: it is the same value in the index's `customRanking`, so the
 * bar a diner sees is literally the signal the engine ranked on.
 */

/** The observed maximum, so the busiest restaurant in the index fills the meter exactly. */
const MAX_POPULARITY = 41;

export function ReviewVolume({ reviews, popularity }: { reviews: number; popularity: number }) {
  const filled = Math.min(100, Math.max(2, (popularity / MAX_POPULARITY) * 100));

  return (
    <div className="w-[88px] shrink-0">
      <p className="font-mono text-xs">{reviews.toLocaleString()}</p>
      <div
        className="mt-1 h-1 bg-hairline"
        role="img"
        aria-label={`${reviews.toLocaleString()} reviews`}
      >
        <div className="h-full bg-steel" style={{ width: `${filled}%` }} />
      </div>
    </div>
  );
}
