import { useInstantSearch, useStats } from 'react-instantsearch';

/**
 * Says so when nothing on the board is actually spelled the way the diner typed it.
 *
 * This exists because of a finding rather than a feature request. `michelin` returns three restaurants —
 * *Michelangelo* and two *Michel*s — and the word appears in no field of any record. Typo tolerance on an
 * eight-character word reaches them, and tightening it enough to stop that would break `benihanna` and
 * `melting pott`, which matter more. So the engine cannot fix this and the interface has to.
 *
 * **The lesson underneath it is the one for the customer:** a reported no-results rate understates the
 * problem, because typo tolerance papers over vocabulary gaps with near-matches. A page like this is a
 * content gap that never shows up as a zero-result. Surfacing it in the UI is also what makes it loggable.
 *
 * ### The rule, and the rule that was measured and thrown away
 *
 * It fires when every hit on the page needed at least one typo to match. That is deliberately *not* a
 * claim that the search failed — for `benihanna` it is simply true and mildly helpful — so the copy states
 * a fact and takes no position on whether the diner made a mistake.
 *
 * The obvious rule, `nbExactWords === 0` on every hit, was tried first and is wrong. Measured across the
 * query manifest it fires on `ruths cris`, `benihanna`, `atrias` **and** `meltingpot` — three flagship
 * successes and a concatenation. `nbExactWords` counts something narrower than "the word appears here":
 * `meltingpot` splits to *melting* + *pot* and scores 0 exact words at 0 typos, while `melting pott`
 * scores 1. Typo count is the signal that means what it looks like.
 *
 * It does still fire on the misspellings that work, and that is accepted rather than worked around.
 * `michelin` and `benihanna` are genuinely indistinguishable from the engine's side — both are single
 * words, no record contains them, both resolve through typo tolerance — and the difference between "the
 * diner misspelled a real restaurant" and "the diner searched for something that is not here" is
 * semantic. A threshold on `nbHits` would separate them on this dataset and would be a magic number
 * dressed up as a rule.
 */
export function NoExactMatchNotice() {
  const { query } = useStats();
  const { results } = useInstantSearch();

  const hits = results.hits;

  // `?? 0` fails to the quiet side: with no ranking info the notice stays away rather than asserting
  // something about matches it cannot see.
  const everyHitNeededATypo =
    hits.length > 0 && hits.every((hit) => (hit._rankingInfo?.nbTypos ?? 0) > 0);

  if (query.trim() === '' || !everyHitNeededATypo) {
    return null;
  }

  return (
    <p className="mb-4 border-l-2 border-amber bg-porcelain px-3 py-2 text-sm text-steel">
      <span className="mr-2 font-mono text-[0.625rem] tracking-[0.08em] uppercase">
        Closest matches
      </span>
      Nothing here is spelled “{query.trim()}” — these are the closest restaurant names we found.
    </p>
  );
}
