/**
 * How a cuisine gets encoded visually: a drawn pictogram, in the guide's symbol-key grammar.
 *
 * The source data has no photography at all — every one of the 5,000 `image_url` values redirects
 * to the same 2.2 KB placeholder. Rather than substitute stock photographs of food that belongs to
 * other restaurants, the index encodes cuisine directly, which is both honest and the thing
 * DESIGN.md asks for.
 *
 * **Colour used to be the first level of this encoding and has been removed.** Each group also
 * carried one of eight saturated "line" colours, filled into a 40px tile — which put a column of
 * confetti down the left edge of the results and competed with the single accent the palette has.
 * The mark alone distinguishes the groups, the entry's meta line names the cuisine in words
 * directly beside it, and DESIGN.md's No-Confetti Rule now says so.
 *
 * `family` survives as the grouping that decides which mark a new cuisine should borrow — Japanese,
 * Asian, Chinese, Thai and Vegetarian are one family with five distinct marks — but it no longer
 * resolves to a colour.
 */

/** The coarse grouping a mark belongs to. Kept as taxonomy; it no longer carries a colour. */
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
 * Resolves a `cuisine_group` to its symbol.
 *
 * Falls back rather than throwing, because the taxonomy belongs to the index: adding a cuisine group
 * upstream should degrade to a neutral mark, not break the results page.
 */
export function cuisineVisual(group: string): { family: CuisineFamily; mark: CuisineMark } {
  return CUISINE_VISUALS[group] ?? UNKNOWN_CUISINE;
}
