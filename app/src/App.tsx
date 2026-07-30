import { InstantSearch, Pagination, SearchBox } from 'react-instantsearch';

import { ResultsBoard } from './components/results-board';
import { indexName, searchClient } from './lib/search-client';

/**
 * The search root.
 *
 * `routing` syncs UI state to the URL in both directions. It is nearly free and it makes any state
 * of the demo a shareable link, which matters when the artifact is presented on a call.
 *
 * `preserveSharedStateOnUnmount` is the v7-recommended behaviour: without it, a widget that unmounts
 * discards refinements that another widget is still reading. That bites as soon as the same facet is
 * rendered in both a sidebar and a mobile sheet, which is where this build is heading.
 *
 * No `<Configure>` yet: `hitsPerPage` is already set on the index, and repeating it here would give
 * two places to change one number. Insights and the geo parameters arrive in their own steps.
 *
 * `SearchBox` is temporary — step 3.4 replaces it with federated Autocomplete. The two must never be
 * mounted together, because both own the query.
 */
export function App() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      routing
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <main className="mx-auto max-w-[1240px] px-4 py-8">
        <h1 className="text-2xl font-semibold">Restaurant search</h1>

        <div className="py-4">
          <SearchBox
            placeholder="Search restaurants, cuisines, neighborhoods"
            classNames={{
              input: 'w-full max-w-lg rounded-sm border border-hairline bg-porcelain px-3 py-2',
            }}
          />
        </div>

        <ResultsBoard />

        <div className="py-6">
          <Pagination />
        </div>
      </main>
    </InstantSearch>
  );
}
