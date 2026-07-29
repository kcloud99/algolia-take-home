/**
 * Runs the pre-registered relevance queries against the live index and writes the results up.
 *
 *   npm run index:test                 # -> docs/relevance-baseline.md
 *   npm run index:test -- tuned        # -> docs/relevance-tuned.md
 *
 * Two artifacts per run: a markdown report for reading, and a JSON snapshot so the before/after
 * comparison in docs/relevance-testing.md can be generated rather than transcribed by hand.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { client, indexName } from './lib/algolia.js';
import { paths } from './lib/paths.js';
import { formatReport, loadQueries, runQuery, TOP_N } from './lib/relevance.js';

const LABELS: Record<string, string> = {
  baseline:
    '**Configuration: Algolia defaults.** No settings, synonyms or rules have been applied to ' +
    'this index. Captured deliberately before any tuning, because default-configuration results ' +
    'are unrecoverable once settings are written — and a claimed improvement with no "before" is ' +
    'not evidence.',
  tuned:
    '**Configuration: tuned.** Settings, synonyms and rules from `scripts/configure-index.ts` ' +
    'are live. Compare against [the baseline](relevance-baseline.md).',
};

const label = process.argv[2] ?? 'baseline';
const description = LABELS[label] ?? `Captured under the \`${label}\` configuration.`;

const reportPath = join(paths.docs, `relevance-${label}.md`);
const snapshotPath = join(paths.docs, `relevance-${label}.json`);

// The baseline is the one artifact in this build that cannot be regenerated: once settings are
// applied, default-configuration results are gone for good. `npm run index:test` with no argument
// is the natural thing to type, so it must not be able to destroy it by accident.
if (label === 'baseline' && existsSync(reportPath) && process.argv[3] !== '--overwrite') {
  throw new Error(
    `${reportPath} already exists and re-running would overwrite the captured baseline. ` +
      `Use a different label (\`npm run index:test -- tuned\`), or pass --overwrite if the ` +
      `index really is back on default settings.`,
  );
}

// Captured from the live index rather than from our own config file, so the report proves which
// configuration actually produced these results instead of asserting it.
const settings = await client.getSettings({ indexName });

const queries = loadQueries();
console.log(`running ${queries.length} queries against "${indexName}", top ${TOP_N} each\n`);

const results = [];
for (const query of queries) {
  const result = await runQuery(query);
  results.push(result);
  console.log(
    `  ${result.query.category.padEnd(14)}${(result.query.query || '(empty)').padEnd(24)}` +
      `${String(result.nbHits).padStart(5)} hits  ${result.hits[0]?.name ?? '— nothing —'}`,
  );
}

const capturedOn = new Date().toISOString().slice(0, 10);

writeFileSync(reportPath, formatReport(label, description, results, settings, capturedOn), 'utf8');
writeFileSync(
  snapshotPath,
  `${JSON.stringify({ label, capturedOn, indexName, settings, results }, null, 2)}\n`,
  'utf8',
);

const empty = results.filter((result) => result.nbHits === 0);
console.log(`\n${empty.length} of ${results.length} queries returned nothing:`);
for (const result of empty) {
  console.log(`  ${result.query.query || '(empty)'}`);
}
console.log(`\nwrote ${reportPath}`);
console.log(`wrote ${snapshotPath}`);
