import { SearchBox, useStats } from 'react-instantsearch';

/**
 * The board strip: the dark band carrying the search field and the live readout.
 *
 * This is the One Board Rule from DESIGN.md in one component. The dark Ink surface is reserved for
 * *live* information — what you typed and what came back — while browsing happens on the light
 * concourse below. Spending the dark surface anywhere else would make it mean nothing.
 *
 * Sticky, because the search field is the one control that must never be more than a glance away.
 *
 * `SearchBox` rather than a hook-built input: it ships the reset button, the ARIA wiring and the
 * debounce, and step 3.4 replaces the whole thing with Autocomplete anyway. The submit button is
 * hidden because results arrive as you type, so there is nothing to submit.
 */
export function BoardStrip() {
  return (
    <header className="sticky top-0 z-10 bg-ink text-porcelain">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <p className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="size-4 bg-signal" />
          <span className="font-display text-lg leading-none font-semibold tracking-wide uppercase">
            OpenTable
          </span>
        </p>

        <SearchBox
          placeholder="Search restaurants, cuisines, neighborhoods"
          // Deliberately not autofocused: on a phone that opens the keyboard before the diner has
          // seen a single result, and the board is worth looking at first.
          classNames={{
            root: 'flex-1',
            form: 'relative',
            input:
              'w-full rounded-sm border border-steel bg-porcelain px-3 py-2 text-ink placeholder:text-steel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
            submit: 'hidden',
            reset:
              'absolute right-2 top-1/2 -translate-y-1/2 text-steel hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
            resetIcon: 'size-3 fill-current',
            loadingIndicator: 'hidden',
          }}
        />

        <LiveReadout />
      </div>
    </header>
  );
}

/**
 * The results-and-timing readout, in Board Amber because it is the one genuinely live thing on the
 * strip. Rendering the processing time is not vanity: the prospect runs a ten-year-old stack, and
 * "5,000 restaurants, 1 ms" is the argument made without a slide.
 */
function LiveReadout() {
  const { nbHits, processingTimeMS } = useStats();

  return (
    <p className="shrink-0 font-mono text-xs tracking-[0.08em] text-amber uppercase">
      {nbHits.toLocaleString()} {nbHits === 1 ? 'result' : 'results'} · {processingTimeMS} ms
    </p>
  );
}
