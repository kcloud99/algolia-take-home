/**
 * Uploads `data/out/records.json` to Algolia.
 *
 * Run with `npm run index:push`. This script writes records and nothing else — every index
 * setting lives in `scripts/configure-index.ts`, so data and configuration stay independently
 * reviewable and either can be re-run without touching the other.
 */
import { readFileSync } from 'node:fs';

import { client, indexName } from './lib/algolia.js';
import { paths } from './lib/paths.js';
import type { RestaurantRecord } from './lib/record.js';

const records = JSON.parse(readFileSync(paths.outRecords, 'utf8')) as RestaurantRecord[];
console.log(`read ${records.length} records from ${paths.outRecords}`);

// `replaceAllObjects` indexes into a temporary index and atomically moves it over the live one,
// so there is never a moment where a diner searches a half-populated index. It waits internally
// for every task it creates, including the final move, so the index is searchable on return —
// an extra `waitForTask` here would be a no-op.
const { batchResponses } = await client.replaceAllObjects({
  indexName,
  objects: records,
  batchSize: 1000,
});
console.log(`pushed to "${indexName}" in ${batchResponses.length} batches`);

// Verify against the live index rather than trusting the write. The record count catches a
// partial upload; the query catches an index that accepted records but cannot search them.
const everything = await client.searchSingleIndex({
  indexName,
  searchParams: { query: '', hitsPerPage: 0 },
});
console.log(`index "${indexName}" now holds ${everything.nbHits} records`);

const sushi = await client.searchSingleIndex<RestaurantRecord>({
  indexName,
  searchParams: { query: 'sushi', hitsPerPage: 5 },
});
console.log(`\n"sushi" -> ${sushi.nbHits} hits in ${sushi.processingTimeMS}ms`);
for (const hit of sushi.hits) {
  console.log(`  ${hit.stars_count.toFixed(1)}★ ${hit.name} — ${hit.food_type}, ${hit.city}`);
}

if (everything.nbHits !== records.length) {
  throw new Error(`pushed ${records.length} records but the index reports ${everything.nbHits}`);
}
