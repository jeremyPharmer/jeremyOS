# Daily email: open checklist at close of day

| Field | Value |
| --- | --- |
| ID | RB-003 |
| Rank | 15 |
| Priority | P1 |
| Status | Backlog |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

At the end of the day, open checklist / to-do items are easy to forget. Jeremy wants email skills and loves to-dos — a simple nudge of what’s still open fits JeremyOS without changing how he closes the day in-app.

## Outcome

After the day is closed (or at a configured end-of-day moment), the user receives an email listing anything still open on their checklist so they can see leftover work without digging back into the app.

## Scope (v1)

- Trigger tied to existing **close the day** flow (or end-of-day schedule) — **do not redesign close-the-day**
- Email body: list of remaining open checklist items (titles + enough context to act)
- Empty state: skip send or send a short “all clear” (product default: skip if nothing open — confirm at build time)
- Uses email integration (RB-002)

## Out of scope / later

- Changing close-the-day UX, steps, or journal structure — **keep as-is**
- SMS version of the same digest (can reuse content once RB-004 exists)
- Mid-day digests or custom multi-window schedules beyond one daily send

## Dependencies & risks

- Depends on **RB-002 Email integration**
- Needs a stable checklist / open-item model from daily journal or day tasks
- Timezone handling for “end of day”

## Notes

- Added 2026-08-10. Product call: keep close-the-day exactly as designed; this is an additive notification of leftover open items.
- **2026-08-29 JeremyOS:** rank **8**; **2026-08-29** → rank **11** after cameras/workout/recipes intake. Ties elevated email (RB-002) + to-dos (RB-014). Prefer RB-014 list model as source of “open items” when that ships; until then, existing checklist leftovers OK.
- Related surface: daily journal / checklist leftovers + RB-014 todos.
- RB-009 Sunday recap is a later consumer of this channel — do not block recovery patterns (now demoted) on email.
