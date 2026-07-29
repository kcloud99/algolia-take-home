/**
 * Synonyms, as code.
 *
 * Kept deliberately short. Over-synonymising is the fastest way to destroy precision: every
 * synonym widens what a query matches, and a diner who searches for one thing and is shown another
 * loses trust in the whole result set. Each entry below exists because the dataset uses a word the
 * diner does not, or vice versa.
 *
 * TypeScript rather than a plain JSON file so a malformed entry fails at compile time. Algolia
 * accepts a structurally wrong synonym without complaint and simply never applies it.
 */
import type { SynonymHit } from 'algoliasearch';

export const synonyms: SynonymHit[] = [
  // The dataset spells this "Barbecue" and never "BBQ", so without this the most natural query for
  // the cuisine returns only the four restaurants with BBQ in their name.
  {
    objectID: 'bbq',
    type: 'synonym',
    synonyms: ['bbq', 'barbecue', 'barbeque', 'bar-b-q', 'bar-b-que'],
  },

  // `Steak` (123 records) and `Steakhouse` (328) are separate values in the source taxonomy for no
  // reason a diner would recognise. "chophouse" is the term the category itself uses.
  {
    objectID: 'steak',
    type: 'synonym',
    synonyms: ['steak', 'steakhouse', 'chophouse'],
  },

  // The cuisine is stored as "Tapas / Small Plates", so both halves must reach it. This is the
  // multi-word case `alternativesAsExact: multiWordsSynonym` exists for — without that, matching
  // via this synonym would lose the exact criterion to a single-word coincidence.
  {
    objectID: 'small-plates',
    type: 'synonym',
    synonyms: ['tapas', 'small plates'],
  },

  // City abbreviations are one-way on purpose: "nyc" should find New York, but someone typing
  // "new york" has been specific and should not have their query reshaped by an abbreviation they
  // did not use.
  { objectID: 'nyc', type: 'oneWaySynonym', input: 'nyc', synonyms: ['new york'] },
  { objectID: 'sf', type: 'oneWaySynonym', input: 'sf', synonyms: ['san francisco'] },
  { objectID: 'nola', type: 'oneWaySynonym', input: 'nola', synonyms: ['new orleans'] },
  { objectID: 'pdx', type: 'oneWaySynonym', input: 'pdx', synonyms: ['portland'] },

  // `sushi -> japanese` was in the design and is deliberately absent. Measured both ways: it takes
  // `sushi` from 106 hits to 221 by admitting the whole Japanese group. Custom ranking holds the
  // top of the page, so the first few results stay sushi either way — but the tail fills with
  // teppanyaki and ramen. A diner who typed "sushi" was being specific, and broadening a precise
  // query is not a favour.
];
