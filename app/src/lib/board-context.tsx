import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

/**
 * Facts about how the board is arranged that a row needs to know, and the two things a row can change.
 *
 * A context rather than props, and the reason is the `Hits` widget: it owns the list and hands its
 * `hitComponent` exactly one thing, the hit. There is no channel for a board-wide fact, so a row that needs
 * to know how the board is arranged — or needs to change it — has to reach it another way.
 *
 * The alternatives were worse. `_distinctSeqID` looks like the engine's own answer to "was this grouped" —
 * it is declared on InstantSearch's `Hit` type — but it comes back `undefined` on every hit with
 * `distinct: true`, checked against the live index rather than assumed. And closing over the flags to build
 * the `hitComponent` inline would hand `Hits` a different component *type* on every render, which remounts
 * all 24 rows.
 *
 * One context for both rather than one per flag: they are the same kind of thing, and a second provider
 * around the same subtree to carry a second boolean is ceremony.
 *
 * `grouped` mirrors the `distinct` query parameter set in `<Configure>`; `explain` is local to the UI and
 * touches no search parameter at all, because the ranking evidence it shows is already in every response.
 */
type Board = {
  /** One row per brand — mirrors `distinct`. */
  grouped: boolean;
  /** Turn grouping off, so a row can show the rest of its brand's locations. */
  ungroup: () => void;
  /** Show each row's ranking evidence. Off by default; a debrief tool, not a diner control. */
  explain: boolean;
  toggleExplain: () => void;
};

const BoardContext = createContext<Board>({
  grouped: false,
  ungroup: () => {},
  explain: false,
  toggleExplain: () => {},
});

export function BoardProvider({
  grouped,
  ungroup,
  explain,
  toggleExplain,
  children,
}: Board & { children: ReactNode }) {
  const value = useMemo(
    () => ({ grouped, ungroup, explain, toggleExplain }),
    [grouped, ungroup, explain, toggleExplain],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): Board {
  return useContext(BoardContext);
}
