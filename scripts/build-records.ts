/**
 * Builds the Algolia records from the two source files.
 *
 * Run with `npm run data:build`. Each stage prints a short summary so the output can be
 * checked against the numbers in docs/data-decisions.md without opening the JSON.
 */
import { assertCleanJoin, joinOnObjectId } from './lib/join.js';
import { loadCsvRows, loadJsonRestaurants } from './lib/load-sources.js';

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
