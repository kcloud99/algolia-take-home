import { deriveChainFields } from './chain.js';
import type { CuisineGroup } from './cuisine.js';
import { deriveCuisineFields } from './cuisine.js';
import { deriveLocationFields } from './location.js';
import { normalizeScalars } from './normalize-scalars.js';
import type { PriceTier } from './normalize-scalars.js';
import { deriveQualityFields } from './quality.js';
import type { QualityContext } from './quality.js';
import type { JoinedRestaurant } from './types.js';
import { deriveVibeTags } from './vibes.js';
import type { VibeContext, VibeTag } from './vibes.js';

/**
 * One Algolia record. Flat apart from `location` and `_geoloc`, which the engine requires nested.
 *
 * A `type` rather than an `interface` so it satisfies the client's `Record<string, unknown>`
 * parameter — TypeScript gives implicit index signatures to type aliases but not to interfaces.
 */
export type RestaurantRecord = {
  objectID: string;

  // identity
  name: string;
  chain_name: string | null;
  location_label: string | null;
  is_chain: boolean;
  chain_location_count: number;

  // taxonomy
  food_type: string;
  cuisines: string[];
  cuisine_group: CuisineGroup;
  dining_style: string;
  vibe_tags: VibeTag[];

  // location
  address: string;
  neighborhood: string;
  city: string;
  area: string;
  state: string;
  postal_code: string;
  country: string;
  location: { lvl0: string; lvl1: string; lvl2: string };
  _geoloc: { lat: number; lng: number };

  // price
  price_range: string;
  price_tier: PriceTier;
  price_conflict: boolean;

  // quality signals
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
  // No image field. Every one of the 5,000 source `image_url` values redirects to the same 2.2 KB
  // placeholder, so there is nothing to carry — and the app draws a cuisine tile rather than
  // substitute a stock photograph of a restaurant that is not this one.
  payment_options: string[];
  cash_only: boolean;
};

export interface RecordContext {
  quality: QualityContext;
  vibe: VibeContext;
  /** How often each candidate brand name occurs, needed to decide what counts as a chain. */
  chainCandidateCounts: ReadonlyMap<string, number>;
}

/**
 * Assembles one record from the per-field derivations. Every field here comes from a named
 * function that can be explained on its own; this is only the composition.
 */
export function buildRecord(joined: JoinedRestaurant, context: RecordContext): RestaurantRecord {
  const { json, csv, objectID } = joined;

  const scalars = normalizeScalars(joined);
  const cuisine = deriveCuisineFields(csv.food_type);
  const chain = deriveChainFields(json.name, context.chainCandidateCounts);
  const quality = deriveQualityFields(csv, context.quality);
  const place = deriveLocationFields(joined);

  const vibe_tags = deriveVibeTags(
    {
      diningStyle: csv.dining_style,
      priceTier: scalars.price_tier,
      bayesianRating: quality.bayesian_rating,
      reviewsCount: quality.reviews_count,
      cuisineGroup: cuisine.cuisine_group,
    },
    context.vibe,
  );

  return {
    objectID,
    name: json.name,
    ...chain,

    ...cuisine,
    dining_style: csv.dining_style,
    vibe_tags,

    ...place,
    postal_code: scalars.postal_code,

    price_range: scalars.price_range,
    price_tier: scalars.price_tier,
    price_conflict: scalars.price_conflict,

    ...quality,

    phone: scalars.phone,
    phone_e164: scalars.phone_e164,
    reserve_url: json.reserve_url,
    mobile_reserve_url: json.mobile_reserve_url,
    payment_options: json.payment_options,
    // Only 7 restaurants, but it is the one payment fact that changes whether you can eat there.
    cash_only: json.payment_options.includes('Cash Only'),
  };
}

/** Build-plan record limit. Ours are an order of magnitude under it, but the guard is free. */
const MAX_RECORD_BYTES = 10_000;

export function assertRecordIsIndexable(record: RestaurantRecord): number {
  const bytes = Buffer.byteLength(JSON.stringify(record), 'utf8');

  if (bytes > MAX_RECORD_BYTES) {
    throw new Error(`record ${record.objectID} is ${bytes} bytes, over the ${MAX_RECORD_BYTES} limit`);
  }
  if (typeof record.objectID !== 'string') {
    throw new Error(`record objectID must be a string, got ${typeof record.objectID}`);
  }
  // Strings here fail silently in Algolia: no error, just no geo ranking at all.
  if (typeof record._geoloc.lat !== 'number' || typeof record._geoloc.lng !== 'number') {
    throw new Error(`record ${record.objectID} has non-numeric _geoloc`);
  }

  return bytes;
}
