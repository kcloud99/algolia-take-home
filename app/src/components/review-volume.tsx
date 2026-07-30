/**
 * The review count, with a log-scaled meter that says how that count compares.
 *
 * Review counts run 1 to 12,669 with a heavy tail — median 336, p90 1,355. On a linear meter, Mama's
 * Fish House at 12,669 fills it and everything else is a sliver, so it would distinguish one
 * restaurant from 4,999 others.
 *
 * The width comes from `popularity_score`, which the pipeline already derived as
 * `round(log10(reviews + 1) * 10)` and which runs 3 to 41 across the index. Reusing it rather than
 * recomputing a log here is deliberate: it is the same value in the index's `customRanking`, so the
 * meter a diner sees is literally the signal the engine ranked on.
 *
 * It sits inline in the entry's meta line rather than in a column of its own. As an 88px column it
 * was 4px tall and read as a smudge; at reading size beside the count it does the one job it has,
 * which is to say whether 4,232 is a lot.
 */

/** The observed maximum, so the busiest restaurant in the index fills the meter exactly. */
const MAX_POPULARITY = 41;

export function ReviewVolume({
  reviews,
  popularity,
  className = '',
}: {
  reviews: number;
  popularity: number;
  className?: string;
}) {
  const filled = Math.min(100, Math.max(3, (popularity / MAX_POPULARITY) * 100));

  /**
   * No display utility in the base class, deliberately. It used to carry `inline-flex`, and a caller
   * passing `hidden min-[880px]:inline-flex` then had two utilities setting `display` on one element —
   * which Tailwind resolves by its own stylesheet order, not by the order they are written. `hidden`
   * lost, and the line this component draws stayed visible on every phone. The caller owns display.
   */
  return (
    <span className={`items-center gap-2 ${className}`}>
      <span className="tabular">{reviews.toLocaleString()} reviews</span>
      {/* Hidden from assistive tech rather than labelled: the count it encodes is the text immediately
          before it, so a label here would announce the same number twice. */}
      <span className="h-[3px] w-8 shrink-0 bg-rule" aria-hidden="true">
        <span className="block h-full bg-graphite" style={{ width: `${filled}%` }} />
      </span>
    </span>
  );
}
