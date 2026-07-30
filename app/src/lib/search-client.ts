/**
 * The browser's Algolia client.
 *
 * `liteClient` is the search-only build of algoliasearch v5. It is a smaller bundle, and — the
 * reason it is the right choice here — it has no write methods at all, so the frontend physically
 * cannot modify the index even if it were handed an admin key. The admin key stays in `.env` and is
 * used only by `scripts/`.
 */
import { liteClient } from 'algoliasearch/lite';

/**
 * Vite replaces `import.meta.env.VITE_*` at build time, so a missing variable becomes `undefined`
 * and the app renders an empty grid with no network error. Failing loudly at startup instead turns
 * a confusing demo into a one-line message.
 */
function requireEnv(name: keyof ImportMetaEnv, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is missing — copy .env.example to .env and fill in your Algolia keys`);
  }
  return value;
}

export const appId = requireEnv('VITE_ALGOLIA_APP_ID', import.meta.env.VITE_ALGOLIA_APP_ID);
export const indexName = requireEnv('VITE_ALGOLIA_INDEX_NAME', import.meta.env.VITE_ALGOLIA_INDEX_NAME);

const searchKey = requireEnv('VITE_ALGOLIA_SEARCH_KEY', import.meta.env.VITE_ALGOLIA_SEARCH_KEY);

export const searchClient = liteClient(appId, searchKey);
