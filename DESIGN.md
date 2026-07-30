---
name: OpenTable Restaurant Search — The Guide
description: A restaurant guide's entry index, brought to the screen — typeset entries, a corrected score, and one accent taken from the customer's own mark.
---

# Design System: OpenTable Restaurant Search — "The Guide"

## Overview

**Creative North Star: "The Guide"**

A diner opens a restaurant guide to the index and reads down it. Each restaurant is an **entry** —
typeset, ranked, scored, and encoded with a symbol — not a row in a table. That is the whole system.
The printed restaurant guide is the one artifact in this category that solved our exact problem
before the web existed: it ranks thousands of restaurants, it carries **no photography at all**, and
it makes them desirable anyway, using nothing but type, space, a score, and a symbol key.

That constraint is not theoretical here. Every one of the 5,000 supplied `image_url` values is dead
(they 302 to a 2.2 KB placeholder), so a photo-led restaurant interface is impossible. The guide is
what a photo-less restaurant surface looks like when it is *good* rather than apologetic.

The system refuses two ruts. It is not the generic InstantSearch results page — flat gray facets, a
stock star widget, undifferentiated rows. And it is not the AI-restaurant default of cream paper,
high-contrast serif display, and a terracotta accent: the ground here is a cool-neutral stock rather
than cream, the display face is a Franklin Gothic rather than a serif, and the one accent is
**#DE3643, sampled from the OpenTable mark that shipped with the assignment** — the customer's own
red, not a chosen one.

The register is **Operate with editorial polish** — expression never obscures the task, but a diner
should want to read down the page. Speed is stated as a fact in the index line, not shouted in
orange.

**Reusable signature (the patterns every screen inherits):**
- **Masthead** — a paper band carrying the mark, the search field at full width, and the location.
- **Entry** — a result as a typeset guide entry: score · symbol · NAME · meta line · price · distance
  · a Reserve that resolves on intent. Hairline-separated, never a card.
- **Score** — the *corrected* (Bayesian) rating as a large tabular figure over a hairline scale rule;
  raw stars and review count secondary, beneath.
- **Symbol** — a single-weight cuisine pictogram in graphite, drawn on one geometric grid. A guide's
  symbol key, not a colored tile.
- **Refine rail** — the facet column: tracked caps group titles, hairline rules, tabular counts.
- **Chain entry** — N locations folded into one authoritative entry with a bracketed count.
- **Index line** — the persistent line above the entries: what is applied, how many, how fast.

**Key Characteristics:**
- Paper ground, true-white raised surfaces, real material contrast between them.
- One accent, and it is the customer's: OpenTable red.
- The restaurant's name is the largest thing on its entry. Always.
- Every figure tabular and column-aligned — in the text face, not a monospace costume.
- Flat by default — depth is material contrast and hairline rules, never drop shadows.
- Corrected rating is the honest hero; raw stars are secondary.

## Colors

A warm-neutral paper palette with a single brand accent. These ship as Tailwind v4 `@theme` tokens in
[`app/src/index.css`](app/src/index.css), which is the single place a color in this app is named.

