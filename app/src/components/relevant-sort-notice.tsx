import connectRelevantSort from 'instantsearch.js/es/connectors/relevant-sort/connectRelevantSort';
import type {
  RelevantSortConnectorParams,
  RelevantSortWidgetDescription,
} from 'instantsearch.js/es/connectors/relevant-sort/connectRelevantSort';
import { useConnector } from 'react-instantsearch';

/**
 * Explains Relevant Sort's cutoff, which would otherwise read as a bug.
 *
 * Virtual replicas apply a relevancy cutoff: results below the threshold are held back, but `nbHits`
 * still counts them. Measured at step 2.6 on the live index — `michelin` against
 * `restaurants_rating_desc` reports **`nbHits: 3` and returns 1 hit**, with
 * `appliedRelevancyStrictness: 100`. A naive UI prints "3 results" above a list of one, and the first
 * person to notice assumes the search is broken.
 *
 * So the cutoff is stated, with a way out of it. `refine(0)` drops relevancyStrictness to zero and
 * returns the full set; `refine(undefined)` restores the index's own setting.
 *
 * **Built with `useConnector` because there is no widget for this.** `react-instantsearch@7.41`
 * exports no `RelevantSort` component and no `useRelevantSort` hook — checked against the package,
 * not assumed — while `instantsearch.js` does ship `connectRelevantSort`. `useConnector` is the
 * documented third level of control for exactly this case, and `instantsearch.js` is declared as a
 * direct dependency so this import is not reaching into a transitive one.
 */
function useRelevantSort() {
  return useConnector<RelevantSortConnectorParams, RelevantSortWidgetDescription>(connectRelevantSort);
}

export function RelevantSortNotice() {
  const { isRelevantSorted, isVirtualReplica, canRefine, refine } = useRelevantSort();

  // Nothing to explain on the primary index, where no cutoff is applied.
  if (!isVirtualReplica) {
    return null;
  }

  return (
    <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-rule bg-card px-3.5 py-2.5 text-sm text-graphite">
      <span>
        {isRelevantSorted
          ? 'Sorted results hide the least relevant matches, so the count above can be higher than the list.'
          : 'Showing every match for this sort, including the least relevant.'}
      </span>
      {canRefine && (
        <button
          type="button"
          onClick={() => refine(isRelevantSorted ? 0 : undefined)}
          className="text-[0.6875rem] font-semibold tracking-[0.1em] text-brand-deep uppercase underline decoration-brand/40 underline-offset-4 transition-colors duration-[120ms] hover:decoration-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          {isRelevantSorted ? 'See all results' : 'Show most relevant'}
        </button>
      )}
    </p>
  );
}
