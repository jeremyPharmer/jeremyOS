# Backfill missed evening / journal close

| Field | Value |
| --- | --- |
| ID | RB-010 |
| Rank | 17 |
| Priority | P1 |
| Status | In Progress |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: Reese evening path + UXUI Journal) |

## Problem

If a user misses closing a past day, they cannot add that evening / journal entry later. Gaps break the daily loop trail and leave Journal incomplete. Separately, Journal scroll content is obscured by the bottom nav.

## Outcome

User can pick a missing calendar day in the current run (no evening close yet) and complete the evening entry via the existing close path. Journal days remain reachable while scrolling (nav no longer covers content).

## Scope (v1)

- Select missing calendar day(s) in the **current run** that lack an evening close
- Complete mood / stress / one-line (optional standout) through the **existing evening close** path
- Same evening / milestone side effects as a same-day close; reclaim ensure stays idempotent (may already exist from [RB-011](./auto-credit-daily-savings-end-of-day.md) end-of-day credit)
- Journal screen: fix bottom-nav overlap so days stay visible while scrolling

## Out of scope / later

- Editing past entries (prose/photo edit + star + month calendar is **[RB-022](./journal-edit-star-calendar.md)** — do **not** widen this item into edit-past)
- Morning backfill
- Bulk multi-day close in one submit
- Days outside the current run
- Auto-crediting waiting reclaim without a journal entry — that is **RB-011**, not this item

## Dependencies & risks

- Must reuse existing evening / reclaim / milestone mutations so incentives stay consistent
- Day selection UX should make “already closed” vs “missing” obvious
- Coordinate with RB-011 so backfill never double-credits `reclaimDays`

## Notes

- **2026-08-29 JeremyOS:** rank **10** (was 9; bumped when [RB-016](./five-year-journal-ux.md) entered at rank 4); **2026-08-29** → rank **13** after RB-017–019. Still useful as a personal journal tool; not “make the generic daily loop lovable.” Finish thin In Progress slice; no scope expand.
- **Not the same as RB-011:** journal / evening backfill UX. Funds waiting-to-reclaim owned by [RB-011](./auto-credit-daily-savings-end-of-day.md).
- **Not the same as RB-016:** this item is **missed-close integrity** (evening path + nav). Five-year / paper journal layout, headline + summary capture, and journal vibes UI are **[RB-016](./five-year-journal-ux.md)** — do not expand this item into that redesign.
- **Not the same as RB-022:** edit existing / star / month calendar stay on **[RB-022](./journal-edit-star-calendar.md)**. RB-022 must **route missed days here** (notify → close), not create via edit.
- Shipping in the same PR as Journal bottom-nav scroll padding fix
- Rank history: **7** (2026-08-21 RB-011) → **9** (JeremyOS) → **10** (RB-016) → **14** (RB-021) → **15** (2026-08-31 RB-022).
