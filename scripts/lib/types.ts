/**
 * The two source files, typed exactly as they arrive — no coercion, no cleanup.
 * Transformations happen downstream so the raw shape stays visible and auditable.
 */

/** One record from `restaurants_list.json`. */
export interface RawJsonRestaurant {
  /** An integer here but a string in the CSV — the join has to reconcile that. */
  objectID: number;
  name: string;
  address: string;
  area: string;
  city: string;
  country: string;
  image_url: string;
  mobile_reserve_url: string;
  payment_options: string[];
  phone: string;
  postal_code: string;
  price: number;
  reserve_url: string;
  state: string;
  _geoloc: { lat: number; lng: number };
}

/** One row from `restaurants_info.csv`. Every CSV value is a string until we convert it. */
export interface RawCsvRow {
  objectID: string;
  food_type: string;
  stars_count: string;
  reviews_count: string;
  neighborhood: string;
  phone_number: string;
  price_range: string;
  dining_style: string;
}

/** One restaurant with both sources attached. Every derived field is computed from this. */
export interface JoinedRestaurant {
  objectID: string;
  json: RawJsonRestaurant;
  csv: RawCsvRow;
}
