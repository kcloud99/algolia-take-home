import { useRefinementList } from 'react-instantsearch';

/**
 * A refinement with no visible control of its own. Draws nothing; exists so the refinement works.
 *
 * **UI state alone does not search.** InstantSearch translates UI state into search parameters through
 * its *mounted widgets*: each widget owns a slice of the state and contributes the parameters for it.
 * Nothing mounted, nothing applied — silently, with no error and a board that looks perfectly healthy.
 *
 * So every attribute this app can refine without a widget on screen needs one of these. There are three:
 * `cuisines` and `city`, which autocomplete can select, and `chain_name`, which the platform marker on a
 * grouped row refines to show a brand's other locations. None of the three belongs in the signage panel —
 * 116 cuisines, 948 cities and 158 brands are not lists anyone scrolls.
 *
 * Registering them is also what lets the route strip display and remove them, since `CurrentRefinements`
 * reads the same mounted widgets. `limit: 1` because no values are ever rendered; this exists for the
 * state mapping alone.
 */
export function VirtualRefinement({ attribute }: { attribute: string }) {
  useRefinementList({ attribute, limit: 1 });
  return null;
}
