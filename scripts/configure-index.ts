/**
 * Every index setting, as code.
 *
 * Run with `npm run index:config`. Nothing here is ever clicked into the dashboard: configuration
 * that lives in a commit is reproducible, reviewable and diffable, and it means the index can be
 * rebuilt from a clone rather than from somebody's memory.
 *
 * Settings are applied in one `setSettings` call and waited on, because the settings API is
 * asynchronous — testing relevance before the task completes tests the previous configuration.
 */
import type { IndexSettings } from 'algoliasearch';

import { client, indexName } from './lib/algolia.js';

const indexSettings: IndexSettings = {
  // ── What is searchable, and how strongly ────────────────────────────────
  // Order is the ranking signal: a match in an earlier line beats a match in a later one on the
  // `attribute` criterion. Attributes on the same line are equally important.
  searchableAttributes: [
    // The known-item persona lives here. `unordered` so word position inside the name is
    // ignored — a diner typing "chris ruths" is looking for Ruth's Chris.
    'unordered(name)',
    // `chain_name` is deliberately absent, against the original design. It was measured across all
    // 27 test queries and changed nothing: not one result set or ordering moved. That is
    // structural rather than lucky — a brand name is always a substring of the restaurant name it
    // came from, and `name` sits on an earlier line, so the name match already wins the attribute
    // criterion. It stays in `attributesForFaceting`, which is what the brand facet needs.
    // One tier: both express cuisine intent, and neither should outrank the other.
    'cuisines,food_type',
    // One tier, so "italian in soho" and "seafood portland" work on text alone with no filter.
    // Keeping these below cuisine means a restaurant *named* Denver never outranks a real
    // restaurant in Denver.
    'neighborhood,city,area,state',
    // Last: street names are noisy and produce coincidental matches ("Church", "Market").
    'address',
  ],

  // Deliberately not searchable: URLs, image paths, postal codes, phone numbers and every numeric
  // ranking field. They inflate the index and produce matches no diner intended.

  // ── What can be filtered and faceted ────────────────────────────────────
  // A facet missing from this list renders empty in the UI with no error, so this is the first
  // place to look when a refinement list is blank.
  attributesForFaceting: [
    'searchable(cuisines)', // 116 values — too many to scan, so facet search is required
    'cuisine_group', // 23 values — the browsable rollup
    'dining_style',
    'price_range',
    'price_tier',
    'rating_bucket',
    'searchable(chain_name)', // 158 brands
    'searchable(city)', // 948 values
    'searchable(neighborhood)', // 1,267 values
    'area',
    'state',
    // The location drill-down. Each level is a separate attribute holding the full path, which is
    // what disambiguates ten different neighborhoods called Downtown.
    'location.lvl0',
    'location.lvl1',
    'location.lvl2',
    'vibe_tags',
    'filterOnly(payment_options)', // filterable, but never shown as a facet list
    'filterOnly(price_conflict)', // internal data-quality flag, not user-facing
    'filterOnly(objectID)', // for pinning and record lookups
  ],

  // ── Chain grouping ──────────────────────────────────────────────────────
  // `attributeForDistinct` has to be a setting, but `distinct` is a query parameter — so one index
  // serves both personas. Off by default because collapsing chains is a user-visible choice, not a
  // hidden behaviour: someone searching "Ruth's Chris" wants one row, someone browsing steakhouses
  // wants to see the individual restaurants near them. The survivor of each group is chosen by the
  // full ranking formula, so with geo active the nearest branch represents the brand for free.
  attributeForDistinct: 'chain_name',
  distinct: false,

  // ── The final tie-breaker ───────────────────────────────────────────────
  // Custom ranking only breaks ties; it cannot boost a record past one that won on an earlier
  // criterion. Both values are deliberately coarse — 17 distinct ratings and 38 popularity scores
  // across 5,000 records — so that records actually tie on the first attribute and the second one
  // gets to decide. A raw float rating would be near-unique and would make popularity dead code.
  customRanking: ['desc(bayesian_rating)', 'desc(popularity_score)'],

  // `ranking` is deliberately left at the Algolia default:
  //   typo -> geo -> words -> filters -> proximity -> attribute -> exact -> custom
  // Reordering it is how you break a hundred queries you did not test to fix the one you did.

  // ── Typo tolerance ──────────────────────────────────────────────────────
  // The two word-size thresholds are Algolia's defaults, set explicitly because they are
  // load-bearing here rather than incidental: `benihanna` is 9 characters so it gets the two
  // typos it needs, and `melting pott` gets one on a short word.
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,
  // Otherwise `Latitude 41` matches `Latitude 45`, and a diner searching a postal code or a street
  // number gets neighbouring numbers back. Digits are exact or they are wrong.
  allowTyposOnNumericTokens: false,

  // ── Query strategy ──────────────────────────────────────────────────────
  // Only the last word is a prefix, which is the correct as-you-type behaviour: `capital gr`
  // finds The Capital Grille while `gr capital` does not pull in every restaurant starting "gr".
  queryType: 'prefixLast',

  // When a multi-word query would return nothing, retry with every word optional. The `words`
  // criterion then ranks by how many query terms each record matched, so the best partial overlap
  // wins instead of the diner getting an empty page. Chosen over `lastWords` because our queries
  // are conversational ("italian in soho") rather than brand-first.
  removeWordsIfNoResults: 'allOptional',

  // Measured, not assumed. 438 restaurant names use "&" and 190 spell out "and", so a diner typing
  // "bar and grill" was seeing 22 of the 67 matching restaurants — a silently truncated page,
  // which is more dangerous than an empty one because nobody reports it. Making the word optional
  // returns all 67 while the `words` criterion still ranks the literal "and" spellings first.
  // `removeWordsIfNoResults` cannot fix this: that query already had results, so it never fires.
  // The same test on "the" changed no query for the better, so "the" is not in this list.
  optionalWords: ['and'],

  ignorePlurals: true,

  // Reversed from the original design, on evidence. The design said `false`, reasoning that 375
  // names begin with a stop word so stripping them would hide The Melting Pot and The Capital
  // Grille. Measured, that does not happen — those records still match on their distinctive
  // words, and both queries return an identical top 3 either way.
  //
  // What `false` does cost is conversational location queries, which are the discovery persona's
  // whole behaviour. With stop words kept, "italian in soho" returns 1,069 hits led by
  // In Vino Wine Bar: it matches "in" + "italian" for a word count of 2, exactly tying the SoHo
  // restaurants that match "soho" + "italian", so being genuinely in SoHo confers no advantage.
  // Removing stop words returns 20 hits, all of them Italian restaurants in SoHo.
  //
  // The residual cost, stated honestly: "the kitchen" keeps the right result at #1 but drops that
  // brand's Denver and Boulder locations out of the top 3. Chain grouping collapses them to one
  // row anyway, and losing rank is cheaper than losing a whole class of query.
  removeStopWords: true,

  // Several text-processing features are language-aware and quietly no-op without these.
  queryLanguages: ['en'],
  indexLanguages: ['en'],

  // `multiWordsSynonym` is the addition: without it "small plates" matching via synonym loses the
  // exact criterion to a single-word coincidence.
  alternativesAsExact: ['ignorePlurals', 'singleWordSynonym', 'multiWordsSynonym'],

  // `separatorsToIndex` is deliberately absent, against the original design, which called for
  // "&'-" because 438 names carry an ampersand and 942 an apostrophe. Measured across all 27 test
  // queries it changed one query by one hit and no ordering at all. Both characters are already
  // stripped from queries and records alike, so they match without help; indexing a separator only
  // pays when the character is itself the distinguishing token, as in "C++" or "AT&T".
};

