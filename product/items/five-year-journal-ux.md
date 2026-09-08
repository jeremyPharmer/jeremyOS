# Five-year / paper journal UX

| Field | Value |
| --- | --- |
| ID | RB-016 |
| Rank | 5 |
| Priority | P0 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product (build: UXUI + Reese data model as needed) |

## Problem

Journal today reads like a stacked feed / dashboard, not a **paper five-year journal**. Jeremy wants one page for a calendar day that shows **the same day across prior years** (this Aug 29, last Aug 29, …), so he can write a **headline** and a **short summary** (~5 sentences) with real journal vibes — not card stacks.

## Outcome

JeremyOS Journal feels like a classic five-year diary: same calendar day, years side-by-side or in a non-stacked page composition; capture is headline + brief prose; the surface is personal and calm, not a product dashboard.

## Scope (v1)

- **Five-year layout:** one page / view keyed by calendar day (month-day); show entries for that day across available prior years (empty slots for years without an entry)
- **Entry fields:** **headline** + **short summary** with a soft ~**5 sentence** limit (enforce gently — soft cap / hint OK for v1)
- **Journal vibes UI:** not stacked cards / not a metrics dashboard; play with typography, page feel, year rhythm — one composition per day page
- Works as a **personal OS** journal surface under JeremyOS (RB-013); does not require recovery-loop framing to justify shipping
- Enough structure that existing evening one-liners / history can map or coexist without blocking the new UX (see scope split with RB-010)

## Out of scope / later

- Backfill / repair of **missed evening closes** and evening-path integrity — that remains **[RB-010](./backfill-missed-evening-journal-close.md)**
- Editing arbitrary past evening mood/stress via this UI (unless it falls out of a thin shared model)
- Month calendar browse, in-place edit of existing entries, star bookmark / starred list — follow-on **[RB-022](./journal-edit-star-calendar.md)** (do not widen this item)
- Multi-user shared journals, export print book, AI rewrite
- Forcing recovery metrics onto the five-year page

## Dependencies & risks

- **Scope split vs RB-010:** RB-010 = missed-close **integrity** (pick a day without evening → complete evening path). RB-016 = **presentation + capture model** for a paper five-year experience. Do not duplicate backfill work inside this item.
- Data model: may need year-keyed entries beyond current evening one-line; decide whether headline/summary replace, wrap, or sit beside evening journal fields
- UI risk: “play with the UI” must still ship a thin v1 (day page + fields + years), not an unbounded redesign

## Notes

- Intake **2026-08-29** founder (JeremyOS): wants paper five-year journal look — same day every prior year on one page; headline + short summary (~5 sentences); journal vibes; **not stacked**.
- **2026-08-29 ship slice:** `/journal` is a five-year day page (year gutter + headline/summary, not stacked feed); evening capture labels → Headline + Short summary with soft 5-sentence hint; existing `one_line` / `journal` storage unchanged. Deployed to prod with history retained.
- Rank **4** / **P0** — founder-loved personal tool, immediately after todos (RB-014) and framing (RB-012/013); ahead of email/podcast polish.
- Related: [RB-010](./backfill-missed-evening-journal-close.md) (backfill integrity only); [RB-021](./journal-photos.md) (optional pics + paperclip on year slots — follow-on, not this item); [RB-022](./journal-edit-star-calendar.md) (edit / star / month calendar — follow-on after this + RB-021); [RB-013](./personal-os-north-star.md) build filter (Jeremy said he wants it).
- Open: hard vs soft 5-sentence limit (v1 = soft); year layout settled as vertical page composition (not cards); evening one-liners map to headline, standout → summary.
