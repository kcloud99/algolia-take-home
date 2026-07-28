import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Every pipeline script resolves files through here, so paths stay correct no matter
// which directory `npm run` is invoked from.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const paths = {
  /** Untouched copy of the customer's JSON file. */
  rawRestaurantsJson: join(repoRoot, 'data', 'raw', 'restaurants_list.json'),
  /** Untouched copy of the customer's CSV file (semicolon-delimited). */
  rawRestaurantsCsv: join(repoRoot, 'data', 'raw', 'restaurants_info.csv'),
  /** Pipeline output: the exact records pushed to Algolia. Committed for reviewability. */
  outRecords: join(repoRoot, 'data', 'out', 'records.json'),
} as const;
