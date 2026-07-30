---
name: OpenTable Restaurant Search — The Concourse Board
description: A wayfinding-grade restaurant search experience — a bright transit concourse read against a dark, live departure board.
---

# Design System: OpenTable Restaurant Search — "The Concourse Board"

## Overview

**Creative North Star: "The Concourse Board"**

A diner stands in a bright, calm transit concourse and looks up at a dark, luminous departure board to find the one right destination among hundreds. That is the whole system. Searching 5,000 restaurants is a *wayfinding* problem — orientation and disambiguation, not proximity — and the interface answers it in the visual language people already trust to route them through crowded places: station signage, departure boards, platform markers, tabular timetables, single-weight pictograms, directional arrows. The humble results list becomes a **board**; the facet rail becomes a **signage panel**; the chain problem becomes a **platform**.

The system refuses the two ruts this category ships. It is not the generic InstantSearch results page: flat gray facets, a stock rating widget, undifferentiated rows. And it is not the AI-restaurant default of cream paper, high-contrast serif display, and a terracotta accent. Instead: a cool, high-legibility concourse ground; a bounded dark board reserved strictly for *live information*; one saturated enamel-blue signal that owns every interaction; and every number set in a tabular monospace so the whole surface aligns like a real board.

The register is **Operate with demo-grade polish** — expression never obscures the task, but the craft is unmistakable in the first viewport. Speed is part of the aesthetic: Algolia's sub-10ms response is rendered as a live board stat, not a footnote.

**Reusable signature (the patterns every screen inherits):**
- **Board strip** — a full-width dark Ink band carrying the search field and the live results/timing readout.
- **Board row** — a result rendered as a column-aligned timetable line: rating gauge · NAME · cuisine bullet · neighborhood · price · review-volume bar. Hairline-separated, never a card.
- **Rating gauge** — a segmented signage gauge showing the *corrected* (Bayesian) rating as the primary figure, raw stars + review count secondary.
- **Signage panel** — the facet rail: tracked uppercase labels, single-weight pictograms, tabular counts.
- **Platform** — the chain-disambiguation module: N locations folded into one authoritative entry with a directional cue.
- **Route strip** — the persistent "active filters" line above results, read like a journey summary.

**Key Characteristics:**
- Bright concourse ground, bounded dark board for live info only.
- One interactive voice: Enamel Signal Blue.
- Every number tabular, monospaced, column-aligned.
- Flat by default — depth is material contrast and hairline keylines, never drop shadows.
- Rectilinear signage geometry; corners are square, not soft.
- Corrected rating is the honest hero; raw stars are secondary.

## Colors

A cool, high-legibility signage palette: a pale concourse ground, a bounded anthracite board, one enamel-blue system color, and a matte amber that lives only where information is "live." These values ship as Tailwind v4 `@theme` tokens in [`app/src/index.css`](app/src/index.css), which is the single place a colour in this app is named.

