/**
 * The shape of a record as the app reads it — the index's contract with the UI.
 *
 * Deliberately declared here rather than imported from `scripts/lib/record.ts`. The app is a
 * consumer of the index, not of the pipeline: it should compile against what the index returns, and
 * a pipeline refactor should not be able to change the UI's types without a visible edit here.
 *
 * `cuisine_group` and `vibe_tags` are typed as strings rather than as the pipeline's unions,
 * because the taxonomy is data the index owns. Adding a cuisine group upstream should not break the
 * frontend build; the UI handles unknown values with a fallback instead.
 *
 * Internal flags such as `price_conflict` are absent on purpose — they exist for data-quality
 * reporting, not for display.
 *
 * A `type` rather than an `interface`, matching `scripts/lib/record.ts`: TypeScript gives implicit
 * index signatures to type aliases but not to interfaces, and InstantSearch's hit generics are
 * constrained to `Record<string, ...>`.
 */
export type Restaurant = {
  objectID: string;

  // identity — `chain_name` is null for the ~88% of restaurants that belong to no brand
  name: string;
  chain_name: string | null;
  location_label: string | null;
  is_chain: boolean;
  chain_location_count: number;

  // taxonomy
  cuisines: string[];
  cuisine_group: string;
  dining_style: string;
  vibe_tags: string[];

  // location — `location.lvl*` carries the full `area > city > neighborhood` path at each level
  address: string;
  neighborhood: string;
  city: string;
  area: string;
  state: string;
  location: { lvl0: string; lvl1: string; lvl2: string };
  _geoloc: { lat: number; lng: number };

  // price — the band is the display string, the tier is what we filter and sort on
  price_range: string;
  price_tier: number;

  // quality — `bayesian_rating` is the honest signal; `stars_count` is what the diner recognises
  stars_count: number;
  reviews_count: number;
  rating_bucket: number;
  bayesian_rating: number;
  popularity_score: number;

  // contact and actions
  phone: string;
  phone_e164: string;
  reserve_url: string;
  mobile_reserve_url: string;
  cash_only: boolean;
};
