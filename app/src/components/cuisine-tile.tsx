import { CuisinePictogram } from './cuisine-pictogram';
import { cuisineVisual } from '../lib/cuisine-visuals';

/**
 * The cuisine symbol that sits at the head of an entry, in place of a photograph.
 *
 * A guide's symbol key: a single-weight drawn mark in graphite, on the paper. **No colored tile.**
 * The previous system filled a 40px square with one of eight saturated cuisine colors, which put a
 * column of confetti down the left edge of the results and fought the one accent the palette
 * actually has. The mark carries the encoding perfectly well on its own, and the entry's meta line
 * names the cuisine in words directly beside it — so the color was carrying nothing the reader did
 * not already have twice.
 *
 * It inherits `currentColor`, which is what lets an entry tint its symbol on hover and lets the
 * browse chips turn theirs to the accent when their cuisine is the applied refinement.
 */
export function CuisineTile({
  group,
  size = 'md',
  className = '',
}: {
  group: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { mark } = cuisineVisual(group);
  const glyph = size === 'sm' ? 'size-5' : 'size-7';

  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`}>
      <CuisinePictogram mark={mark} className={glyph} />
    </span>
  );
}
