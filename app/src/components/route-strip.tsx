import { ClearRefinements, CurrentRefinements, useCurrentRefinements } from 'react-instantsearch';
import type { CurrentRefinementsConnectorParamsItem } from 'instantsearch.js/es/connectors/current-refinements/connectCurrentRefinements';

import { SortControl } from './sort-control';
import { humanizeTag } from '../lib/labels';

/** Facet attribute → the word a diner would use for it. */
const ATTRIBUTE_LABELS: Record<string, string> = {
  cuisine_group: 'Cuisine',
  // Refinable from autocomplete rather than the panel, but they still need a name in the summary.
  cuisines: 'Cuisine',
  city: 'City',
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
 */
export function RouteStrip() {
  const { items } = useCurrentRefinements();

  return (
    <div className="border-b border-hairline bg-concourse">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
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
            <p className="font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">
              All restaurants · no filters applied
            </p>
          )}
        </div>

        <SortControl />
      </div>
    </div>
  );
}
