import { useHierarchicalMenu } from 'react-instantsearch';
import type { HierarchicalMenuItem } from 'instantsearch.js/es/connectors/hierarchical-menu/connectHierarchicalMenu';

/**
 * The `area > city > neighborhood` drill-down.
 *
 * Hierarchical rather than a flat neighborhood facet because a neighborhood name is ambiguous without
 * its parent: 185 records sit in a "Downtown" spread across ten different cities, so a flat facet
 * would offer the diner one "Downtown" that means ten places.
 *
 * Rendered from the hook for the same reason as `FacetList` — the widget prints counts raw, and
 * `1414` beside a board showing `12,669` is two number formats in one view.
 *
 * Sorted by count, not name. `renderingContent` carries value ordering for the four flat facets but
 * none for `location.lvl0`, and at the hierarchical default of name-ascending the first six of 51
 * areas were Columbus (66) and Dallas, leaving New York (1,414) — the densest market in the dataset —
 * hidden behind "show more".
 *
 * `attributes` is the prop `DynamicWidgets` reads to place this panel; it takes the first entry.
 */
/**
 * Module-level so the reference is stable across renders. Passing a fresh array literal into an
 * InstantSearch connector hook makes it look like the widget's parameters changed on every render, so
 * the widget is torn down and re-added in a loop — the page hangs rather than erroring, which is why
 * this cost a headless render that never returned before it was found.
 */
const SORT_BY: ['count:desc'] = ['count:desc'];

export function LocationMenu({ attributes }: { attributes: string[] }) {
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } = useHierarchicalMenu({
    attributes,
    limit: 6,
    showMore: true,
    showMoreLimit: 20,
    sortBy: SORT_BY,
  });

  return (
    <div>
      <LocationLevel items={items} refine={refine} />

      {canToggleShowMore && (
        <button
          type="button"
          onClick={toggleShowMore}
          className="mt-2 min-h-8 font-mono text-[0.625rem] tracking-[0.08em] text-signal uppercase hover:text-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          {isShowingMore ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/** One level of the drill-down, recursing into whichever branch is currently open. */
function LocationLevel({
  items,
  refine,
}: {
  items: HierarchicalMenuItem[];
  refine: (value: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.value}>
          <button
            type="button"
            onClick={() => refine(item.value)}
            className="flex min-h-8 w-full items-center gap-2 text-left text-sm hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <span className={`min-w-0 flex-1 truncate ${item.isRefined ? 'font-medium text-signal' : ''}`}>
              {item.label}
            </span>
            <span className="font-mono text-xs text-steel">{item.count.toLocaleString()}</span>
          </button>

          {item.data && item.data.length > 0 && (
            <div className="mt-0.5 ml-2 border-l border-hairline pl-2">
              <LocationLevel items={item.data} refine={refine} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
