/**
 * The markets the location control offers, and the coordinate each one resolves to.
 *
 * `label` is the index's own `location.lvl0` value verbatim, so the picker and the "Where" facet name
 * the same place the same way. They do different jobs, though, and the control's copy says which:
 * picking a market moves the **centre** the board is ranked around, it does not filter to it.
 *
 * **Each centre is the coordinate-wise median of that market's records**, computed from
 * `data/out/records.json` rather than looked up as a city-hall coordinate. "Near Denver" should mean
 * near the mass of Denver restaurants, and the median is robust to the one outlying suburb that would
 * drag a mean.
 *
 * The eight are chosen to span the density range, because that is what a location feature has to
 * survive. Record counts are per `area`, measured:
 *
 *   New York / Tri-State  1,414   the densest market, and the anchor the demo opens on
 *   Denver / Colorado       360
 *   San Diego               285
 *   San Francisco Bay       261
 *   Houston                 231   Perry's ×6 — a chain in one metro
 *   Portland / Oregon       197
 *   Pittsburgh               90   Atria's ×8 — the chain demo
 *   Fayetteville / NW Ark.    3   deliberately included: three restaurants in the whole market
 *
 * The last one is the point of the list. `aroundRadius: "all"` is what stops a three-record market
 * from rendering an empty page, and this is where that is demonstrable. Chicago would have been the
 * obvious choice for it — the project notes had planned on it — but this dataset contains no Chicago
 * at all: its three Illinois records are in Moline and Rock Island, which the data files under the
 * "Iowa" area.
 */
export type Market = {
  /** The index's `location.lvl0` value, used verbatim as the control's option label and value. */
  label: string;
  lat: number;
  lng: number;
};

/**
 * New York, and the reason is the demo rather than the diner: it is the densest market in the data, so
 * the board opening on it is never thin, and every figure quoted in this repo's docs is reproducible by
 * anyone who opens the deployed link. See `use-search-centre.ts` for why this is a plain default rather
 * than the last link of an automatic chain.
 */
export const DEFAULT_MARKET: Market = {
  label: 'New York / Tri-State Area',
  lat: 40.7562,
  lng: -73.984,
};

export const MARKETS: Market[] = [
  DEFAULT_MARKET,
  { label: 'Denver / Colorado', lat: 39.7214, lng: -105.0121 },
  { label: 'San Diego', lat: 32.7766, lng: -117.1755 },
  { label: 'San Francisco Bay Area', lat: 37.7879, lng: -122.4042 },
  { label: 'Houston', lat: 29.7491, lng: -95.4283 },
  { label: 'Portland / Oregon', lat: 45.5172, lng: -122.6799 },
  { label: 'Pittsburgh', lat: 40.4433, lng: -79.9969 },
  { label: 'Fayetteville / Northwest Arkansas', lat: 36.1377, lng: -94.1887 },
];
