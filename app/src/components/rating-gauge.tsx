/**
 * The score — the guide's figure of merit for an entry.
 *
 * **Why the scale starts at 3.0.** Measured over all 5,000 records, `bayesian_rating` runs 3.3 to
 * 4.9, with p5 at 4.0 and p95 at 4.6 — 77% of restaurants sit between 4.2 and 4.5. On a 0-to-5 rule
 * every entry in the index would fill between 84% and 92%, which means the rule would carry no
 * information at all and would be decoration wearing the costume of a chart.
 *
 * A non-zero baseline is the classic way to overstate a difference, so it is **disclosed rather than
 * implied** — the index's column head states "score 3.0–5.0", and the raw star rating sits under
 * every figure so the correction is always visible as a correction.
 *
 * The previous version of this cell printed the same number three times: the figure, a ten-segment
 * battery meter, and the raw value. It was the densest cell on the page and the lowest in information
 * gain. What is left is one figure, one continuous rule carrying its position on the disclosed range,
 * and the raw value it was corrected from. The discrete ticks went with the segmented meter — they
 * existed to stop a reader over-reading precision, and the figure above them already carries the
 * precision exactly.
 *
 * The corrected rating is the primary figure and the raw stars are secondary, which is the whole
 * point of computing it — 89% of these restaurants sit in the 4-star bucket, and 15 of the 21 perfect
 * 5.0s come from fewer than 20 reviews.
 *
 * **It has two shapes and one implementation.** Above 880px it is a block in the index's left column,
 * where the figures align down the page. Below that the entry stacks and the score joins the last
 * reading line, so it lays out inline with a short rule and drops the raw caption — which is the one
 * piece of context a phone can do without, since the entry is no longer a column of anything.
 */

export const SCALE_FLOOR = 3.0;
export const SCALE_CEILING = 5.0;

export function RatingGauge({
  corrected,
  raw,
  className = '',
}: {
  corrected: number;
  raw: number;
  className?: string;
}) {
  const position = (corrected - SCALE_FLOOR) / (SCALE_CEILING - SCALE_FLOOR);
  // Clamped, and floored at a sliver rather than zero: an entry at the very bottom of the range still
  // has a score, and a rule that renders as nothing reads as missing data instead of a low value.
  const filled = Math.min(100, Math.max(3, position * 100));

  return (
    <div
      className={`flex shrink-0 items-center gap-2.5 min-[880px]:block min-[880px]:w-[92px] ${className}`}
    >
      <p className="tabular text-2xl leading-none font-semibold tracking-[-0.02em] min-[880px]:text-[1.875rem]">
        {corrected.toFixed(1)}
      </p>

      <div
        className="h-[3px] w-10 bg-rule-strong min-[880px]:mt-2.5 min-[880px]:w-full"
        role="img"
        aria-label={`Corrected score ${corrected.toFixed(1)} of 5, on a scale from ${SCALE_FLOOR.toFixed(1)}`}
      >
        <div className="h-full bg-brand" style={{ width: `${filled}%` }} />
      </div>

      {/* The scale floor is disclosed once in the column head rather than on every entry — repeated
          24 times it wrapped to a second line and made the column ragged. */}
      <p className="tabular hidden text-[0.6875rem] text-graphite min-[880px]:mt-2 min-[880px]:block">
        {raw.toFixed(1)} raw
      </p>
    </div>
  );
}
