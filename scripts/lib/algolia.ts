/**
 * The Algolia admin client. Used by `scripts/` only — never by the app.
 *
 * The admin key can write and delete an entire index, so it lives in `.env` and stays server-side.
 * The browser gets the search-only key via `VITE_ALGOLIA_SEARCH_KEY` and a `liteClient`, which
 * physically cannot write.
 *
 * This is algoliasearch **v5**: there is no index object and no `initIndex()`. Every method is
 * flat on the client and takes `indexName` as a parameter.
 */
import { existsSync } from 'node:fs';

import { algoliasearch } from 'algoliasearch';

import { paths } from './paths.js';

loadEnvFile();

/**
 * The index name is not a secret, so it carries a default rather than being required. The env
 * override exists so a scratch index can be pushed to without editing code — iterating against a
 * throwaway index is safer than iterating against the one the demo is pointed at.
 * Must match `VITE_ALGOLIA_INDEX_NAME`, which is what the app reads.
 */
export const indexName = process.env.ALGOLIA_INDEX_NAME ?? 'restaurants';

export const client = algoliasearch(requireEnv('ALGOLIA_APP_ID'), requireEnv('ALGOLIA_ADMIN_KEY'));

/** Node 22 reads `.env` natively, so a dotenv dependency would buy nothing. */
function loadEnvFile(): void {
  if (!existsSync(paths.envFile)) {
    throw new Error(`no .env at ${paths.envFile} — copy .env.example and fill in your Algolia keys`);
  }
  process.loadEnvFile(paths.envFile);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing from .env — see .env.example`);
  }
  return value;
}
