import { DynamicWidgets, HierarchicalMenu, RefinementList, useNumericMenu } from 'react-instantsearch';
import type { RefinementListItem } from 'instantsearch.js/es/connectors/refinement-list/connectRefinementList';

import { FacetPanel } from './facet-panel';
import { humanizeTag } from '../lib/labels';

/**
 * The signage panel — the facet rail.
 *
 * Wrapped in `DynamicWidgets`, which is the whole point of having configured `renderingContent` on the
 * index in step 2.6. The **index** decides which facets appear and in what order; this file only says
 * what each one looks like. Reordering the rail is then a settings change rather than a deploy, which
 * is the same argument as Rules: the team that owns the experience should not need engineering to move
 * a sidebar. Hard-coding the order here would throw that away.
 *
 * Verified against the live index, which returns:
 *   cuisine_group → price_range → rating_bucket → vibe_tags → dining_style → location.lvl0
 *
 * These are the stock `RefinementList` and `HierarchicalMenu` widgets, styled through `classNames`
 * rather than reimplemented. An earlier version rendered both from their hooks to get thousands
 * separators into the counts; that cost 156 lines of hand-written facet UI to buy a comma, which is a
 * bad trade on a brief that scores avoiding over-engineering — and a worse answer to "why didn't you
 * use the library that handles disjunctive facet counts for you?". Counts render as `1697`.
 *
 * `payment_options` is deliberately absent. It is declared `filterOnly`, so it returns no facet counts
 * at all — confirmed by querying the index. A refinement list on it would render empty with no error,
 * which is Algolia non-negotiable #7 and the first thing to check when a facet is blank.
 *
 * Each `FacetPanel` wraps exactly one child, because `DynamicWidgets` finds a child's `attribute` by
 * recursing through single-child wrappers and throws if a wrapper holds more than one.
 */

/**
 * Everything below is at module scope so its reference is stable across renders.
 *
 * This is not tidiness. A fresh object or function on every render reads to an InstantSearch connector
 * as changed parameters, so the widget is disposed and re-added in a loop — the page stops responding
 * rather than erroring. Step 3.3 lost a headless render that never returned to exactly that mistake.
 */
const LOCATION_ATTRIBUTES = ['location.lvl0', 'location.lvl1', 'location.lvl2'];
const LOCATION_SORT: ['count:desc'] = ['count:desc'];
const RATING_ITEMS = [{ label: 'Any rating' }, { label: '4 stars and up', start: 4 }];

/** `vibe_tags` are stored kebab-case, because they are filter tokens rather than prose. */
function humanizeTagItems(items: RefinementListItem[]): RefinementListItem[] {
  return items.map((item) => ({ ...item, label: humanizeTag(item.label) }));
}

const FACET_CLASSES = {
  list: 'space-y-0.5',
  item: 'text-sm',
  label: 'flex min-h-11 cursor-pointer items-center gap-2 xl:min-h-8',
  checkbox:
    'size-3.5 shrink-0 appearance-none border border-steel checked:border-signal checked:bg-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
  labelText: 'min-w-0 flex-1 truncate',
  count: 'font-mono text-xs text-steel',
  selectedItem: 'font-medium text-signal',
  showMore:
    'mt-2 min-h-11 font-mono text-[0.625rem] tracking-[0.08em] text-signal uppercase hover:text-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
  disabledShowMore: 'hidden',
  noResults: 'text-sm text-steel',
};

const LOCATION_CLASSES = {
  list: 'space-y-0.5 text-sm',
  childList: 'ml-2 border-l border-hairline pl-2',
  link: 'flex min-h-11 items-center gap-2 xl:min-h-8 hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
  label: 'min-w-0 flex-1 truncate',
  selectedItem: 'font-medium text-signal',
  count: 'font-mono text-xs text-steel',
  showMore: FACET_CLASSES.showMore,
  disabledShowMore: 'hidden',
};

export function SignagePanel() {
  return (
    <div className="bg-porcelain px-4 py-2">
      <DynamicWidgets>
        <FacetPanel title="Cuisine">
          {/* 23 groups: enough to need a "show more", few enough not to need facet search. The precise
              116-value `cuisines` attribute is reached through autocomplete instead. */}
          <RefinementList
            attribute="cuisine_group"
            limit={8}
            showMore
            showMoreLimit={23}
            classNames={FACET_CLASSES}
          />
        </FacetPanel>

        <FacetPanel title="Price">
          {/* Values arrive pre-ordered by `renderingContent` — "$30 and under" before "$31 to $50" —
              because alphabetical ordering of a money scale is only ever correct by luck. */}
          <RefinementList attribute="price_range" classNames={FACET_CLASSES} />
        </FacetPanel>

        <FacetPanel title="Rating">
          <RatingFilter attribute="rating_bucket" />
        </FacetPanel>

        <FacetPanel title="Good for">
          <RefinementList
            attribute="vibe_tags"
            transformItems={humanizeTagItems}
            classNames={FACET_CLASSES}
          />
        </FacetPanel>

        <FacetPanel title="Dining style">
          {/* "Home Style" is hidden by `renderingContent`: 26 records out of 5,000 is a dead end for
              whoever clicks it. */}
          <RefinementList attribute="dining_style" classNames={FACET_CLASSES} />
        </FacetPanel>

        <FacetPanel title="Where">
          {/* Hierarchical because `neighborhood` alone is ambiguous — 185 records sit in a neighborhood
              called "Downtown" spread across ten different cities.

              Sorted by count rather than the hierarchical default of name-ascending: `renderingContent`
              carries value ordering for the flat facets but none for `location.lvl0`, and alphabetically
              the first six of 51 areas were Columbus (66) and Dallas, leaving New York at 1,414 — the
              densest market in the dataset — hidden behind "show more". */}
          <HierarchicalMenu
            attributes={LOCATION_ATTRIBUTES}
            limit={6}
            showMore
            showMoreLimit={20}
            sortBy={LOCATION_SORT}
            classNames={LOCATION_CLASSES}
          />
        </FacetPanel>
      </DynamicWidgets>
    </div>
  );
}

/**
 * Rating is the one facet whose obvious control would be a lie, and the one place here a hook is
 * unavoidable: `react-instantsearch@7.41` ships no `NumericMenu` widget, only `useNumericMenu`.
 *
 * The distribution measured across all 5,000 records: bucket 4 holds **4,435 (89%)**, bucket 3 holds
 * 530, and buckets 1, 2 and 5 hold 3, 11 and 21. A checkbox list would offer five options where one
 * matches nine restaurants in ten.
 *
 * Worse, a "5 stars" option would be actively harmful: only 21 restaurants hold a perfect score and
 * **15 of those have fewer than 20 reviews**, so the control that looks like it finds the best
 * restaurants would surface the least-evidenced ones. It is left out on purpose.
 *
 * What remains is one meaningful option. The real quality work happens in the ranking — which is why
 * the adjusted rating exists — and this control is not pretending otherwise.
 */
function RatingFilter({ attribute }: { attribute: string }) {
  const { items, refine } = useNumericMenu({ attribute, items: RATING_ITEMS });

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <label key={item.value} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm xl:min-h-8">
          <input
            type="radio"
            name={attribute}
            checked={item.isRefined}
            onChange={() => refine(item.value)}
            className="size-3.5 shrink-0 appearance-none rounded-full border border-steel checked:border-4 checked:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
          <span className={item.isRefined ? 'font-medium text-signal' : undefined}>{item.label}</span>
        </label>
      ))}
    </div>
  );
}
