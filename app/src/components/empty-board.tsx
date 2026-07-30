import { useSearchBox } from 'react-instantsearch';

/**
 * The zero-results state — an entry in the guide that says what to do next, rather than a blank page.
 *
 * This has a specific known case to serve. `fogodechao` returns nothing, and it is not a bug we can
 * settle in the index: Algolia splits a concatenated token into at most two words, so `meltingpot` and
 * `ruthschris` resolve while a three-word brand name does not (see `docs/relevance-testing.md`). The
 * engine cannot rescue that query, so the interface has to — which is why the advice here is specific
 * and actionable rather than a shrug with a magnifying glass over it.
 *
 * Stop Red appears here and essentially nowhere else, which is what keeps it meaning something. It is
 * spent on the label rather than on a rule or a panel: this is a dead end, not an error, and the page
 * should not look alarmed about it.
 *
 * This is the one place the display size is used. Everywhere else DESIGN.md's Name-Dominates Rule gives
 * the largest type to a restaurant, and here there are none — so the sentence that says so takes it.
 */
export function EmptyBoard() {
  const { query, refine } = useSearchBox();

  return (
    <section className="border-t border-ink py-12" aria-label="No results">
      <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-stop uppercase">
        No matches
      </p>

      <h2 className="mt-3 max-w-[20ch] text-[clamp(2rem,3.2vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.02em]">
        Nothing matched {query ? <>“{query}”</> : 'that search'}
      </h2>

      <ul className="mt-7 max-w-[62ch] space-y-3 text-[0.9375rem] leading-[1.55] text-graphite">
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
          className="mt-8 min-h-11 rounded-sm bg-brand-deep px-5 text-sm font-semibold text-card transition-colors duration-[120ms] hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          Clear search
        </button>
      )}
    </section>
  );
}
