/**
 * One row per brand, or one row per restaurant.
 *
 * A toggle rather than a permanent setting, because the two personas want opposite things from the same
 * index. Someone typing a brand name wants one row and a way to pick the branch; someone browsing
 * steakhouses near them wants to see the actual restaurants. `distinct` is a *query* parameter, so one
 * index serves both — the only index-side requirement is `attributeForDistinct: chain_name`, which is
 * already configured.
 *
 * Off by default, matching the index setting: browsing is the more common arrival, and grouping is the
 * deliberate act of someone who already knows the brand.
 *
 * A checkbox rather than a switch, styled to match the facet checkboxes in the signage panel — it does
 * the same kind of job, and the diner should not have to learn two controls.
 *
 * **Two things grouping does to the rest of the board, both measured, neither hidden.**
 *
 * Facet counts stay counts of *records*, not of groups, because that is when the engine computes them.
 * So a grouped `atrias` reads "1 result" beside a rail offering "Casual Elegant 6". It is consistent
 * once you know grouping is on — the six records are real, and refining to them still returns one row
 * per brand — and the toggle saying so is visible in the same strip.
 *
 * `facetingAfterDistinct: true` fixes exactly that and is **deliberately not set**. Algolia's own note
 * on the parameter is the reason: it is only correct when every record in a group shares the group's
 * facet values, and ours do not — Atria's is six Casual Elegant and two Casual Dining. With it on, the
 * rail offers `{Casual Dining: 1}` and stops offering Casual Elegant at all, even though refining to
 * Casual Elegant works and returns a different, closer branch. A facet value that would have worked but
 * is no longer on screen is a worse failure than a count that needs context.
 */
export function GroupingToggle({
  grouped,
  onChange,
}: {
  grouped: boolean;
  onChange: (grouped: boolean) => void;
}) {
  return (
    <label
      className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 sm:min-h-9"
      title="Show one entry per restaurant brand, choosing the best-ranked location"
    >
      <input
        type="checkbox"
        checked={grouped}
        onChange={(event) => onChange(event.target.checked)}
        className="facet-box"
      />
      <span
        className={`text-[0.6875rem] font-semibold tracking-[0.1em] uppercase ${grouped ? 'text-brand-deep' : 'text-graphite'}`}
      >
        Group chains
      </span>
    </label>
  );
}
