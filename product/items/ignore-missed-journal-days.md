# Ignore missed / incomplete journal days

| Field | Value |
| --- | --- |
| ID | RB-039 |
| Rank | 14 |
| Priority | P0 |
| Status | Ready |
| Effort | XS |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: Reese persist/filter + UXUI `/journal` Ignore) |

## Problem

On `/journal`, past days without an evening close surface as missed / incomplete catch-up targets (`missingEveningDates`). Jeremy can backfill via [RB-010](./backfill-missed-evening-journal-close.md), but he also wants to **drop** days he will not catch up — so they stop naging on the Journal tab. Today must stay actionable (never ignorable).

## Outcome

For any **past** missed/incomplete day (not today), Jeremy can **Ignore** it. That day disappears from Journal missed UI and from evening catch-up / pick-a-missed-day lists. No fake close is invented; fund and journey math stay unchanged.

## Scope (v1)

1. **Ignore action** on Journal missed / incomplete surfaces for each eligible past day (`date < today` in the current run with no evening close)
2. **Persisted dismiss** — store ignored calendar dates (e.g. `ignoredEveningDates: YYYY-MM-DD[]`); not a session-only / client-only hide
3. **Filter catch-up everywhere** — ignored dates leave:
   - Journal missed / catch-up UI
   - Evening “pick a missed day” / backfill targets derived from `missingEveningDates`
   - Month-calendar **missing** marker treatment (do not show ignored days as nagging missing; not closed either — empty / ignored quiet state)
4. **Today never ignorable** — hard rule; UI must not offer Ignore for today
5. **No side effects** on reclaim, Move to Rebuild, milestones, clean-day count, or abstinence integrity
6. **No synthetic evening** — ignore does **not** create an evening close or journal prose; day stays without a close in history
7. **Semantics: missed = incomplete** for this item — both mean “past day in current run, no evening close yet” (same set as `missingEveningDates` excluding today). No separate partial-entry ignore path in v1

## Out of scope / later

- Expanding [RB-010](./backfill-missed-evening-journal-close.md) into dismiss (RB-010 stays **backfill / complete** only)
- Widening [RB-016](./five-year-journal-ux.md) five-year presentation or [RB-022](./journal-edit-star-calendar.md) edit/star/calendar
- Ignoring **today**
- Bulk ignore-all
- Auto-ignore after N days
- Morning-only misses (this is evening / journal close catch-up)
- Fabricating closed evenings or rewriting history
- Changing reclaim accrual ([RB-011](./auto-credit-daily-savings-end-of-day.md)) or Treat/Save rules
- **Restore / un-ignore UI** — later thin follow-on (data model should allow removing a date from the ignored set so eng can add undo without a migration)

## Locked product decisions (2026-10-05)

| Decision | Detail |
| --- | --- |
| **New item** | **RB-039** — do **not** fold into RB-010 / RB-016 / RB-022 |
| **Ignore means** | Persisted dismiss from catch-up / missed UI — **not** UI-only; **not** a close |
| **Integrity** | No reclaim, milestone, or run-counter changes |
| **Today** | Never ignorable |
| **Incomplete vs missed** | Same eligibility set for v1 (past + no evening close) |
| **Restore** | Out of v1 UI; keep storage reversible for a later undo |

## Dependencies & risks

- Filter must be shared (prefer one helper used by Journal + evening) so ignore cannot leave evening still nagging
- Do not treat ignored dates as closed for star eligibility, edit path, or five-year “has entry” slots
- Coordinate with RB-010: catch-up still works for **non-ignored** missing days; ignore is the opt-out

## Notes

- Intake **2026-10-05** founder (Jeremy): aside from today, missed/incomplete Journal days need an **Ignore** option so the day goes away.
- **Why new ID:** RB-010 = complete a missed close; this item = deliberately stop treating a day as a catch-up target. Opposite jobs — keep separate.
- Rank **14 / P0 / Ready / XS** — Now queue immediately after five-year journal (RB-016); small eng slice, founder friction on live Journal. Does not steal RB-016’s In Progress slot.
- Related: [RB-010](./backfill-missed-evening-journal-close.md), [RB-016](./five-year-journal-ux.md), [RB-022](./journal-edit-star-calendar.md), [RB-011](./auto-credit-daily-savings-end-of-day.md).
