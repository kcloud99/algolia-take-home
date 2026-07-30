/**
 * Turns a restaurant's place fields into one readable line.
 *
 * Measured over the 5,000 records: **2,500 (50.0%) have `neighborhood` exactly equal to `city`**, and
 * a further 264 (5.3%) name the city inside the neighborhood — "NE Portland" in Portland, "Downtown
 * Orlando" in Orlando. Printing both fields unconditionally gives "Plano, Plano" on half the index,
 * which reads as a rendering bug and undermines every other number on the row.
 *
 * Three rules, in order:
 *
 * 1. Neighborhood equals city → the city alone.
 * 2. Neighborhood already contains the city as a word → the neighborhood alone, since it is the more
 *    specific of the two and already says where it is.
 * 3. Otherwise → both, most specific first.
 *
 * The state is always appended. The dataset holds 948 cities across 51 areas with repeated names, so
 * "Carbondale" on its own is ambiguous where "Carbondale, CO" is not — and once rule 1 has collapsed
 * half the rows to a bare city name, that ambiguity would be the common case rather than the rare one.
 *
 * Two records carry the state *inside* the neighborhood — "Camas / Washougal, WA" and "Somers, NY" —
 * which appended a second copy. Stripping it from the input first, rather than de-duplicating the
 * output, keeps one composition path for all 5,000 rows instead of a rule plus an exception.
 */
export function formatLocality({
  neighborhood,
  city,
  state,
}: {
  neighborhood: string;
  city: string;
  state: string;
}): string {
  const parts = [placeExpression(stripTrailingState(neighborhood, state), city), state].filter(Boolean);
  return parts.join(', ');
}

/** Removes a trailing ", WA" from a neighborhood, but only when it repeats the record's own state. */
function stripTrailingState(neighborhood: string, state: string): string {
  if (!state) {
    return neighborhood;
  }
  const escaped = state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return neighborhood.replace(new RegExp(`\\s*,\\s*${escaped}\\s*$`, 'i'), '');
}

/**
 * Abbreviations the two fields spell inconsistently, expanded **for comparison only** — never for
 * display, so "Mt. Lebanon" is still shown as written.
 *
 * 12 records (0.24%) differ between `neighborhood` and `city` by nothing but one of these: Mt. Lebanon
 * against Mount Lebanon, St. Helena against Saint Helena, Fort Lauderdale against Ft. Lauderdale. That
 * is a small enough share to ignore, except that one of them is Atria's — Mt. Lebanon, which appears
 * in the chain query this demo is built around, rendering as "Mt. Lebanon, Mount Lebanon, PA".
 *
 * Kept to three entries on purpose. A general place-name normaliser is a much bigger idea than the
 * problem, and every entry added is a chance to collapse two places that are genuinely different.
 */
const ABBREVIATIONS: Record<string, string> = { mt: 'mount', st: 'saint', ft: 'fort' };

function comparable(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(' ');
}

function placeExpression(neighborhood: string, city: string): string {
  const trimmedNeighborhood = neighborhood.trim();
  const trimmedCity = city.trim();

  if (comparable(trimmedNeighborhood) === comparable(trimmedCity)) {
    return trimmedCity;
  }
  if (containsWord(trimmedNeighborhood, trimmedCity)) {
    return trimmedNeighborhood;
  }
  return `${trimmedNeighborhood}, ${trimmedCity}`;
}

/**
 * Whole-word containment, not a bare substring test. "Ada" must not be treated as already named by
 * "Adams Morgan", which is the kind of false positive that silently drops a city from the page.
 */
function containsWord(haystack: string, needle: string): boolean {
  if (!needle) {
    return false;
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}
