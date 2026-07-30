import aa from 'search-insights';

/**
 * The Insights client, bundled rather than fetched.
 *
 * `<InstantSearch insights />` would work with no code at all — and it works by injecting a
 * `<script src="https://cdn.jsdelivr.net/npm/search-insights@…">` tag when no client is supplied. That is
 * the same trade this build already refused for the three font families and for the imagery: a demo
 * presented live on a call must not depend on a third party that can be slow, blocked or unreachable, and
 * a CDN script that fails takes the analytics story with it silently. `search-insights` is a 6 KB
 * dependency, so passing it in explicitly costs a bundled module and removes a runtime origin.
 *
 * Nothing else needs configuring. InstantSearch's insights middleware calls `init` with the app ID and
 * search key it already has, generates an anonymous `userToken`, persists it, and sends `view` events for
 * every result set on its own. Clicks and conversions are the two this app has to send deliberately, and
 * they come from the `sendEvent` the `Hits` widget hands each row.
 */
export const insightsClient = aa;
