/**
 * Cuisine taxonomy.
 *
 * `food_type` ships 114 distinct values, 8 of which are composites like
 * `Creole / Cajun / Southern`. Splitting them makes each component searchable, but it does
 * not shrink the taxonomy — it grows to 116 atoms, with a long tail of values used once.
 * The rollup below is what turns that into a browsable facet.
 *
 * The rollup is editorial judgement, not ground truth. In production it would come from
 * OpenTable's own cuisine taxonomy; here it is hand-written so every decision is visible.
 */

/**
 * Group → the cuisines that roll up into it. Written this way round because it is the
 * direction a human reads and reviews; the lookup is inverted at module load.
 */
const GROUP_MEMBERS = {
  American: [
    'American',
    'Contemporary American',
    'Californian',
    'Northwest',
    'Comfort Food',
    'Burgers',
    'Breakfast',
    'Prime Rib',
    'Wild Game',
    'Low Country',
  ],
  'Southern & Creole': ['Southern', 'Contemporary Southern', 'Creole', 'Cajun'],
  Steakhouse: ['Steakhouse', 'Steak', 'Brazilian Steakhouse'],
  Barbecue: ['Barbecue'],
  Seafood: ['Seafood'],
  Italian: ['Italian', 'Contemporary Italian', 'Sicilian', 'Pizzeria'],
  French: ['French', 'Contemporary French', 'French American', 'Provencal', 'Bistro'],
  'Spanish & Tapas': ['Spanish', 'Tapas', 'Small Plates', 'Basque', 'Portuguese'],
  Mediterranean: ['Mediterranean', 'Greek'],
  'Middle Eastern & African': [
    'Middle Eastern',
    'Turkish',
    'Moroccan',
    'Persian',
    'Lebanese',
    'Syrian',
    'Afghan',
    'African',
    'Ethiopian',
    'South African',
  ],
  'Mexican & Southwestern': [
    'Mexican',
    'Contemporary Mexican',
    'Traditional Mexican',
    'Regional Mexican',
    'Tex-Mex',
    'Southwest',
    'Southwestern',
  ],
  'Latin American': [
    'Latin American',
    'Latin',
    'Cuban',
    'Puerto Rican',
    'Peruvian',
    'Argentinean',
    'Brazilian',
    'South American',
    'Caribbean',
  ],
  Japanese: ['Japanese', 'Sushi', 'Hibachi'],
  Chinese: ['Chinese', 'Dim Sum'],
  Thai: ['Thai'],
  Indian: ['Indian', 'Contemporary Indian', 'South Indian'],
  Asian: [
    'Asian',
    'Pan-Asian',
    'Contemporary Asian',
    'Southeast Asian',
    'Korean',
    'Vietnamese',
    'Filipino',
    'Burmese',
    'Pacific Rim',
    'Eurasian',
  ],
  European: [
    'European',
    'Contemporary European',
    'Modern European',
    'Continental',
    'German',
    'Austrian',
    'Swiss',
    'Belgian',
    'Scandinavian',
    'Russian',
    'Eastern European',
    'British',
    'English',
    'Irish',
    'Afternoon Tea',
  ],
  'Bar & Lounge': ['Gastro Pub', 'Bar', 'Lounge', 'Bottle Service', 'Wine Bar', 'Brewery', 'Beer Garden'],
  // A format rather than a cuisine, but 30 restaurants use it as their only descriptor and
  // it describes a genuinely distinct evening out, so it earns its own facet value.
  Fondue: ['Fondue'],
  'Hawaiian & Pacific': ['Hawaii Regional Cuisine', 'Hawaiian', 'Polynesian'],
  'Vegetarian & Organic': ['Organic', 'Vegetarian', 'Vegan'],
  International: [
    'International',
    'Global',
    'Fusion',
    'Eclectic',
    'Kosher',
    'Australian',
    'Modern Australian',
  ],
} as const satisfies Record<string, readonly string[]>;

export type CuisineGroup = keyof typeof GROUP_MEMBERS;

/** Exposed so the build can print the mapping for review rather than describing it. */
export const CUISINE_GROUP_MEMBERS: Readonly<Record<CuisineGroup, readonly string[]>> = GROUP_MEMBERS;

/** Inverted at load so a cuisine assigned to two groups is a startup failure, not a silent last-write-wins. */
const GROUP_BY_CUISINE: ReadonlyMap<string, CuisineGroup> = (() => {
  const lookup = new Map<string, CuisineGroup>();
  for (const [group, members] of Object.entries(GROUP_MEMBERS) as [CuisineGroup, readonly string[]][]) {
    for (const cuisine of members) {
      const existing = lookup.get(cuisine);
      if (existing !== undefined) {
        throw new Error(`cuisine "${cuisine}" is mapped to both "${existing}" and "${group}"`);
      }
      lookup.set(cuisine, group);
    }
  }
  return lookup;
})();

export interface CuisineFields {
  /** The raw CSV value, preserved so nothing is lost and the transformation stays provable. */
  food_type: string;
  /** Multi-value: searchable and precisely filterable. */
  cuisines: string[];
  /** Single coarse value: the browsable facet. */
  cuisine_group: CuisineGroup;
}

export function deriveCuisineFields(foodType: string): CuisineFields {
  const cuisines = splitCuisines(foodType);
  return { food_type: foodType, cuisines, cuisine_group: deriveCuisineGroup(cuisines) };
}

/**
 * `Creole / Cajun / Southern` → `["Creole", "Cajun", "Southern"]`.
 * Splitting on both separators makes every component independently searchable, so a query
 * for `small plates` reaches `Tapas / Small Plates`.
 */
export function splitCuisines(foodType: string): string[] {
  const parts = foodType
    .split(/[/,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error(`food_type produced no cuisines: ${JSON.stringify(foodType)}`);
  }
  return [...new Set(parts)];
}

/**
 * The first cuisine wins. In every composite in this dataset the leading value is the
 * primary one — `Mexican / Southwestern` is a Mexican restaurant, `Contemporary French /
 * American` is a French one — so "first listed is primary" is both simple and correct here.
 *
 * An unmapped cuisine throws, which keeps the rollup exhaustive by construction: new data
 * cannot quietly land in an unlabelled bucket.
 */
export function deriveCuisineGroup(cuisines: string[]): CuisineGroup {
  const primary = cuisines[0];
  if (primary === undefined) {
    throw new Error('cannot derive a cuisine group from an empty cuisine list');
  }

  const group = GROUP_BY_CUISINE.get(primary);
  if (group === undefined) {
    throw new Error(`cuisine "${primary}" has no group; add it to GROUP_MEMBERS in cuisine.ts`);
  }
  return group;
}
