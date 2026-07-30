/**
 * The platform marker — a brand's location count, boxed, beside its name.
 *
 * This is the payoff of the chain work, and it only appears when the board is grouped. It answers the
 * question one collapsed row otherwise raises: *why is there only one Atria's?* Because there are eight,
 * and this is the one the ranking chose — with a location set, the nearest.
 *
 * The dark Ink surface is spent here on purpose. DESIGN.md's One Board Rule reserves it for live
 * information and names chain platforms as one of the three places it is allowed, which is what makes
 * the marker read as part of the board rather than as another tag.
 *
 * It leads the row's meta line rather than sitting beside the name. That was the second arrangement:
 * beside the name it took 90px from the one column that could least afford it, and the rows that carry a
 * marker are by definition the ones with the longest names — `McCormick & Schmick's Seafood - Pittsburgh
 * Downtown` lost its branch to make room, which is the exact information a diner searching a chain came
 * for.
 *
 * Deliberately **not** a link, and therefore deliberately without the directional arrow the design
 * sketch suggested: there is nothing to drill into yet, and an arrow that does not go anywhere is a
 * worse lie than a missing arrow. Making it the "show me all eight" gesture is a real feature and gets
 * its own decision.
 *
 * The count is `chain_location_count`, which is how many locations the *pipeline could group* under this
 * brand — not how many match the current search. Under a city filter it can exceed the rows on screen,
 * and it can undercount a real brand: McCormick & Schmick's reads 10 because three of its thirteen
 * records do not carry the location suffix the chain rule requires (`docs/data-decisions.md` §3). The
 * label therefore states a fact about the brand rather than about the result set.
 */
export function PlatformMarker({ brand, locations }: { brand: string; locations: number }) {
  return (
    <span
      className="shrink-0 rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[0.625rem] tracking-[0.08em] text-amber uppercase"
      title={`${brand} — ${locations} locations`}
      aria-label={`${brand} has ${locations} locations`}
    >
      {locations} locations
    </span>
  );
}
