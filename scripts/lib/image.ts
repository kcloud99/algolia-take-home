import type { CuisineGroup } from './cuisine.js';

/**
 * Imagery.
 *
 * Every one of the 5,000 source `image_url` values 302s to the same 2.2 KB generic placeholder
 * on the customer's CDN. There is no usable photography in this dataset at all, which is worth
 * telling them — it is an operational finding, not just an inconvenience for the demo.
 *
 * The substitute is a small local image set keyed by cuisine group, **bundled rather than
 * hotlinked**: a live demo must not depend on a third party that can rate-limit us or go down
 * mid-presentation.
 */

/** Variants per cuisine group, so a page of Italian results is not the same photo 24 times. */
const VARIANTS_PER_CUISINE = 3;

const IMAGE_DIRECTORY = '/img/cuisine';

/**
 * Deterministic: the same restaurant always gets the same picture, across rebuilds and across
 * machines. A random assignment would reshuffle the grid on every reindex, which looks broken.
 */
export function deriveImageUrl(cuisineGroup: CuisineGroup, objectID: string): string {
  const variant = (stableHash(objectID) % VARIANTS_PER_CUISINE) + 1;
  return `${IMAGE_DIRECTORY}/${slugify(cuisineGroup)}-${String(variant).padStart(2, '0')}.jpg`;
}

/** Sum of character codes — not cryptographic, just stable and evenly spread enough. */
function stableHash(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash += character.codePointAt(0) ?? 0;
  }
  return hash;
}

/** `Spanish & Tapas` → `spanish-tapas`. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
