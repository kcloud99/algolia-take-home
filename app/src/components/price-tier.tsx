/**
 * Price as filled dollar glyphs.
 *
 * Always three glyphs wide, with the inactive ones dimmed rather than absent, so the column stays
 * aligned down the board — a price cell that changes width breaks the timetable read.
 *
 * `price_tier` runs 2–4 rather than 1–3, because the source JSON never contains 1 and the pipeline
 * kept the source's numbering (see `docs/data-decisions.md` assumption 4). There are three bands, so
 * display subtracts one: the cheapest band gets one glyph, not two.
 *
 * The band string is the accessible label, because "$30 and under" is the fact and "$" is shorthand.
 */
const GLYPHS = 3;

export function PriceTier({
  tier,
  band,
  className = '',
}: {
  tier: number;
  band: string;
  className?: string;
}) {
  const filled = Math.min(GLYPHS, Math.max(1, tier - 1));

  return (
    <p className={`w-[42px] shrink-0 font-mono text-sm ${className}`} title={band} aria-label={band}>
      <span aria-hidden="true">
        <span>{'$'.repeat(filled)}</span>
        <span className="text-hairline">{'$'.repeat(GLYPHS - filled)}</span>
      </span>
    </p>
  );
}
