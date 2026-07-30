import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Whether the board is currently showing one row per brand.
 *
 * A context rather than a prop, and the reason is the `Hits` widget: it owns the list and hands its
 * `hitComponent` exactly one thing, the hit. There is no channel for a board-wide fact, so a row that
 * needs to know how the board is arranged has to read it from somewhere else.
 *
 * The alternatives were worse. `_distinctSeqID` looks like the engine's own answer — it is declared on
 * InstantSearch's `Hit` type — but it comes back `undefined` on every hit with `distinct: true`, checked
 * against the live index rather than assumed. And closing over the flag to build the `hitComponent`
 * inline would hand `Hits` a different component *type* on every render, which remounts all 24 rows.
 *
 * `distinct` itself is a query parameter set in `<Configure>`; this only mirrors it for display.
 */
const GroupingContext = createContext(false);

export function GroupingProvider({ grouped, children }: { grouped: boolean; children: ReactNode }) {
  return <GroupingContext.Provider value={grouped}>{children}</GroupingContext.Provider>;
}

export function useIsGrouped(): boolean {
  return useContext(GroupingContext);
}
