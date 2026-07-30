/**
 * How a cuisine gets encoded visually: a colour family and a pictogram.
 *
 * The source data has no photography at all — every one of the 5,000 `image_url` values redirects
 * to the same 2.2 KB placeholder. Rather than substitute stock photographs of food that belongs to
 * other restaurants, the board encodes cuisine directly, which is both honest and the thing
 * DESIGN.md actually asks for.
 *
 * Two levels, because one is not enough and 23 is too many:
 *
 * - **Colour** is one of DESIGN.md's eight fixed line-bullet colours. Twenty-three distinguishable
 *   hues do not exist, so colour carries the *family* — the coarse "which part of the menu is this"
 *   signal a diner can scan down a column without reading.
 * - **The pictogram** distinguishes groups *within* a family. Japanese, Asian, Chinese, Thai and
 *   Vegetarian all read Jade; the mark is what separates them.
 *
 * That split is the whole reason the tile carries a mark rather than only a colour swatch.
 */

/** The eight line colours. Each maps 1:1 to a `--color-line-*` token in `index.css`. */
export type CuisineFamily =
  | 'american'
  | 'italian'
  | 'asian'
  | 'french'
  | 'seafood'
  | 'steak'
  | 'latin'
  | 'other';

export type CuisineMark =
  | 'burger'
  | 'pot'
  | 'slice'
  | 'olive'
  | 'bento'
  | 'chopsticks'
  | 'bowl'
  | 'chili'
  | 'leaf'
  | 'cloche'
  | 'plate'
  | 'fondue'
  | 'fish'
  | 'wave'
  | 'chop'
  | 'grill'
  | 'cactus'
  | 'sun'
  | 'plates'
  | 'thali'
  | 'skewer'
  | 'globe'
  | 'glass';

/**
 * Literal Tailwind classes rather than a `bg-line-${family}` template, because Tailwind scans source
 * for complete class strings and never generates a utility it cannot see written out.
 */
const FAMILY_CLASS: Record<CuisineFamily, string> = {
  american: 'bg-line-american',
  italian: 'bg-line-italian',
  asian: 'bg-line-asian',
  french: 'bg-line-french',
  seafood: 'bg-line-seafood',
  steak: 'bg-line-steak',
  latin: 'bg-line-latin',
  other: 'bg-line-other',
};

/**
 * All 23 `cuisine_group` values the pipeline emits, each assigned a family and a mark.
 *
 * Keyed by the exact strings in the index — these are facet values, and a near-miss here shows up
 * as a silently grey tile rather than an error.
 */
const CUISINE_VISUALS: Record<string, { family: CuisineFamily; mark: CuisineMark }> = {
  American: { family: 'american', mark: 'burger' },
  'Southern & Creole': { family: 'american', mark: 'pot' },

  Italian: { family: 'italian', mark: 'slice' },
  Mediterranean: { family: 'italian', mark: 'olive' },

  Japanese: { family: 'asian', mark: 'bento' },
  Asian: { family: 'asian', mark: 'chopsticks' },
  Chinese: { family: 'asian', mark: 'bowl' },
  Thai: { family: 'asian', mark: 'chili' },
  'Vegetarian & Organic': { family: 'asian', mark: 'leaf' },

  French: { family: 'french', mark: 'cloche' },
  European: { family: 'french', mark: 'plate' },
  Fondue: { family: 'french', mark: 'fondue' },

  Seafood: { family: 'seafood', mark: 'fish' },
  'Hawaiian & Pacific': { family: 'seafood', mark: 'wave' },

  Steakhouse: { family: 'steak', mark: 'chop' },
  Barbecue: { family: 'steak', mark: 'grill' },

  'Mexican & Southwestern': { family: 'latin', mark: 'cactus' },
  'Latin American': { family: 'latin', mark: 'sun' },
  'Spanish & Tapas': { family: 'latin', mark: 'plates' },
  Indian: { family: 'latin', mark: 'thali' },
  'Middle Eastern & African': { family: 'latin', mark: 'skewer' },

  International: { family: 'other', mark: 'globe' },
  'Bar & Lounge': { family: 'other', mark: 'glass' },
};

/** The fallback, used when the index returns a group this build has never seen. */
const UNKNOWN_CUISINE = { family: 'other', mark: 'globe' } as const;

/**
 * Resolves a `cuisine_group` to its tile appearance.
 *
 * Falls back rather than throwing, because the taxonomy belongs to the index: adding a cuisine group
 * upstream should degrade to a neutral tile, not break the results page.
 */
export function cuisineVisual(group: string): {
  family: CuisineFamily;
  mark: CuisineMark;
  colorClass: string;
} {
  const visual = CUISINE_VISUALS[group] ?? UNKNOWN_CUISINE;
  return { ...visual, colorClass: FAMILY_CLASS[visual.family] };
}
