/**
 * `vibe_tags` are stored kebab-case because they are facet values and filter tokens, not prose.
 * The panel needs them readable: `good-for-groups` → `Good for groups`.
 */
export function humanizeTag(value: string): string {
  const spaced = value.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
