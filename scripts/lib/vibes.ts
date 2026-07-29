import type { CuisineGroup } from './cuisine.js';
import type { PriceTier } from './normalize-scalars.js';
import { parseReviewCount, percentile } from './quality.js';
import type { RawCsvRow } from './types.js';

/**
 * Vibe tags.
 *
 * One sentence: each tag is a *combination* of dining style, price, rating and review volume
 * that answers a question a diner actually asks — and only combinations, because anything a
 * single field already answers is served better by that field's own facet.
 *
 * These are heuristics, not ground truth. The dataset ships no inspirational axis at all, and
 * the discovery persona needs one. In production these would come from menu data, review text,
 * or an enrichment pass over OpenTable's own reviews.
 */

export type VibeTag =
  | 'date-night'
  | 'special-occasion'
  | 'budget-friendly'
  | 'crowd-favorite'
  | 'hidden-gem'
  | 'good-for-groups';

/** Cuisines built around shared plates — the honest editorial judgement in this module. */
const SHAREABLE_CUISINES: ReadonlySet<CuisineGroup> = new Set<CuisineGroup>([
  'Italian',
  'Barbecue',
  'Fondue',
  'Spanish & Tapas',
  'Chinese',
  'Latin American',
  'Mexican & Southwestern',
  'Southern & Creole',
  'Indian',
  'Thai',
  'Asian',
]);

/** Well-rated, on the smoothed scale. Roughly the top 44% — a floor, not a badge. */
const WELL_RATED = 4.4;
/** Excellent. Roughly the top 8%. */
const EXCELLENT = 4.5;

export interface VibeContext {
  /** p90 review count: busy enough that the crowd has clearly found it. */
  crowdFavouriteReviews: number;
  /** p50 review count: below this a restaurant is still under the radar. */
  underTheRadarReviews: number;
}

export interface VibeInput {
  diningStyle: string;
  priceTier: PriceTier;
  bayesianRating: number;
  reviewsCount: number;
  cuisineGroup: CuisineGroup;
}

/** Thresholds come from the data's own distribution, so they stay valid if it is refreshed. */
export function computeVibeContext(rows: RawCsvRow[]): VibeContext {
  const reviewCounts = rows.map((row) => parseReviewCount(row.reviews_count));
  return {
    crowdFavouriteReviews: percentile(reviewCounts, 90),
    underTheRadarReviews: percentile(reviewCounts, 50),
  };
}

export function deriveVibeTags(input: VibeInput, context: VibeContext): VibeTag[] {
  const { diningStyle, priceTier, bayesianRating, reviewsCount, cuisineGroup } = input;
  const tags: VibeTag[] = [];

  // Dressed up and worth the evening — not merely expensive.
  if (isDressedUp(diningStyle) && bayesianRating >= WELL_RATED) {
    tags.push('date-night');
  }

  // The top price band, or fine dining good enough to justify the occasion.
  if (priceTier === 4 || (diningStyle === 'Fine Dining' && bayesianRating >= EXCELLENT)) {
    tags.push('special-occasion');
  }

  // Cheap *and* good. Cheap alone is 62% of the index and tells a diner nothing.
  if (priceTier === 2 && bayesianRating >= WELL_RATED) {
    tags.push('budget-friendly');
  }

  if (reviewsCount >= context.crowdFavouriteReviews) {
    tags.push('crowd-favorite');
  }

  // Well-rated but not yet found — the discovery persona's whole reason for browsing.
  if (bayesianRating >= WELL_RATED && reviewsCount < context.underTheRadarReviews) {
    tags.push('hidden-gem');
  }

  // Shared plates, at a price a table of six will actually agree to.
  if (SHAREABLE_CUISINES.has(cuisineGroup) && priceTier <= 3) {
    tags.push('good-for-groups');
  }

  return tags;
}

function isDressedUp(diningStyle: string): boolean {
  return diningStyle === 'Fine Dining' || diningStyle === 'Casual Elegant';
}
