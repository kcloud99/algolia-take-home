/**
 * Query rules, as code.
 *
 * Rules apply at query time: no reindex, instantly reversible, and each carries an optional
 * validity window. That is the property worth explaining to a team whose current relevance changes
 * need a deploy — this is the layer a merchandising or content team can own.
 *
 * Two shapes here. The intent rules turn a mood word the data does not contain into a filter or a
 * boost over `vibe_tags`. The cuisine rule turns a matched query word into a visible facet
 * refinement, which is intent detection with no NLP of our own.
 */
import type { Rule } from 'algoliasearch';

/**
 * Intent phrases have to be stripped whole, not just the intent word: stripping "cheap" from
 * `cheap eats` leaves "eats", which matches 547 restaurants including *East End Kitchen* on a
 * typo. A confidently wrong page is worse than the empty one it replaced.
 *
 * The mechanism matters, and it is not what the design assumed. `query.remove` only strips words
 * that were **part of the matched condition pattern** — a `remove` entry for a word the pattern
 * did not match is silently ignored. Verified directly: with a rule conditioned on `cheap` and
 * `remove: ['cheap', 'eats']`, the query `cheap eats` still parses to `"eats"`.
 *
 * So each filler phrase has to appear as its own condition. `cheap eats` parses to `""`, while
 * `cheap italian` still parses to `"italian"` — the cuisine survives, only the intent words go.
 */
function anchored(...patterns: string[]) {
  return patterns.map((pattern) => ({ pattern, anchoring: 'contains' as const, alternatives: true }));
}

export const rules: Rule[] = [
  {
    objectID: 'intent-budget',
    description: 'Budget intent -> cheapest price band',
    // Longest phrases first. Each filler combination needs its own condition, because only the
    // matched pattern is removable.
    conditions: anchored(
      'cheap eats', 'cheap food', 'cheap restaurant',
      'budget eats', 'budget food',
      'cheap', 'budget', 'affordable', 'inexpensive',
    ),
    consequence: {
      params: {
        query: {
          remove: ['cheap', 'budget', 'affordable', 'inexpensive', 'eats', 'food', 'restaurant'],
        },
        // A hard filter, and deliberately so: "cheap" is a constraint a diner is stating about
        // their wallet, not a preference to be weighed. Showing them a $50-and-over restaurant
        // because it scored well is not being helpful.
        //
        // Filtering on `vibe_tags:budget-friendly` — cheap *and* well-rated, 1,107 records — was
        // the tempting alternative, since 62% of this index sits in the cheapest band and the tag
        // exists precisely because "cheap" alone is uninformative. Rejected: the diner asked about
        // price, and custom ranking already floats the best cheap restaurants to the top, so
        // filtering by our own inferred quality would silently hide 2,000 places they asked for.
        filters: 'price_tier = 2',
      },
      userData: { banner: 'Showing restaurants in the $30 and under band' },
    },
  },

  {
    objectID: 'intent-occasion',
    description: 'Romantic / date night / birthday / anniversary -> occasion dining',
    conditions: anchored(
      'romantic dinner', 'birthday dinner', 'anniversary dinner', 'celebration dinner',
      'date night', 'romantic', 'intimate', 'birthday', 'anniversary', 'celebration', 'celebrate',
    ),
    consequence: {
      params: {
        query: {
          remove: [
            'romantic', 'date', 'night', 'intimate', 'dinner',
            'birthday', 'anniversary', 'celebration', 'celebrate',
          ],
        },
        // Two compromises here, both forced by the Build plan and both worth naming out loud.
        //
        // 1. This should be `optionalFilters` — a boost — because "romantic" is a preference and
        //    `vibe_tags` are our inference, not ground truth. Optional filters inside Rules are a
        //    paid feature; Build returns a 402. A hard filter is tolerable only because the tags
        //    are broad (1,509 + 480 restaurants), so the diner still gets a full page.
        // 2. Date-night and special-occasion were designed as two rules. Build allows three rules
        //    per index in total, so they are merged. They overlap heavily here — both are driven
        //    by dining style and rating — which is what makes the merge acceptable rather than
        //    merely convenient.
        //
        // On Grow this splits back into two rules, each with its own scored `optionalFilters`.
        filters: 'vibe_tags:date-night OR vibe_tags:special-occasion',
      },
      userData: { banner: 'Leading with restaurants that suit the occasion' },
    },
  },

  {
    objectID: 'cuisine-intent',
    description: 'Turn a cuisine word into a visible facet refinement',
    // The facet placeholder: this rule fires only when some word in the query is an actual value
    // of `cuisine_group`, which makes it self-limiting. Algolia rejects `automaticFacetFilters` on
    // a rule with no condition, and rightly so — it needs something to match against.
    conditions: [{ pattern: '{facet:cuisine_group}', anchoring: 'contains' }],
    consequence: {
      params: {
        // The highest-value rule in the set. `italian denver` becomes cuisine_group:Italian plus
        // the text "denver", which the searchable city and area attributes resolve. The refinement
        // appears in the UI, so the diner can see what the engine inferred and undo it — intent
        // detection that is visible beats intent detection that is magic.
        //
        // `city` is deliberately NOT in this list. It would cut `atrias pittsburgh` from the 8
        // restaurants in the Pittsburgh metro to the 3 whose city field literally says Pittsburgh,
        // losing Mount Lebanon, Wexford, Gibsonia, McMurray and Murrysville. `area` is no better:
        // its values are compound strings like "Denver / Colorado". Location stays as text, where
        // the searchable-attribute tiers already handle it.
        automaticFacetFilters: [{ facet: 'cuisine_group', disjunctive: false }],
      },
    },
  },
];
