import { useSearchBox } from 'react-instantsearch';

/**
 * The zero-results state — "no departures" rather than a blank page.
 *
 * This has a specific known case to serve. `fogodechao` returns nothing, and it is not a bug we can
 * settle in the index: Algolia splits a concatenated token into at most two words, so `meltingpot` and
 * `ruthschris` resolve while a three-word brand name does not (see `docs/relevance-testing.md`). The
 * engine cannot rescue that query, so the interface has to — which is why the advice here is specific
 * and actionable rather than a shrug with a magnifying glass over it.
 *
 * Stop Red appears here and essentially nowhere else, which is what keeps it meaning something.
 */
export function EmptyBoard() {
  const { query, refine } = useSearchBox();

  return (
    <section className="border-t-2 border-stop py-10" aria-label="No results">
      <p className="font-mono text-[0.625rem] tracking-[0.08em] text-stop uppercase">No departures</p>

      <h2 className="mt-2 font-display text-2xl font-semibold">
        Nothing matched {query ? <>“{query}”</> : 'that search'}
      </h2>

      <ul className="mt-4 max-w-[60ch] space-y-1.5 text-sm text-steel">
        <li>
          <strong className="font-semibold text-ink">Try fewer words.</strong> Searching a restaurant’s
          first word or two usually finds it faster than the full name.
        </li>
        <li>
          <strong className="font-semibold text-ink">Split run-together names.</strong> “meltingpot”
          works, but a three-word name needs a space somewhere — try “fogo de chao”.
        </li>
        <li>
          <strong className="font-semibold text-ink">Spelling is forgiving.</strong> “ruths cris” and
          “benihanna” both land, so a near-miss is rarely the problem.
        </li>
      </ul>

      {query && (
        <button
          type="button"
          onClick={() => refine('')}
          className="mt-6 min-h-11 rounded-sm bg-signal px-4 font-mono text-xs tracking-[0.08em] text-porcelain uppercase hover:bg-signal-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          Clear search
        </button>
      )}
    </section>
  );
}
