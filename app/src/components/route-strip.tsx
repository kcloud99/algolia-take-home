import {
  ClearRefinements,
  CurrentRefinements,
  useCurrentRefinements,
  useInstantSearch,
} from 'react-instantsearch';
import type { CurrentRefinementsConnectorParamsItem } from 'instantsearch.js/es/connectors/current-refinements/connectCurrentRefinements';

import { FilterSheet } from './filter-sheet';
import { GroupingToggle } from './grouping-toggle';
import { LocationControl } from './location-control';
import { SortControl } from './sort-control';
import { humanizeTag } from '../lib/labels';
import type { CentreChoice } from '../lib/use-search-centre';

/** Facet attribute → the word a diner would use for it. */
const ATTRIBUTE_LABELS: Record<string, string> = {
  cuisine_group: 'Cuisine',
  // Refinable from autocomplete rather than the panel, but they still need a name in the summary.
  cuisines: 'Cuisine',
  city: 'City',
  // Refined by the platform marker on a grouped row. The chip is how a diner gets back out of it.
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

const CURRENT_REFINEMENTS_CLASSES = {
  list: 'flex flex-wrap items-center gap-2',
  item: 'flex items-center gap-1.5 rounded-sm border border-signal bg-porcelain px-2 py-1 text-xs',
  label: 'font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase',
  category: 'flex items-center gap-1',
  categoryLabel: 'text-ink',
  delete:
    'min-h-6 min-w-6 font-mono text-steel hover:text-stop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
};

const CLEAR_REFINEMENTS_CLASSES = {
  button:
    'min-h-8 font-mono text-[0.625rem] tracking-[0.08em] text-signal uppercase hover:text-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
  disabledButton: 'hidden',
};

const CLEAR_TRANSLATIONS = { resetButtonText: 'Clear all' };

/**
 * The route strip: everything currently applied to the board, read like a journey summary, plus the
 * sort selector.
 *
 * Always visible, and that is a requirement rather than a preference — the scorecard asks for a search
 * experience that is simple to understand, and the fastest way to fail that is a refinement a diner
 * cannot see and therefore cannot undo. Each chip removes itself; the clear-all removes the lot.
 *
 * Grouping, location and sort all sit here together because all three answer "how is this board
 * arranged" rather than "which restaurants are on it" — and because each is state that must not be
 * invisible. None of them produces a chip, so the strip is the only place a diner can see them. Both
 * values are owned by `App`, which needs them for `<Configure>` too.
 */
export function RouteStrip({
  grouped,
  onGroupedChange,
  locationChoice,
  onChooseLocation,
  locationNotice,
}: {
  grouped: boolean;
  onGroupedChange: (grouped: boolean) => void;
  locationChoice: CentreChoice;
  onChooseLocation: (choice: CentreChoice) => void;
  locationNotice: string | null;
}) {
  const { items } = useCurrentRefinements();
  const { indexUiState } = useInstantSearch();
  const typedQuery = (indexUiState.query ?? '').trim();

  return (
    <div className="border-b border-hairline bg-concourse">
      {/* Chips take their own line on a phone and share one with the controls from `lg` up, where the rail
          also appears. Below that there are four controls and no room to put them beside a chip run. */}
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-2 xl:flex-row xl:flex-wrap xl:items-center xl:gap-x-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {items.length > 0 ? (
            <>
              <CurrentRefinements
                transformItems={renameRefinements}
                classNames={CURRENT_REFINEMENTS_CLASSES}
              />
              <ClearRefinements
                translations={CLEAR_TRANSLATIONS}
                classNames={CLEAR_REFINEMENTS_CLASSES}
              />
            </>
          ) : (
            /* "No filters applied" was a false statement on two of the demo queries. The intent Rules
               apply a `filters` string rather than a facet refinement, so `romantic` and `cheap eats`
               genuinely are filtered and produce no chip to say so. Naming the query instead is true in
               every case, and more use than a claim about filters nobody set. */
            <p className="font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">
              {typedQuery === '' ? 'All restaurants' : `Results for “${typedQuery}”`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 xl:contents">
          {/* Only below `lg`, where the rail is gone. It carries the refinement count, so the sheet is
              never the only place a filter is visible. */}
          <FilterSheet />

          <GroupingToggle grouped={grouped} onChange={onGroupedChange} />

          <LocationControl
            choice={locationChoice}
            onChoose={onChooseLocation}
            notice={locationNotice}
          />

          <SortControl />
        </div>
      </div>
    </div>
  );
}
