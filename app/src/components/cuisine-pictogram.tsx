import type { CuisineMark } from '../lib/cuisine-visuals';

/**
 * The cuisine marks, drawn rather than imported.
 *
 * DESIGN.md asks for pictograms "on one geometric grid at a single stroke weight, in the world's own
 * grammar — not lifted from an off-the-shelf icon set." So: one 24×24 grid, one stroke weight, square
 * caps and joins to match the Square Corner Rule, and no fills except where a shape reads as solid.
 *
 * There is one mark per `cuisine_group`. They are deliberately literal — a diner scanning a column
 * should not have to learn a legend.
 */
const MARKS: Record<CuisineMark, React.ReactNode> = {
  // American — a burger. Bun dome above, base curve below: without both curves this reads as a
  // hamburger *menu* icon, which is the last thing a mark in a search UI should look like.
  burger: (
    <>
      <path d="M4 11 A8 8 0 0 1 20 11" />
      <path d="M4 14 H20" />
      <path d="M4 16 Q12 21 20 16" />
    </>
  ),
  // Southern & Creole — a covered pot, steaming. Distinguished from `fondue` by the steam and the
  // straight sides; a side-on skillet reads as a magnifying glass.
  pot: (
    <>
      <path d="M6 13 H18 V19 H6 Z" />
      <path d="M4 13 H20" />
      <path d="M9 9 V6" />
      <path d="M15 9 V6" />
    </>
  ),
  // Italian — spaghetti. A pizza slice is a bare triangle at this size: apex-up it reads as a hazard
  // sign, apex-down it is indistinguishable from the Thai chili. Noodles collide with nothing.
  slice: (
    <>
      <path d="M8 5 Q10.5 9 8 12 Q5.5 15 8 19" />
      <path d="M12 5 Q14.5 9 12 12 Q9.5 15 12 19" />
      <path d="M16 5 Q18.5 9 16 12 Q13.5 15 16 19" />
    </>
  ),
  // Mediterranean — olives on a branch
  olive: (
    <>
      <path d="M4 20 L19 5" />
      <circle cx="9" cy="14" r="1.8" />
      <circle cx="13" cy="10" r="1.8" />
      <circle cx="17" cy="6" r="1.8" />
    </>
  ),
  // Japanese — a bento box. A compartmented rectangle, where nigiri-on-a-square read as a camera.
  bento: (
    <>
      <path d="M4 7 H20 V17 H4 Z" />
      <path d="M12 7 V17" />
      <path d="M12 12 H20" />
    </>
  ),
  // Asian — chopsticks
  chopsticks: (
    <>
      <path d="M6 19 L15 5" />
      <path d="M10 19 L19 5" />
    </>
  ),
  // Chinese — a rice bowl
  bowl: (
    <>
      <path d="M4 11 H20" />
      <path d="M5 11 Q12 20 19 11" />
    </>
  ),
  // Thai — a chili
  chili: (
    <>
      <path d="M8 8 L16 8 L12 19 Z" />
      <path d="M12 8 V4" />
    </>
  ),
  // Vegetarian & Organic — a leaf
  leaf: (
    <>
      <path d="M12 4 Q19 11 12 20 Q5 11 12 4 Z" />
      <path d="M12 7 V18" />
    </>
  ),
  // French — a serving cloche
  cloche: (
    <>
      <path d="M5 16 A7 7 0 0 1 19 16" />
      <path d="M3 16 H21" />
      <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // European — a rimmed plate. The generalist mark for the generalist group.
  plate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  // Fondue — a pot and a long fork
  fondue: (
    <>
      <path d="M5 12 H19" />
      <path d="M6 12 L8 19 H16 L18 12" />
      <path d="M14 11 L19 4" />
    </>
  ),
  // Seafood — a fish
  fish: (
    <>
      <path d="M4 12 Q10 6 16 12 Q10 18 4 12 Z" />
      <path d="M16 12 L20 8 V16 Z" />
      <circle cx="7" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // Hawaiian & Pacific — swell
  wave: (
    <>
      <path d="M3 13 Q7 9 11 13 T19 13" />
      <path d="M3 18 Q7 14 11 18 T19 18" />
    </>
  ),
  // Steakhouse — a bone-in cut, seen flat. A cleaver at this size reads as a flag or a label.
  chop: (
    <>
      <path d="M6 6 H17 L20 12 L17 18 H6 L3 12 Z" />
      <circle cx="11" cy="12" r="2" />
    </>
  ),
  // Barbecue — a kettle grill
  grill: (
    <>
      <path d="M5 13 A7 7 0 0 1 19 13" />
      <path d="M4 13 H20" />
      <path d="M8 13 L6 20" />
      <path d="M16 13 L18 20" />
    </>
  ),
  // Mexican & Southwestern — a saguaro. A taco shell and the Chinese rice bowl are the same
  // half-circle at 40px, and one of the two had to become unmistakable.
  cactus: (
    <>
      <path d="M12 5 V20" />
      <path d="M12 13 H7 V8" />
      <path d="M12 16 H17 V11" />
    </>
  ),
  // Latin American — a sun
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3 V5.5" />
      <path d="M12 18.5 V21" />
      <path d="M3 12 H5.5" />
      <path d="M18.5 12 H21" />
    </>
  ),
  // Spanish & Tapas — small plates
  plates: (
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <circle cx="12" cy="16" r="3" />
    </>
  ),
  // Indian — a thali
  thali: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="9.5" r="2" />
      <circle cx="15" cy="9.5" r="2" />
      <circle cx="12" cy="15.5" r="2" />
    </>
  ),
  // Middle Eastern & African — a skewer
  skewer: (
    <>
      <path d="M12 3 V21" />
      <path d="M7 6 H17 V9 H7 Z" />
      <path d="M7 11 H17 V14 H7 Z" />
      <path d="M7 16 H17 V19 H7 Z" />
    </>
  ),
  // International — a globe
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12 H20.5" />
      <path d="M12 3.5 A5 8.5 0 0 1 12 20.5" />
      <path d="M12 3.5 A5 8.5 0 0 0 12 20.5" />
    </>
  ),
  // Bar & Lounge — a cocktail glass
  glass: (
    <>
      <path d="M5 5 H19 L12 13 Z" />
      <path d="M12 13 V19" />
      <path d="M8 19 H16" />
    </>
  ),
};

/**
 * Decorative by default: the cuisine is always written next to the tile, so announcing the mark
 * would make a screen reader say it twice.
 */
export function CuisinePictogram({ mark, className }: { mark: CuisineMark; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {MARKS[mark]}
    </svg>
  );
}
