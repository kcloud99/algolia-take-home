/**
 * Builds the Algolia records from the two source files.
 *
 * Run with `npm run data:build`. Each stage prints a short summary so the output can be
 * checked against the numbers in docs/data-decisions.md without opening the JSON.
 */
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

function countBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
