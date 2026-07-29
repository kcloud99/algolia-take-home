import type { RawCsvRow } from './types.js';

/**
 * Quality signals for custom ranking.
 *
 * The defect this fixes is concrete: 21 restaurants hold a perfect 5.0 and 15 of them have
 * fewer than 20 reviews. Under `desc(stars_count)` the top of every result page is a 5.0 from
 * a single review, and Mama's Fish House — 4.8 from 12,669 reviews — is nowhere near it.
 */

export interface QualityContext {
  /** `C`: the mean rating across the whole dataset, the value thin evidence is pulled toward. */
  globalMeanRating: number;
  /** `m`: how many reviews a restaurant needs before its own rating outweighs the global mean. */
  confidenceThreshold: number;
}

export interface QualityFields {
  /** Raw, for display only — never for ranking. */
  stars_count: number;
  /** Raw, for display only — never for ranking. */
  reviews_count: number;
  /** `floor(stars)`, for the "4 stars & up" facet. */
  rating_bucket: number;
  bayesian_rating: number;
  popularity_score: number;
}

/**
 * Derives `C` and `m` from the data rather than hardcoding them, so the pipeline stays correct
 * if the dataset is refreshed.
 *
 * `m` is the 25th percentile of review counts: a quarter of restaurants have less evidence than
 * this, and those are exactly the ones whose ratings should not be taken at face value. Raising
 * `m` makes the ranking more conservative — it is the single knob for how much evidence you
 * demand before trusting a rating.
 */
export function computeQualityContext(rows: RawCsvRow[]): QualityContext {
  const ratings = rows.map((row) => parseRating(row.stars_count));
  const reviewCounts = rows.map((row) => parseReviewCount(row.reviews_count));

  return {
    globalMeanRating: ratings.reduce((sum, value) => sum + value, 0) / ratings.length,
    confidenceThreshold: percentile(reviewCounts, 25),
  };
}

export function deriveQualityFields(row: RawCsvRow, context: QualityContext): QualityFields {
  const stars_count = parseRating(row.stars_count);
  const reviews_count = parseReviewCount(row.reviews_count);

  return {
    stars_count,
    reviews_count,
    rating_bucket: Math.floor(stars_count),
    bayesian_rating: bayesianRating(stars_count, reviews_count, context),
    popularity_score: popularityScore(reviews_count),
  };
}

/**
 * Shrinkage toward the global mean:
 *
 *   (v / (v + m)) * R  +  (m / (v + m)) * C
 *
 * A restaurant with many reviews keeps its own rating; one with few is pulled toward the mean.
 *
 * **Rounded to one decimal on purpose.** Two decimals would give near-unique values, records
 * would essentially never tie on the first custom-ranking attribute, and `popularity_score`
 * would be dead code. Creating ties deliberately is what lets the next signal speak.
 */
export function bayesianRating(
  rating: number,
  reviewCount: number,
  { globalMeanRating, confidenceThreshold }: QualityContext,
): number {
  const weight = reviewCount / (reviewCount + confidenceThreshold);
  const smoothed = weight * rating + (1 - weight) * globalMeanRating;
  return Math.round(smoothed * 10) / 10;
}

/**
 * Review counts run from 1 to 12,669 with a heavy tail, so raw values would let a handful of
 * famous restaurants win every tie-break. Log-scaling compresses the tail into roughly 0–41,
 * and rounding creates the ties the next criterion needs.
 */
export function popularityScore(reviewCount: number): number {
  return Math.round(Math.log10(reviewCount + 1) * 10);
}

export function parseRating(value: string): number {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error(`stars_count is not a rating between 0 and 5: ${JSON.stringify(value)}`);
  }
  return rating;
}

export function parseReviewCount(value: string): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`reviews_count is not a non-negative integer: ${JSON.stringify(value)}`);
  }
  return count;
}

/** Nearest-rank percentile: the smallest value at or above which `p`% of the data sits. */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((p / 100) * sorted.length);
  const value = sorted[Math.min(index, sorted.length - 1)];
  if (value === undefined) {
    throw new Error('cannot take a percentile of an empty dataset');
  }
  return value;
}
