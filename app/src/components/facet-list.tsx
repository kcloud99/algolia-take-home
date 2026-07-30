import { useRefinementList } from 'react-instantsearch';

/**
 * A refinement list, rendered from the hook rather than the `RefinementList` widget.
 *
 * The reason is the count. The widget prints its counts raw — `1697` — while every other number in
 * this interface goes through `toLocaleString`, so the panel read `3125` beside a board showing
 * `12,669`. Two number formats in one view breaks the Tabular Rule and, more practically, makes the
 * panel look like it belongs to a different application.
 *
 * Owning the markup also means one component covers all four flat facets instead of four copies of a
 * `classNames` object, and the counts can be right-aligned in mono so they form a column.
 */
export function FacetList({
  attribute,
  limit = 10,
  showMoreLimit,
  formatLabel,
}: {
  attribute: string;
  limit?: number;
  showMoreLimit?: number;
  /** For facets whose stored values are tokens rather than prose, e.g. `vibe_tags`. */
  formatLabel?: (label: string) => string;
}) {
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } = useRefinementList({
    attribute,
    limit,
    showMore: showMoreLimit !== undefined,
    showMoreLimit,
  });

  if (items.length === 0) {
    return <p className="text-sm text-steel">No options for this search.</p>;
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.value}>
            <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.isRefined}
                onChange={() => refine(item.value)}
                className="size-3.5 shrink-0 appearance-none border border-steel checked:border-signal checked:bg-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              />
              <span className={`min-w-0 flex-1 truncate ${item.isRefined ? 'font-medium text-signal' : ''}`}>
                {formatLabel ? formatLabel(item.label) : item.label}
              </span>
              <span className="font-mono text-xs text-steel">{item.count.toLocaleString()}</span>
            </label>
          </li>
        ))}
      </ul>

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
