import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

/**
 * How the board is arranged, and how to stop arranging it that way.
 *
 * A context rather than props, and the reason is the `Hits` widget: it owns the list and hands its
 * `hitComponent` exactly one thing, the hit. There is no channel for a board-wide fact, so a row that
 * needs to know how the board is arranged — or needs to change it — has to reach it another way.
 *
 * The alternatives were worse. `_distinctSeqID` looks like the engine's own answer to "was this grouped"
 * — it is declared on InstantSearch's `Hit` type — but it comes back `undefined` on every hit with
 * `distinct: true`, checked against the live index rather than assumed. And closing over the flag to
 * build the `hitComponent` inline would hand `Hits` a different component *type* on every render, which
 * remounts all 24 rows.
 *
 * `distinct` itself is a query parameter set in `<Configure>`; this mirrors it, and `ungroup` is how a
 * row asks for it to be turned off.
 */
type Grouping = {
  grouped: boolean;
  ungroup: () => void;
};

const GroupingContext = createContext<Grouping>({ grouped: false, ungroup: () => {} });

export function GroupingProvider({
  grouped,
  ungroup,
  children,
}: {
  grouped: boolean;
  ungroup: () => void;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ grouped, ungroup }), [grouped, ungroup]);

  return <GroupingContext.Provider value={value}>{children}</GroupingContext.Provider>;
}

export function useGrouping(): Grouping {
  return useContext(GroupingContext);
}