const { taskID } = await client.setSettings({ indexName, indexSettings });
// Settings are applied asynchronously. Without this wait, the verification below — and any
// relevance test that follows — reads the previous configuration.
await client.waitForTask({ indexName, taskID });
console.log(`applied settings to "${indexName}" (task ${taskID})\n`);

// ── Verify against the live index, rather than trusting the write ─────────
const applied = await client.getSettings({ indexName });
console.log('searchable attributes, in priority order:');
applied.searchableAttributes?.forEach((attribute, index) => {
  console.log(`  ${index + 1}. ${attribute}`);
});
console.log(`\ncustom ranking: ${applied.customRanking?.join(', ')}`);
console.log(`attribute for distinct: ${applied.attributeForDistinct}`);

// A facet that returns no values is the single most common silent misconfiguration, so the
// config script proves they are populated instead of leaving it to the UI to discover.
const FACETS_TO_CHECK = ['cuisine_group', 'price_range', 'dining_style', 'rating_bucket', 'vibe_tags'];
const faceted = await client.searchSingleIndex({
  indexName,
  searchParams: { query: '', hitsPerPage: 0, facets: FACETS_TO_CHECK, maxValuesPerFacet: 100 },
});

console.log('\nfacets returning values:');
for (const facet of FACETS_TO_CHECK) {
  const values = faceted.facets?.[facet] ?? {};
  const top = Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([value, count]) => `${value} (${count.toLocaleString()})`)
    .join(', ');
  console.log(`  ${facet.padEnd(14)}${String(Object.keys(values).length).padStart(3)} values  ${top}`);

  if (Object.keys(values).length === 0) {
    throw new Error(`facet "${facet}" returned no values — check attributesForFaceting`);
  }
}
