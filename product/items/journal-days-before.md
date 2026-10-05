# Journal: Days before (year lead-up)

| Field | Value |
| --- | --- |
| ID | RB-040 |
| Rank | 15 |
| Priority | P1 |
| Status | In Progress |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: UXUI `/journal` five-year day page) |

## Problem

On the `/journal` five-year day page, a single year’s focused month-day often lacks **what came before** in that year. The date-banner subtitle (“Same day across four years — headline and a short note.”) adds noise without helping. Jeremy wants a calm, per-year way to peek at the few calendar days leading up to the focused day.

## Outcome

On `/journal`, each year row offers a **Days before** control that **inline-expands** the **3 calendar days prior** for that year only. Empty/missed prior days stay quiet (no Close / Ignore nag). The date-banner subtitle is gone. Purpose: year-based context when one day alone is thin.

## Scope (v1)

1. **Remove** the subtitle copy under the Journal date banner (“Same day across four years — headline and a short note.”)
2. **Label: Days before** — not “Today’s history” / “Lead-up”
3. **Per-year control** on each year row on the five-year day page
4. **Fixed window:** exactly **3 calendar days prior** to the focused month-day **for that year** (e.g. viewing Oct 9 → expand 2023 → show Oct 8, 7, 6 of 2023 — **newest first**, closest day at the top)
5. **Inline expand** under that year row (not a separate page / sheet)
6. **Quiet empties:** empty or missed prior days show calmly — **no** Close / Ignore nag in the lead-up surface
7. Extends the five-year day page ([RB-016](./five-year-journal-ux.md)); does not invent a new journal IA

## Out of scope / later

- Folding into [RB-039](./ignore-missed-journal-days.md) Ignore — different job (context browse vs catch-up dismiss); lead-up stays nag-free
- Configurable day-count (v1 = fixed 3)
- “Days after” / forward look
- Global “Today’s history” across all years at once
- Month calendar / edit / star — [RB-022](./journal-edit-star-calendar.md)
- Photos paperclip — [RB-021](./journal-photos.md)
- Backfill / Ignore actions from the lead-up strip

## Locked product decisions (2026-10-05)

| Decision | Detail |
| --- | --- |
| **New item** | **RB-040** — related to RB-016; **do not** fold into RB-039 Ignore |
| **Copy** | Drop date-banner subtitle; control label = **Days before** |
| **Window** | Fixed **3** calendar days prior, year-scoped, **newest first** (closest prior day on top) |
| **UI** | Per-year control; **inline** expand under the year row |
| **Missed / empty** | Quiet — no Close/Ignore nag in lead-up |
| **Purpose** | Year-based context when a single day lacks “what came before” |

## Dependencies & risks

- Builds on RB-016 five-year day page layout
- Must not surface RB-010 catch-up or RB-039 Ignore CTAs inside the lead-up expand
- Data: need entries (or empty slots) for `focusedDate − 1/2/3` in the expanded year only

## Notes

- Intake **2026-10-05** founder (Jeremy): locked journal UX slice above.
- **Why not RB-039:** Ignore = persisted dismiss of catch-up nags. Days before = optional context for filled (or quietly empty) prior days. Opposite UX pressure — keep separate.
- Rank **15 / P1 / In Progress / S** — journal UX polish immediately after RB-016 + RB-039; ahead of photos (RB-021) and edit/star/calendar (RB-022). Does not steal RB-016’s In Progress slot.
- Related: [RB-016](./five-year-journal-ux.md), [RB-039](./ignore-missed-journal-days.md), [RB-022](./journal-edit-star-calendar.md), [RB-021](./journal-photos.md), [RB-010](./backfill-missed-evening-journal-close.md).
