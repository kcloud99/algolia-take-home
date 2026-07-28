import type { JoinedRestaurant } from './types.js';

/**
 * Price bands, kept on the source system's 2–4 scale rather than renumbered to 1–3.
 * The JSON `price` field never contains 1, so preserving the scale keeps our values
 * directly comparable to the customer's own numbers.
 */
export type PriceTier = 2 | 3 | 4;

const PRICE_TIER_BY_RANGE: Record<string, PriceTier> = {
  '$30 and under': 2,
  '$31 to $50': 3,
  '$50 and over': 4,
};

/** The single format every phone number in the CSV uses, e.g. `(216) 378-8988`. */
const US_PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}/;

export interface ScalarFields {
  postal_code: string;
  phone: string;
  phone_e164: string;
  price_range: string;
  price_tier: PriceTier;
  price_conflict: boolean;
}

/**
 * Reduces both sources to one clean set of scalar fields per restaurant.
 * `objectID` is already a string — the join produced it — so it is not re-coerced here.
 */
export function normalizeScalars(joined: JoinedRestaurant): ScalarFields {
  const price_range = joined.csv.price_range;
  const price_tier = derivePriceTier(price_range);
  const phone = normalizePhone(joined.csv.phone_number);

  return {
    postal_code: normalizePostalCode(joined.json.postal_code),
    phone,
    phone_e164: toE164Phone(phone),
    price_range,
    price_tier,
    // The JSON `price` field is dropped, but where the two sources disagree we record it.
    // Costs nothing, and turns a silent data problem into one we can count for the customer.
    price_conflict: joined.json.price !== price_tier,
  };
}

/**
 * 62 records carry ZIP+4. Truncating to the 5-digit code keeps the postal facet from
 * splitting one area into two values.
 */
export function normalizePostalCode(postalCode: string): string {
  const match = /^\d{5}/.exec(postalCode);
  if (match === null) {
    throw new Error(`postal_code is not a US ZIP code: ${JSON.stringify(postalCode)}`);
  }
  return match[0];
}

/**
 * The CSV is the phone source: half the JSON values carry a trailing `x` fragment.
 * The CSV is cleaner but not clean — 67 values end in a stray ` e` — so we keep only
 * the leading `(NNN) NNN-NNNN`. Anything that does not match that shape stops the build,
 * rather than surfacing a truncated extension in the UI.
 */
export function normalizePhone(phoneNumber: string): string {
  const match = US_PHONE_PATTERN.exec(phoneNumber);
  if (match === null) {
    throw new Error(`phone_number is not in the expected format: ${JSON.stringify(phoneNumber)}`);
  }
  return match[0];
}

/** Dialable form for `tel:` links. Every record is US, so the country code is always +1. */
export function toE164Phone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    throw new Error(`expected 10 digits for a US phone, got ${digits.length}: ${phone}`);
  }
  return `+1${digits}`;
}

/**
 * `price_range` (CSV) is canonical because it is the human-readable string we display;
 * deriving the numeric tier from it means the displayed band and the filter can never
 * disagree. An unrecognised band stops the build instead of becoming `undefined`.
 */
export function derivePriceTier(priceRange: string): PriceTier {
  const tier = PRICE_TIER_BY_RANGE[priceRange];
  if (tier === undefined) {
    throw new Error(`unrecognised price_range: ${JSON.stringify(priceRange)}`);
  }
  return tier;
}
