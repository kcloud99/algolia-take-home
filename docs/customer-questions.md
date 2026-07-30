# Customer questions

Three replies, written as they would be sent. Each incoming question is quoted above its answer.

---

## 1. George — "What are records and indexing? And what belongs in custom ranking?"

> I'm new to search engines and there are a lot of concepts I'm not educated on. It would help if you
> could define **records** and **indexing**. I'm also struggling to understand what types of metrics
> would be useful in the **custom ranking**.

Hi George,

Happy to help — these are the foundations, so they are worth nailing down early.

**A record** is one thing a person can find, stored as a JSON object. On a restaurant site, one
record is one restaurant: name, cuisine, neighborhood, rating, price. Two things worth knowing early.
Each record needs a unique `objectID` — Algolia can generate one, but supply your own, because it is
how you update or delete that record later. And a record holds everything the search needs, both what
you match on and what you display, so there is no join to do at query time.

**An index** is a collection of records *plus* the configuration for how they are searched:
searchable attributes, ranking, facets, synonyms. **Indexing** is the act of sending records to it or
updating them. If it helps: a record is a row, and an index is the table plus the rules for searching
it. The work happens when you index rather than when someone searches, which is why results come back
in milliseconds.

**Custom ranking** is the one people most often misread, so it is worth being precise: it is a
**tie-breaker, not a boost**. Algolia ranks by walking an ordered list of criteria — typos, then
distance, then how many of your words matched, and so on — and custom ranking is the last one, so it
only reorders results that everything before it left tied. It cannot rescue a poor text match, and it
does not need to.

That makes the useful metrics your numeric or boolean *business* signals — whatever makes one
equally-relevant result better than another:

- bookings, orders or clicks over a recent window
- a rating **weighted by how many reviews support it** (a 5.0 from three reviews is not a 5.0)
- recency, for anything time-sensitive
- availability or in-stock, as a boolean

One practical tip that saves a lot of head-scratching: **round or bucket the values.** If your first
custom-ranking attribute is nearly unique per record — a score with four decimals, a raw view count —
no two records ever tie on it, so your second and third attributes are never consulted. On a
restaurant index I built recently, rounding the rating to one decimal left 17 distinct values across
5,000 records, and that is what let a second signal (review volume) do any work at all. Coarse first,
finer second.

Happy to go through your own attributes and pick them out together — usually a 30-minute call.

Best,
Kyle

---

## 2. Matt — "I hate the new dashboard; clearing and deleting indices takes too many clicks"

> Sorry to give you the kind of feedback I know you do not want to hear, but I really hate the new
> dashboard design. Clearing and deleting indices are now several clicks away, and I need those
> features while iterating.

Hi Matt,

No apology needed — this is exactly the kind of feedback we want, and I would rather hear it than not.
I have passed it to the product team along with your use case, because "I do this repeatedly while
iterating" is the detail that makes a click count matter.

In the meantime, let me get you out of the dashboard for this entirely. Two faster paths:

**The Algolia CLI** — one command, no clicks:

```bash
algolia indices clear my_index -y     # empties it, keeps settings, rules and synonyms
algolia indices delete my_index -y    # removes it (add -r to take its replicas too)
```

`-y` skips the confirmation prompt and `-w` waits for the task to finish, which is handy in a script.

**Or your API client**, if that fits your loop better:

```js
await client.clearObjects({ indexName: 'my_index' });
await client.deleteIndex({ indexName: 'my_index' });
```

Either is worth wrapping in an npm script or a shell alias — `npm run reset` beats any number of
clicks.

One more thought, since you are iterating: point your scripts at a separate dev index and leave
production alone. Resetting then stops being a nervous moment, and you can rebuild as often as you
like. If it would help, send me your stack and I will write you the reset script.

Best,
Kyle

---

## 3. Leo — "Will integrating Algolia be a lot of development work?"

> I'm looking to integrate Algolia in my website. Will this be a lot of development work for me?
> What does the high-level process look like?

Hi Leo,

Short answer: less than most teams expect. A working search experience is usually days of work rather
than months. There are four steps.

1. **Get your data in.** Records go up through an API client (JavaScript, Python, PHP, Ruby, Go, Java,
   .NET and more), a no-code connector if your data lives in a platform or warehouse we already
   support, or the crawler if the content is on your site. This is normally the shortest step.
2. **Configure relevance.** Which attributes are searchable and in what order of importance, which
   ones become filters and facets, and what breaks ties between equally good matches. Typo tolerance,
   prefix search, plurals and accent handling are on by default, so there is nothing to build there.
3. **Build the UI.** InstantSearch gives you the search box, results, filters, pagination and URL
   state as ready components for React, Vue, Angular or plain JavaScript, which is where most of the
   time saving is. If you would rather own the markup, the API is right underneath.
4. **Measure.** Turn on analytics and send click and conversion events, so you can see what people
   search for, what they find, and what they do not.

Where the time actually goes is steps 2 and 3 — tuning relevance against your own catalogue and
polishing the interface — not the integration itself. Both are iterative, and both are the
interesting part.

If you can tell me what your data looks like, where it lives today, and which framework your site
uses, I can give you a much sharper number than "days" on a 30-minute call.

Best,
Kyle
