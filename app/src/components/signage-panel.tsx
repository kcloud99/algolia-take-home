import { DynamicWidgets, useNumericMenu } from 'react-instantsearch';

import { FacetList } from './facet-list';
import { FacetPanel } from './facet-panel';
import { LocationMenu } from './location-menu';
import { humanizeTag } from '../lib/labels';

/**
 * Both hoisted to module scope so their references are stable. An array literal recreated on every
 * render reads to an InstantSearch connector hook as changed parameters, which tears the widget down
 * and re-adds it in a loop until the page stops responding.
 */
const LOCATION_ATTRIBUTES = ['location.lvl0', 'location.lvl1', 'location.lvl2'];
const RATING_ITEMS = [{ label: 'Any rating' }, { label: '4 stars and up', start: 4 }];

/**
 * The signage panel — the facet rail.
 *
 * Wrapped in `DynamicWidgets`, which is the whole point of having configured `renderingContent` on
 * the index in step 2.6. The **index** decides which facets appear and in what order; this file only
 * says what each one looks like. Reordering the rail is then a settings change rather than a deploy,
 * which is the same argument as Rules: the team that owns the experience should not need engineering
 * to move a sidebar. Hard-coding the order here would throw that away.
 *
 * Verified against the live index, which returns:
 *   cuisine_group → price_range → rating_bucket → vibe_tags → dining_style → location.lvl0
 *
 * `payment_options` is deliberately absent. It is declared `filterOnly`, so it returns no facet
 * counts at all — confirmed by querying the index, where asking for it as a facet returns nothing. A
 * refinement list on it would render empty with no error, which is Algolia non-negotiable #7 and the
 * first thing to check when a facet is blank.
 *
 * Each `FacetPanel` wraps exactly one child, because `DynamicWidgets` finds a child's `attribute` by
 * recursing through single-child wrappers and throws if a wrapper holds more than one.
 */
export function SignagePanel() {
  return (
    <div className="bg-porcelain px-4 py-2">
      <DynamicWidgets>
        <FacetPanel title="Cuisine">
          {/* 23 groups: enough to need a "show more", few enough not to need facet search. The
              precise 116-value `cuisines` attribute is reached through autocomplete instead. */}
          <FacetList attribute="cuisine_group" limit={8} showMoreLimit={23} />
        </FacetPanel>

        <FacetPanel title="Price">
          {/* Values arrive pre-ordered by `renderingContent` — "$30 and under" before "$31 to $50" —
              because alphabetical ordering of a money scale is only ever correct by luck. */}
          <FacetList attribute="price_range" />
        </FacetPanel>

        <FacetPanel title="Rating">
          {/* `attribute` here is load-bearing rather than decoration: it is what `DynamicWidgets`
              reads to place this panel. */}
          <RatingFilter attribute="rating_bucket" />
        </FacetPanel>

        <FacetPanel title="Good for">
          <FacetList attribute="vibe_tags" formatLabel={humanizeTag} />
        </FacetPanel>

        <FacetPanel title="Dining style">
          {/* "Home Style" is hidden by `renderingContent`: 26 records out of 5,000 is a dead end for
              whoever clicks it. */}
          <FacetList attribute="dining_style" />
        </FacetPanel>

        <FacetPanel title="Where">
          <LocationMenu attributes={LOCATION_ATTRIBUTES} />
        </FacetPanel>
      </DynamicWidgets>
    </div>
  );
}

/**
 * Rating is the one facet whose obvious control would be a lie.
 *
 * The distribution measured across all 5,000 records: bucket 4 holds **4,435 (89%)**, bucket 3 holds
 * 530, and buckets 1, 2 and 5 hold 3, 11 and 21. A checkbox list would offer five options where one
 * matches nine restaurants in ten.
 *
 * Worse, a "5 stars" option would be actively harmful: only 21 restaurants hold a perfect score and
 * **15 of those have fewer than 20 reviews**, so the control that looks like it finds the best
 * restaurants would in fact surface the least-evidenced ones in the catalogue. It is left out on
 * purpose, and that is the honest version of this filter.
 *
 * What remains is one meaningful option. The real quality work happens in the ranking — which is why
 * the adjusted rating exists — and this control is not pretending otherwise.
 *
 * Built from `useNumericMenu` because `react-instantsearch@7.41` exports no `NumericMenu` widget,
 * only the hook. Checked against the package rather than assumed.
 */
function RatingFilter({ attribute }: { attribute: string }) {
  const { items, refine } = useNumericMenu({ attribute, items: RATING_ITEMS });

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <label key={item.value} className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name={attribute}
            checked={item.isRefined}
            onChange={() => refine(item.value)}
            className="size-3.5 shrink-0 appearance-none rounded-full border border-steel checked:border-4 checked:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
          <span className={item.isRefined ? 'font-medium text-signal' : undefined}>{item.label}</span>
        </label>
      ))}
    </div>
  );
}
