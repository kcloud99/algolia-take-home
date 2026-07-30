import { useStats } from 'react-instantsearch';

import { FederatedSearch } from './federated-search';

/**
 * The board strip: the dark band carrying the search field and the live readout.
 *
 * This is the One Board Rule from DESIGN.md in one component. The dark Ink surface is reserved for
 * *live* information — what you typed and what came back — while browsing happens on the light
 * concourse below. Spending the dark surface anywhere else would make it mean nothing.
 *
 * Sticky, because the search field is the one control that must never be more than a glance away.
 *
 * The field itself is `FederatedSearch` — Autocomplete, which owns the input and must be the only thing
 * that does. `SearchBox` stood here until step 3.4 and was removed rather than kept alongside it.
 */
export function BoardStrip() {
  return (
    <header className="sticky top-0 z-10 bg-ink text-porcelain">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        {/* The brand's own mark, which is the one place a colour outside the palette is allowed to
            appear: the One Voice Rule governs our accents, not the customer's identity. It is also
            why the disc is round in a system whose corners are square. */}
        {/* The logo alone. No wordmark beside it: the mark already says OpenTable, and anything else
            there would either repeat it or invent a product name that is not theirs. */}
        <h1 className="shrink-0">
          <img src="/opentable-logo.png" alt="OpenTable restaurant search" width={36} height={36} className="size-9" />
        </h1>

        <FederatedSearch />

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
