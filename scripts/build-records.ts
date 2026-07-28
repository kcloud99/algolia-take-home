/**
 * Builds the Algolia records from the two source files.
 *
 * Run with `npm run data:build`. Each stage prints a short summary so the output can be
 * checked against the numbers in docs/data-decisions.md without opening the JSON.
 */
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