### Primary
- **OpenTable Red** (#DE3643): The single accent, sampled from the supplied logo. Owns the score
  rule, the active refinement, the chain marker, and the Reserve action. Deepens to **Red Deep**
  (#B4232F) for anything carrying small text — links, filled buttons, hover — because white on
  #DE3643 measures 4.45:1 and misses the 4.5:1 floor, while white on #B4232F measures 6.5:1.
- **Red Wash** (#FBEEEF): The accent at reading strength — the ground of an applied refinement chip,
  the chain-location marker, and the autocomplete keyboard highlight.

### Neutral
- **Paper** (#F4F3EF): The page ground — uncoated stock, warm-neutral, low chroma. Explicitly not
  cream: cream carries a yellow cast, and cream-plus-serif is the exact default this world refuses.
- **Card** (#FFFFFF): Raised reading surfaces — the search field, the filter sheet, a hovered entry.
  True white against Paper is a ~4.5% luminance step, which is a material difference you can see.
- **Ink** (#1A1A18): Primary text and the mark. Near-black, faintly warm. 15.7:1 on Paper.
- **Graphite** (#5C5A54): Secondary text, symbols, counts, meta lines. 6.2:1 on Paper.
- **Rule** (#E2E0D9): Hairlines, entry dividers, group separators.
- **Rule Strong** (#C9C6BC): Input strokes, section rules, unfilled scale track.

### Semantic (sparing)
- **Stop** (#A8322A): Zero-results and errors only.

### Named Rules

**The One Accent Rule.** #DE3643 is the only color in the system that is not a neutral, and it is the
customer's. It marks exactly four things: the score scale, an applied refinement, a chain's location
count, and Reserve *once the diner is on the entry*. If red is doing anything else — a "show more"
link, a section rule, a hover on something that is not an action — it is wrong.

**The Applied-Only Rule.** The accent means the result set has been *narrowed*, so it is withheld from
a selected control that narrows nothing. "Any rating" is checked on every arriving page; rendering it
in red made the loudest thing in the rail the option that does nothing. Its radio takes the neutral
fill and its label stays graphite.

**The No-Confetti Rule.** Cuisine is encoded by a **symbol and a word**, never by color. Eight
saturated cuisine tiles down the left edge of a results list is confetti that fights the one accent —
it was measured on the previous system and removed. The pictograms survive in graphite; the color
does not.

## Typography

**One family: Libre Franklin (variable), with system-ui, sans-serif.** A Franklin Gothic — the
American newspaper-and-guide grotesque. It carries a restaurant name at 28px with real presence and a
tracked 11px caps label without falling apart, which is the whole range this surface needs.

**No monospace.** The requirement was that figures align in columns, and `font-variant-numeric:
tabular-nums` on Libre Franklin delivers exactly that. A mono face was one way to get it; it was also
what made the previous system read as a terminal rather than a guide.

**Character:** Editorial, American, sturdy. Confident at display size, invisible at body size. The
beauty comes from scale contrast and alignment, not from ornament.

### Hierarchy
- **Display** (600, clamp(2rem, 3.2vw, 2.75rem), 1.05, -0.02em): Empty-state and section mastheads.
- **Entry name** (600, 1.75rem desktop / 1.375rem mobile, 1.15, -0.02em): The primary scan target on
  every entry. 1.875rem was measured and rejected — the name column is 556px at the desktop measure,
  and the larger size truncates the branch off every long chain name for no visible gain.
- **Score** (600, 1.875rem desktop / 1.5rem mobile, 1, tabular): The corrected rating figure.
- **Title** (600, 1rem, 1.3): Module and group titles.
- **Body** (400, 0.9375rem, 1.55): Prose and helper text; measure capped at ~68ch.
- **Meta** (400, 0.875rem, 1.4): The entry's cuisine · neighborhood · style line, in Graphite.
- **Label** (600, 0.6875rem, 0.1em tracking, UPPERCASE): Group titles, column heads, chips.
- **Figure** (500, tabular-nums): Every numeric — scores, counts, prices, distances, timings.

### Named Rules

**The Tabular Rule.** Every number renders with `font-variant-numeric: tabular-nums`, so scores,
counts, prices, and distances align down the page. A ragged numeric column is the failure state.

**The Name-Dominates Rule.** On any entry, the restaurant's name is the largest and heaviest element.
No action, score, badge, or symbol may out-weigh it — the previous system's eight stacked saturated
CTAs are the specific failure this rule exists to prevent.

## Layout

A centered measure (max content width 1180px) on paper. Top to bottom: the **masthead** (mark,
full-width search field, location — sticky), the **index line** (applied refinements, count, timing,
sort), then a two-column body: a **refine rail** (240px) on the left and the **entry index** on the
right.

Entries are generous, not dense: ~150px tall on desktop, hairline-separated, with the score in a
fixed 92px left column so the figures align down the page. The name block is the only fluid cell.
Spacing rhythm is a 4px base (4/8/12/16/24/32/48/64), always more space above a section label than
below it.

**Responsive.** The masthead stays sticky at every width.

- **Below 880px the entry stacks** to three reading lines: symbol + name, then the meta line, then
  score · price · distance with Reserve pinned right. The review-count line is the one cell a phone
  does without. 880px is measured against the entry's fixed cells, not taken from a device size.
- **The name wraps below 880px and truncates above it.** Truncating costs a chain branch its suffix,
  which is the exact disambiguation the known-item diner came for; above 880px the entries are a
  column and a wrapping name would make them ragged, so there it truncates and `title` carries the
  rest.
- **The refine rail appears at 1280px.** A 240px rail plus the entry's fixed cells needs the width; at
  1024px the rail starved the name column. Below that the rail moves behind a **Filters bottom-sheet**
  carrying the applied-refinement count.
- **Below 680px the search field becomes a full-screen overlay** rather than a dropdown, and the
  browse chip rows become single swipeable rails that scroll inside themselves.

All touch targets are ≥44px below the desktop breakpoint, and the search field is reachable at all
times.

## Elevation & Depth

**Flat by default.** Depth comes from two places: the **material step** between Paper and Card, and
**hairline rules**. No drop shadows on entries, chips, panels, or buttons at rest.

Two functional exceptions, both because something genuinely floats:
- **Panel-lift** (`0 2px 16px rgb(26 26 24 / 0.10)`): the autocomplete panel over the page.
- **Sheet-lift** (`0 -8px 32px rgb(26 26 24 / 0.16)`): the mobile filter bottom-sheet.

### Named Rules

**The Flat Paper Rule.** Surfaces are flat at rest. An entry's hover state is a *material* change
(Paper → Card) plus its Reserve resolving to a filled accent button — never a lift and never a shadow.

**The Resting-Action Rule.** A per-entry action is legible and focusable at rest but never filled.
Twenty-four saturated CTAs down one edge is a column of buttons with restaurants attached, which is
the specific inversion this system replaced. Reserve carries a hairline and ink text until the diner
is on the entry, then fills.

## Shapes

Softened-rectilinear. Radius 3px on inputs, chips, buttons, and the raised entry surface — enough to
read as a modern interface, far short of a pill. The **score scale** is a 2px hairline rule whose
filled portion encodes position on the disclosed 3.0–5.0 range. The **review-volume meter** is a
short log-scaled hairline. **Pictograms** are drawn on one geometric grid at a single stroke weight,
in graphite — not lifted from an off-the-shelf icon set.

## Motion

**One authored moment.** When results change, entries enter with a 6px rise and a fade, staggered
~18ms each over the first ten, at 200ms `cubic-bezier(0.16, 1, 0.3, 1)`. This is the only orchestrated
motion in the system, and it exists for a reason: Algolia returns in single-digit milliseconds, and a
list that swaps with no acknowledgment hides the speed rather than demonstrating it.

Everything else is a 120ms color or background transition on interactive elements. All motion is
disabled under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** make the restaurant's name the largest element on its entry.
- **Do** render every number with tabular figures so the columns align down the page.
- **Do** keep the accent to the four jobs the One Accent Rule names.
- **Do** show the corrected (Bayesian) score as the primary figure, with raw stars and review count
  secondary and the scale floor disclosed.
- **Do** separate entries with hairline rules, not cards and not shadows.
- **Do** draw cuisine pictograms in the guide's own grammar — single-weight, geometric, graphite.
- **Do** log-scale the review-volume meter — counts run 1 → 12,669, so a linear bar is unreadable.

### Don't:
- **Don't** reintroduce color-coded cuisine tiles, or any second accent.
- **Don't** use drop shadows outside the two functional exceptions, or glassmorphism anywhere.
- **Don't** introduce a cream ground, a serif display face, or a monospace UI face — cream + serif is
  the category default this world refuses, and mono is what made the last one read as a terminal.
- **Don't** let a Reserve button out-weigh the restaurant it books.
- **Don't** present the cuisine symbols as the restaurants' real photos — they are an honest encoding
  standing in for a dead image feed.
- **Don't** sort or rank on raw stars; the corrected score is the honest signal.
