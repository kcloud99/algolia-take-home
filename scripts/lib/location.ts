import type { JoinedRestaurant } from './types.js';

/**
 * Location hierarchy.
 *
 * `neighborhood` alone is ambiguous: 185 records sit in a neighborhood called "Downtown",
 * spread across 10 different cities. A flat neighborhood facet would offer the user one
 * "Downtown" entry that means ten different places. The hierarchy scopes each level by its
 * parent, which is what makes the value meaningful.
 */

/** Algolia's hierarchical-facet convention: each level holds the full path to itself. */
const LEVEL_SEPARATOR = ' > ';

export interface LocationFields {
  neighborhood: string;
  city: string;
  area: string;
  state: string;
  country: string;
  address: string;
  location: { lvl0: string; lvl1: string; lvl2: string };
  _geoloc: { lat: number; lng: number };
}

export function deriveLocationFields({ json, csv }: JoinedRestaurant): LocationFields {
  const { area, city, state, country, address } = json;
  const neighborhood = csv.neighborhood;

  assertNoSeparator(area, 'area');
  assertNoSeparator(city, 'city');
  assertNoSeparator(neighborhood, 'neighborhood');

  return {
    neighborhood,
    city,
    area,
    state,
    country,
    address,
    location: {
      lvl0: area,
      lvl1: [area, city].join(LEVEL_SEPARATOR),
      lvl2: [area, city, neighborhood].join(LEVEL_SEPARATOR),
    },
    // Numbers, not strings. Strings fail silently in Algolia — no error, just no geo ranking.
    _geoloc: assertNumericGeoloc(json._geoloc, json.objectID),
  };
}

/** A value containing the separator would corrupt the path and split one place into two. */
function assertNoSeparator(value: string, field: string): void {
  if (value.includes(LEVEL_SEPARATOR.trim())) {
    throw new Error(`${field} contains the hierarchy separator: ${JSON.stringify(value)}`);
  }
}

function assertNumericGeoloc(
  geoloc: { lat: number; lng: number },
  objectID: number,
): { lat: number; lng: number } {
  if (typeof geoloc?.lat !== 'number' || typeof geoloc?.lng !== 'number') {
    throw new Error(`_geoloc for ${objectID} is not numeric: ${JSON.stringify(geoloc)}`);
  }
  return { lat: geoloc.lat, lng: geoloc.lng };
}
