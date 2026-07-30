/// <reference types="vite/client" />

/**
 * The only three environment variables the browser gets, declared so a typo in a variable name is
 * a compile error rather than a blank page.
 *
 * `VITE_ALGOLIA_SEARCH_KEY` is a search-only key. Vite inlines every `VITE_`-prefixed variable
 * into the bundle, which is exactly why the admin key must never carry that prefix.
 */
interface ImportMetaEnv {
  readonly VITE_ALGOLIA_APP_ID: string;
  readonly VITE_ALGOLIA_SEARCH_KEY: string;
  readonly VITE_ALGOLIA_INDEX_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
