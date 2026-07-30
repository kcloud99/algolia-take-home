import { CuisinePictogram } from './cuisine-pictogram';
import { cuisineVisual } from '../lib/cuisine-visuals';

/**
 * The square that sits at the head of a board row, in place of a photograph.
 *
 * Square rather than rounded, flat rather than shadowed, and sized off the row rather than the image
 * — it is a signage marker, not a thumbnail. The pictogram is drawn in Porcelain on the cuisine's
 * family colour, which is the highest-contrast pairing available and keeps the mark legible at 40px.
 */
export function CuisineTile({ group, size = 'md' }: { group: string; size?: 'sm' | 'md' }) {
  const { mark, colorClass } = cuisineVisual(group);
  const box = size === 'sm' ? 'size-8' : 'size-10';
  const glyph = size === 'sm' ? 'size-5' : 'size-6';

  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${colorClass} text-porcelain`}>
      <CuisinePictogram mark={mark} className={glyph} />
    </span>
  );
}