### Primary
- **Enamel Signal Blue** (#0B4FA0): The single interactive voice. Active/selected facets, links, focus rings, the route strip, the primary "Reserve →" action, directional arrows. This is the "line color" that guides the diner. Hover/pressed deepens to **Enamel Deep** (#083E7E).

### Secondary
- **Board Amber** (#F5A623): The *live* accent — and only ever on or beside the dark board. The results-count and millisecond readout, the split-flap refresh highlight, the platform (chain) marker, the rating-gauge fill. Flat, matte board pigment; it never glows or blooms.

### Tertiary — Cuisine Line Bullets
A fixed lookup keyed to `cuisine_group`, drawn from transit line-color palettes, used *only* as small square bullets/tags so a diner can scan cuisine at a glance. Data encoding, never decoration. Representative set: American **Cobalt** (#1F5FBF), Italian **Vermillion** (#D24A2C), Japanese/Asian **Jade** (#1E8E6A), French **Aubergine** (#6A3B8F), Seafood **Teal** (#167A86), Steakhouse **Oxblood** (#8A2D34), Mexican/Latin **Marigold** (#C98A12), Café/Other **Slate** (#6B7680).

### Neutral
- **Ink** (#14181B): The board material and primary text — anthracite enamel, not pure black.
- **Concourse** (#EBEDE8): The page ground — cool pale concrete / station tile. Explicitly not cream.
- **Porcelain** (#FBFBF9): Facet panel and any raised reading surface — enamel white.
- **Steel** (#59636C): Secondary text, pictograms, metadata.
- **Hairline** (#D7DAD3): Keylines, rules, row dividers, input strokes.

### Semantic (sparing)
- **Stop Red** (#C8352C): Zero-results / error states only.
- **Go Green** (#1E7A46): "Available / go" affordances only.

### Named Rules
**The One Board Rule.** The dark Ink board is reserved for *live information* — the search field, the results/timing readout, and chain platforms. Browsing happens on the light concourse. The board's darkness is a signal that its contents are live; spend it nowhere else.

**The One Voice Rule.** Enamel Signal Blue owns interaction, Board Amber owns "live," line bullets encode cuisine. No color is decorative. If an accent isn't doing one of those three jobs, it's wrong.

## Typography

**Display Font:** Barlow Semi Condensed (with "Arial Narrow", sans-serif) — a condensed signage grotesque with California highway/rail lineage; carries the departure-board density of the board rows and restaurant names.
**Body Font:** Barlow (with system-ui, sans-serif) — the normal-width sibling; workhorse legibility for descriptions and UI text, coherent with the display face.
**Label/Mono Font:** Overpass Mono (with "Courier New", monospace) — derived from US Highway Gothic; carries *every number* and the small tracked uppercase signage labels.

**Character:** Functional, confident, and unmistakably wayfinding. Condensed grotesque names read like a board; monospaced tabular figures make counts, ratings, and timings line up in columns the way a real timetable does. No serifs, no editorial flourish — this world earns its beauty through alignment and legibility.

### Hierarchy
- **Display** (Barlow Semi Condensed 600, clamp(2rem, 4vw, 3rem), 1.05): The board-strip identity and any section masthead.
- **Headline** (Barlow Semi Condensed 600, 1.375rem, 1.1): Restaurant names in board rows — the primary scan target.
- **Title** (Barlow Semi Condensed 500, 1.125rem, 1.2): Facet group headers, module titles.
- **Body** (Barlow 400, 0.9375rem, 1.5): Descriptions and helper text; cap line length ~60ch.
- **Label** (Overpass Mono 500, 0.75rem, letter-spacing 0.08em, UPPERCASE): Signage labels — "CUISINE", "RATING", "PLATFORM", filter chips.
- **Figure** (Overpass Mono 500, tabular-nums): All numerics — ratings, review counts, prices, results count, ms timing.

### Named Rules
**The Tabular Rule.** Every number renders in Overpass Mono with `font-variant-numeric: tabular-nums`, so ratings, counts, prices, and timings align in columns like a real board. A number set in the sans face is a lapse.

**The No-Serif Rule.** No serif, no italic display, no cream ground. This world exists to refuse the restaurant-app default; a serif headline is the failure state, not a variation.

## Layout

A strict signage grid on a centered concourse (max content width ~1240px). Top to bottom: the full-width **board strip** (dark, sticky — search + live stats), the **route strip** (active filters), then a two-column body: a fixed **signage panel** (~280px) on the left and a fluid **results board** on the right.

Density is timetable-tight but never cramped: board rows are compact and baseline-aligned, separated by **hairline keylines** (not cards, not gaps-as-dividers), with generous gutter between the panel and the board. Spacing rhythm is a 4px base (steps 4 / 8 / 12 / 16 / 24 / 32 / 48), always more space above a section label than below it.

**Responsive.** The board strip stays sticky at every width, with the identity and the live readout sharing its first line on a phone. Two breakpoints matter, and both were measured against the row rather than taken from a device size:

- **Below 880px the board row stacks.** Its fixed cells total 543px, so anything narrower starves the one cell allowed to shrink — the name. It stacks to three reading lines, not the two this section first specified: tile + name, then the meta line, then gauge · distance · price with **Reserve** pinned right. Two lines was written before the distance column and the platform marker existed; three keeps the requirement that actually matters, which is that each line stays column-aligned across rows. The review-volume meter is the one cell a phone does without.
- **The signage panel appears at 1280px, not 1024px.** A 280px rail plus a 543px row needs the width; at 1024px the rail left the name column 137px wide, the same defect a phone had. Below that the panel moves behind a **"Filters" bottom-sheet** trigger carrying the applied-refinement count.

Below 680px the search field becomes a full-screen overlay rather than a dropdown — a panel pinned under a sticky dark strip has almost no room on a phone, and the overlay lifts the keyboard away from the results. Discovery's chip rows become single swipeable rails that scroll inside themselves; wrapped, they cost more than 900px before the first result. All touch targets are ≥44px below the desktop breakpoint, and the search field remains reachable at all times.

## Elevation & Depth

**Flat by default — the No-Glow Rule.** The concourse uses no drop shadows. Depth is conveyed two ways: the **material contrast** between the dark Ink board and the light concourse (the board reads as a physically distinct, illuminated surface), and **hairline keylines** that structure the board and panel. Board Amber and Signal Blue are matte pigments — they never carry a glow, bloom, or neon edge.

The single exception is functional: when the mobile **Filters bottom-sheet** overlays content, it rides on one soft ambient shadow plus a scrim, to signal it floats above the board.

### Shadow Vocabulary
- **Sheet-lift** (`box-shadow: 0 -8px 32px rgba(20,24,27,0.18)`): The mobile filter bottom-sheet only. Nowhere else.

### Named Rules
**The Flat Concourse Rule.** Surfaces are flat at rest. The only depth cues are Ink-vs-Concourse material contrast and hairline keylines; the only shadow in the system lifts the mobile filter sheet.

## Shapes

Rectilinear signage geometry. Corners are square to barely-softened (radius 0–2px): enamel-sign inputs, filter chips, and buttons use crisp 2px corners; the board strip and panels are hard rectangles. The **rating gauge** is a segmented linear bar (a signage gauge), never a pill or a row of variable-fill stars. The **review-volume bar** is a short horizontal meter. **Pictograms** are drawn on one geometric grid at a single stroke weight, in the world's own grammar — not lifted from an off-the-shelf icon set. The **platform (chain) marker** uses a bracketed platform-number motif (e.g. a boxed count with a directional arrow).

### Named Rules
**The Square Corner Rule.** This is signage: corners are square (0–2px). Rounded cards and pill chips belong to the default this world refuses.

## Do's and Don'ts

### Do:
- **Do** render every number in Overpass Mono with tabular figures, column-aligned across rows.
- **Do** reserve the dark Ink board strictly for live information — search, results/timing readout, chain platforms — and keep browsing on the light concourse.
- **Do** use Enamel Signal Blue (#0B4FA0) as the single interactive voice (active facets, links, focus, primary action).
- **Do** show the corrected (Bayesian) rating as the primary gauge figure, with raw stars + review count as secondary context.
- **Do** separate results with hairline keylines (#D7DAD3), not cards or shadows.
- **Do** draw pictograms in the signage grammar (single-weight, geometric) and map `cuisine_group` to the fixed line-bullet colors for scanning.
- **Do** log-scale the review-volume bar — counts range 1 → 12,669, so a linear bar is unreadable.

### Don't:
- **Don't** use rounded cards, drop shadows, or glassmorphism; the concourse is flat, depth is material contrast + keylines.
- **Don't** let Board Amber glow, bloom, or gain a neon edge — it is flat board pigment, only on or beside the dark board.
- **Don't** introduce cream/parchment grounds or serif/italic display type — that is the exact default this world exists to refuse.
- **Don't** scatter accent colors; if a color isn't owning interaction (blue), signaling "live" (amber), or encoding cuisine (bullets), remove it.
- **Don't** present the local cuisine-keyed images as the restaurants' real photos — they are honest stand-ins for a dead image feed.
- **Don't** sort or rank on raw stars; the corrected rating is the honest signal.
