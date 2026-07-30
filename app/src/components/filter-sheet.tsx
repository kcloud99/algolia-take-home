import { useEffect, useRef, useState } from 'react';
import { useCurrentRefinements } from 'react-instantsearch';

import { SignagePanel } from './signage-panel';

/**
 * The signage panel, on a phone.
 *
 * A 280px rail has nowhere to go at 390px, so below `lg` it moves behind a trigger and opens as a bottom
 * sheet. A sheet rather than a full-screen page because filtering is a *side* activity — the diner is
 * adjusting the board, not leaving it — and the scrim above it keeps that legible even though six facet
 * groups need most of the height. Measured at 85vh it leaves about 100px of board strip showing, which is
 * enough to read as an overlay and not enough to watch results change; the trigger's refinement count and
 * the route strip's chips are what actually keep the state visible, not a peek-through.
 *
 * This is the one place DESIGN.md allows a shadow. The Flat Concourse Rule makes surfaces flat at rest and
 * grants a single functional exception, `Sheet-lift`, for exactly this — a sheet has to read as floating
 * above the board rather than as another band of it. The token lives in `index.css` with the palette.
 *
 * The refinement count on the trigger is the part that matters. A filter a diner cannot see is a filter
 * they cannot undo, and on a phone the route strip's chips are the only other evidence — so the trigger
 * carries the number, and the sheet is never the only place the state is visible.
 */
export function FilterSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const { items } = useCurrentRefinements();
  const closeRef = useRef<HTMLButtonElement>(null);

  const refinementCount = items.reduce((total, item) => total + item.refinements.length, 0);

  /**
   * Escape closes it, and the page behind it does not scroll while it is open.
   *
   * Both are the things that make an overlay feel like an overlay rather than a div. The scroll lock is on
   * `documentElement` rather than `body` because that is what Autocomplete's detached mode also targets,
   * and two overlays fighting over the same property would leave the page stuck.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-sm border border-hairline bg-porcelain px-3 font-mono text-[0.625rem] tracking-[0.08em] text-ink uppercase hover:border-signal hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal xl:hidden"
      >
        Filters
        {refinementCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-sm bg-signal text-porcelain">
            {refinementCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* The scrim. A button rather than a div so tapping outside closes it without a keyboard trap,
              and it is `aria-hidden` because the sheet's own close button is the accessible way out. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30 bg-ink/40 xl:hidden"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Refine results"
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t-sm bg-porcelain shadow-[var(--shadow-sheet-lift)] xl:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
              <h2 className="font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">
                Refine
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-11 px-2 font-mono text-[0.625rem] tracking-[0.08em] text-signal uppercase hover:text-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                Done
              </button>
            </div>

            {/* The panel itself is unchanged — same widgets, same index-driven order. A second copy of the
                facets is mounted while the sheet is open, which InstantSearch supports and
                `future.preserveSharedStateOnUnmount` is set for: closing the sheet must not discard what
                the diner just refined. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SignagePanel />
            </div>
          </div>
        </>
      )}
    </>
  );
}
