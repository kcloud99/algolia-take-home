import type { ReactElement } from 'react';

/**
 * A titled section of the signage panel.
 *
 * Takes exactly one child, which is a hard requirement rather than a style choice: `DynamicWidgets`
 * finds a child's `attribute` by recursing through single-child wrappers, and throws if a wrapper has
 * more than one. That is what lets the index decide the panel's order while the titles live here.
 */
export function FacetPanel({ title, children }: { title: string; children: ReactElement }) {
  return (
    <section className="border-b border-hairline py-4 last:border-b-0">
      <h2 className="mb-2 font-mono text-[0.625rem] tracking-[0.08em] text-steel uppercase">{title}</h2>
      {children}
    </section>
  );
}
