/**
 * Chain identity.
 *
 * Exact-name matching finds almost no chains in this dataset — only 21 duplicate names, all
 * in different cities. The structure is hidden in the naming convention instead:
 * `Ruth's Chris Steak House - Waikiki`. Splitting on the separator recovers the brand, which
 * is what makes `distinct` grouping possible and answers the "chains with several locations
 * in one city are hard to disambiguate" pain point directly.
 */

/**
 * A dash **padded with whitespace on both sides**. The padding is the whole trick: a bare
 * hyphen is part of the name, not a separator, so `Café Des Beaux-Arts` and
 * `Dinosaur Bar-B-Que` survive intact. 46 names contain a bare hyphen of that kind.
 */
const BRAND_SEPARATOR = /\s+[-–—]\s+/;

export interface ChainFields {
  /** The brand, or null when this restaurant is not part of one. */
  chain_name: string | null;
  /** The branch label stripped from the name, e.g. `Waikiki`. Null when not a chain. */
  location_label: string | null;
  is_chain: boolean;
  /** How many restaurants share this brand. 1 for a standalone restaurant. */
  chain_location_count: number;
}

export interface ChainCandidate {
  base: string | null;
  locationLabel: string | null;
}

/**
 * Splits a name into a candidate brand and its branch label at the *first* separator, so a
 * label that itself contains a dash is preserved verbatim in the tail.
 */
export function splitChainCandidate(name: string): ChainCandidate {
  const match = BRAND_SEPARATOR.exec(name);
  if (match === null) {
    return { base: null, locationLabel: null };
  }
  return {
    base: name.slice(0, match.index).trim(),
    locationLabel: name.slice(match.index + match[0].length).trim(),
  };
}

/** How often each candidate brand appears across the whole dataset. */
export function countChainCandidates(names: string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const name of names) {
    const { base } = splitChainCandidate(name);
    if (base !== null) {
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * A candidate becomes a real brand only when it occurs at least twice. That threshold is what
 * keeps one-off restaurants that happen to use a dash — `Zodiac at Neiman Marcus - Downtown
 * Dallas` — out of the chain logic, since a brand of one is not a brand.
 */
export function deriveChainFields(
  name: string,
  candidateCounts: ReadonlyMap<string, number>,
): ChainFields {
  const { base, locationLabel } = splitChainCandidate(name);
  const count = base === null ? 0 : (candidateCounts.get(base) ?? 0);

  if (base === null || count < 2) {
    return { chain_name: null, location_label: null, is_chain: false, chain_location_count: 1 };
  }

  return {
    chain_name: base,
    location_label: locationLabel,
    is_chain: true,
    chain_location_count: count,
  };
}
