import {
  ClearRefinements,
  CurrentRefinements,
  useCurrentRefinements,
  useInstantSearch,
  useStats,
} from 'react-instantsearch';
import type { CurrentRefinementsConnectorParamsItem } from 'instantsearch.js/es/connectors/current-refinements/connectCurrentRefinements';

import { FilterSheet } from './filter-sheet';
import { GroupingToggle } from './grouping-toggle';
import { SortControl } from './sort-control';
import { humanizeTag } from '../lib/labels';

/** Facet attribute → the word a diner would use for it. */
const ATTRIBUTE_LABELS: Record<string, string> = {
  cuisine_group: 'Cuisine',
  // Refinable from autocomplete rather than the rail, but they still need a name in the summary.
  cuisines: 'Cuisine',
  city: 'City',
  // Refined by the chain marker on a grouped entry. The chip is how a diner gets back out of it.
  chain_name: 'Brand',
  price_range: 'Price',
  rating_bucket: 'Rating',
  vibe_tags: 'Good for',
  dining_style: 'Style',
  'location.lvl0': 'Where',
  'location.lvl1': 'Where',
  'location.lvl2': 'Where',
};

/**
 * Declared at module scope, and this is not a style preference — it is the fix for a hang.
 *
 * `CurrentRefinements` only mounts once something is refined, so with an inline `transformItems` the
 * app looked perfectly healthy until the first filter was applied. A fresh function reference on every
 * render reads to the connector as changed parameters, so the widget was disposed and re-added in a
 * loop. The page did not error, it simply stopped responding — a headless render of any refined URL
 * never returned, which is how this was found.
 *
 * The same applies to the `classNames` objects below.
 */
function renameRefinements(
  items: CurrentRefinementsConnectorParamsItem[],
): CurrentRefinementsConnectorParamsItem[] {
  return items.map((item) => ({
    ...item,
    // The group's own label is the raw attribute name, which is schema rather than language.
    label: ATTRIBUTE_LABELS[item.attribute] ?? item.label,
    refinements: item.refinements.map((refinement) => ({
      ...refinement,
      // `vibe_tags` are stored kebab-case. Without this, selecting "Date night" in the rail shows
      // "date-night" in the summary and the two controls stop looking like one system.
      label:
        refinement.attribute === 'vibe_tags' ? humanizeTag(String(refinement.label)) : refinement.label,
    })),
  }));
}

/**
 * An applied refinement is one of the four things DESIGN.md's One Accent Rule lets the accent mark, so
 * a chip carries the wash and a tinted rule rather than a neutral outline. It is the only way to see
 * at a glance that the index has been narrowed.
 */
const CURRENT_REFINEMENTS_CLASSES = {
  list: 'flex flex-wrap items-center gap-2',
  item: 'flex items-center gap-1.5 rounded-sm border border-brand/35 bg-brand-wash px-2.5 py-1 text-sm',
  label: 'text-[0.6875rem] font-semibold tracking-[0.1em] text-graphite uppercase',
  category: 'flex items-center gap-1.5',
  categoryLabel: 'font-medium text-ink',
  delete:
    'min-h-6 min-w-6 text-graphite transition-colors duration-[120ms] hover:text-stop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep',
};

const CLEAR_REFINEMENTS_CLASSES = {
  button:
    'min-h-8 text-[0.6875rem] font-semibold tracking-[0.1em] text-brand-deep uppercase underline decoration-brand/40 underline-offset-4 transition-colors duration-[120ms] hover:decoration-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep',
  disabledButton: 'hidden',
};

const CLEAR_TRANSLATIONS = { resetButtonText: 'Clear all' };

/**
 * The index line: how many restaurants this is, how fast it came back, what is applied to it, and how
 * it is arranged.
 *
 * Always visible, and that is a requirement rather than a preference — the scorecard asks for a search
 * experience that is simple to understand, and the fastest way to fail that is a refinement a diner
 * cannot see and therefore cannot undo. Each chip removes itself; the clear-all removes the lot.
 *
 * Grouping and sort sit here because both answer "how is this index arranged" rather than "which
 * restaurants are in it", and because each is state that must not be invisible: neither produces a
 * chip, so this line is the only place a diner can see them. Location moved to the masthead, where it
 * belongs beside the search rather than beside the filters.
 *
 * The chips take a line of their own rather than sharing one with the count. Sharing was measured: a
 * long refinement run pushed the count and the controls onto a second line anyway, and the count then
 * moved every time a filter was added — which is the one number on the page that should hold still.
 */
export function RouteStrip({
  grouped,
  onGroupedChange,
}: {
  grouped: boolean;
  onGroupedChange: (grouped: boolean) => void;
}) {
  const { items } = useCurrentRefinements();

  return (
    <div className="border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-2.5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <IndexLine />

          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Only below `xl`, where the rail is gone. It carries the refinement count, so the sheet
                is never the only place a filter is visible. */}
            <FilterSheet />
            <GroupingToggle grouped={grouped} onChange={onGroupedChange} />
            <SortControl />
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <CurrentRefinements
              transformItems={renameRefinements}
              classNames={CURRENT_REFINEMENTS_CLASSES}
            />
            <ClearRefinements
              translations={CLEAR_TRANSLATIONS}
              classNames={CLEAR_REFINEMENTS_CLASSES}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * How many restaurants, for what, and how fast — read as a sentence rather than shouted as a stat.
 *
 * Rendering the processing time is not vanity: the prospect runs a ten-year-old stack, and "5,000
 * restaurants in 3 ms" is the argument made without a slide. The previous system set it in orange at
 * the top-right of a black bar, which made a technical stat the loudest thing on the page; here it is
 * a caption in the line that already describes the result set.
 *
 * **The `~` is load-bearing.** With `distinct` on a broad query the engine stops counting exactly and
 * says so: `exhaustiveNbHits: false`. Measured, the grouped empty query with no location set reports
 * 181 where the true number of brands-plus-singletons is 4,554 — and the estimate even moves with
 * `hitsPerPage`. Pagination respects the estimate, so the index stays internally consistent, but
 * printing it as a fact would not be. `useStats` does not surface the flag, so it comes from `results`.
 *
 * The typed query is named here rather than asserting that no filters are applied. "No filters
 * applied" was a false statement on two of the demo queries: the intent Rules apply a `filters` string
 * rather than a facet refinement, so `romantic` and `cheap eats` genuinely are filtered and produce no
 * chip to say so.
 */
function IndexLine() {
  const { nbHits, processingTimeMS } = useStats();
  const { results, indexUiState } = useInstantSearch();
  const estimated = results.exhaustiveNbHits === false;
  const typedQuery = (indexUiState.query ?? '').trim();

  return (
    <p className="tabular text-sm text-graphite">
      <span className="font-semibold text-ink">
        {estimated && <span title="The engine reported this count as approximate">~</span>}
        {nbHits.toLocaleString()}
      </span>{' '}
      {nbHits === 1 ? 'restaurant' : 'restaurants'}
      {typedQuery !== '' && <> for “{typedQuery}”</>} · {processingTimeMS} ms
    </p>
  );
}
