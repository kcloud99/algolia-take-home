/**
 * Builds the Algolia records from the two source files.
 *
 * Run with `npm run data:build`. Each stage prints a short summary so the output can be
 * checked against the numbers in docs/data-decisions.md without opening the JSON.
 */
import { countChainCandidates, deriveChainFields, splitChainCandidate } from './lib/chain.js';
import { CUISINE_GROUP_MEMBERS, deriveCuisineFields, splitCuisines } from './lib/cuisine.js';
import { assertCleanJoin, joinOnObjectId } from './lib/join.js';
import { loadCsvRows, loadJsonRestaurants } from './lib/load-sources.js';
import { normalizePhone, normalizePostalCode, normalizeScalars } from './lib/normalize-scalars.js';

const jsonRecords = loadJsonRestaurants();
const { rows: csvRows, trimmedFields } = loadCsvRows();

console.log(`sources: ${jsonRecords.length} json records, ${csvRows.length} csv rows`);
console.log(`csv fields trimmed of surrounding whitespace: ${trimmedFields}`);

const join = joinOnObjectId(jsonRecords, csvRows);
assertCleanJoin(join, jsonRecords.length);

const orphans = join.jsonOnly.length + join.csvOnly.length;
const dupes = join.duplicateJsonIds.length + join.duplicateCsvIds.length;

console.log(
  `joined ${join.joined.length}/${jsonRecords.length}, ${orphans} orphans, ${dupes} dupes`,
);

// ── scalars ────────────────────────────────────────────────────────────────
const scalars = join.joined.map((joined) => normalizeScalars(joined));

// Counted as "values the normalizer had to change", which is the honest definition
// of how much cleanup each field actually needed.
const zipsNormalized = join.joined.filter(
  ({ json }) => normalizePostalCode(json.postal_code) !== json.postal_code,
).length;
const phonesCleaned = join.joined.filter(
  ({ csv }) => normalizePhone(csv.phone_number) !== csv.phone_number,
).length;
const priceConflicts = scalars.filter((fields) => fields.price_conflict).length;
const conflictRate = ((priceConflicts / scalars.length) * 100).toFixed(1);

console.log(`zip+4 normalized: ${zipsNormalized}`);
console.log(`phone display values cleaned: ${phonesCleaned}`);
console.log(`price conflicts: ${priceConflicts} (${conflictRate}%)`);

// ── cuisine taxonomy ───────────────────────────────────────────────────────
const cuisineFields = join.joined.map(({ csv }) => deriveCuisineFields(csv.food_type));

const rawFoodTypes = new Set(join.joined.map(({ csv }) => csv.food_type));
const atomicCuisines = new Set(join.joined.flatMap(({ csv }) => splitCuisines(csv.food_type)));
const groupCounts = countBy(cuisineFields, (fields) => fields.cuisine_group);

console.log(
  `\ncuisines: ${rawFoodTypes.size} raw food_type values -> ` +
    `${atomicCuisines.size} atomic cuisines -> ${groupCounts.size} groups`,
);
for (const [group, count] of [...groupCounts].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${group.padEnd(26)}${String(count).padStart(5)}`);
  console.log(`      ${CUISINE_GROUP_MEMBERS[group].join(', ')}`);
}

// ── chain identity ─────────────────────────────────────────────────────────
const candidateCounts = countChainCandidates(join.joined.map(({ json }) => json.name));
const chains = join.joined.map(({ json }) => ({
  area: json.area,
  fields: deriveChainFields(json.name, candidateCounts),
}));

// The bare-hyphen guard, checked against the record that motivates it. A separator regex
// without whitespace padding would turn this into the brand "Café Des Beaux".
assertNotSplit('Café Des Beaux-Arts');
assertNotSplit('Dinosaur Bar-B-Que - Harlem', 'Dinosaur Bar-B-Que');

const chainMembers = chains.filter(({ fields }) => fields.is_chain);
const brands = new Set(chainMembers.map(({ fields }) => fields.chain_name));
// Brand and metro names both contain spaces, so the composite key is joined with a
// character that cannot occur in either.
const KEY_SEPARATOR = '\u0000';
const brandsPerArea = countBy(
  chainMembers,
  ({ area, fields }) => `${fields.chain_name}${KEY_SEPARATOR}${area}`,
);
const multiLocationMetroBrands = new Set(
  [...brandsPerArea]
    .filter(([, count]) => count >= 2)
    .map(([key]) => key.split(KEY_SEPARATOR)[0]),
);

console.log(
  `\nchains: ${brands.size} brands over ${chainMembers.length} restaurants; ` +
    `${multiLocationMetroBrands.size} brands with 2+ locations in one metro`,
);

const countsByBrand = countBy(chainMembers, ({ fields }) => fields.chain_name);
for (const [brand, count] of [...countsByBrand].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  const densestArea = [...countBy(
    chainMembers.filter(({ fields }) => fields.chain_name === brand),
    ({ area }) => area,
  )].sort((a, b) => b[1] - a[1])[0];
  console.log(
    `  ${String(count).padStart(3)}  ${String(brand).padEnd(32)}` +
      `densest metro: ${densestArea?.[0]} (${densestArea?.[1]})`,
  );
}

/** Fails the build if a name is treated as a chain, or split somewhere unintended. */
function assertNotSplit(name: string, expectedBase?: string): void {
  const { base } = splitChainCandidate(name);
  if (base !== (expectedBase ?? null)) {
    throw new Error(
      `chain separator split ${JSON.stringify(name)} into base ${JSON.stringify(base)}, ` +
        `expected ${JSON.stringify(expectedBase ?? null)}`,
    );
  }
}

function countBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
