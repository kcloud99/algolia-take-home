import type { ReactElement } from 'react';

/**
 * A titled section of the signage panel.
 *
 * Takes exactly one child, which is a hard requirement rather than a style choice: `DynamicWidgets`
 * finds a child's `attribute` by recursing through single-child wrappers, and throws if a wrapper has
 * more than one. That is what lets the index decide the panel's order while the titles live here.
 *
 * **It hides itself when its facet has nothing to offer**, and the `:has()` selector is doing that rather
 * than a hook, deliberately. `DynamicWidgets` decides what to render from `renderingContent.facetOrdering`,
 * which step 2.6 configured on the *index* — so the order is the same six every query, whether or not the
 * results contain values for all six. Searching `atrias` drew a "GOOD FOR" heading and a keyline over
 * nothing, because no Atria's carries a vibe tag.
 *
 * The widgets already publish the fact: `RefinementList` and `HierarchicalMenu` both put
 * `ais-…--noRefinement` on their root when they have no items. Reading that class costs one line and no
 * extra widget — asking the same question from `useRefinementList` would mount a *second* connector for
 * an attribute that already has one, which is how you get two widgets fighting over one slice of state.
 */
export function FacetPanel({ title, children }: { title: string; children: ReactElement }) {
  return (
    <section className="border-b border-hairline py-4 last:border-b-0 has-[.ais-RefinementList--noRefinement]:hidden has-[.ais-HierarchicalMenu--noRefinement]:hidden">
      <h2 className="mb-2 font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">{title}</h2>
      {children}
    </section>
  );
}
