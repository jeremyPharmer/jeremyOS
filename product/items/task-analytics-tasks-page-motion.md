# Task analytics on Tasks page + motion polish

| Field | Value |
| --- | --- |
| ID | RB-036 |
| Rank | 6 |
| Priority | P0 |
| Status | In Progress |
| Effort | S |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Task snooze/complete/open feel abrupt (no exit motion, sheet close is hard, checkbox pop is weak). The Tasks page also has no simple analytics — Jeremy can’t see snooze rate, monthly completions, life-area completion mix, or a light completed history without digging through lists.

## Outcome

Tasks feel smoother on snooze/complete/open, and the Tasks page shows thin, honest stats backed by an append-only event log (complete / snooze / undo).

## Scope (v1)

- **Motion polish:** exit animation on snooze + complete; sheet close ease; better checkbox pop
- **Tasks page analytics:**
  - % snoozed
  - Monthly completed chart
  - Totals / % completed by life-area group
  - Simple completed history
- **Persist** append-only `todoEvents` log (complete / snooze / undo) for stats

## Out of scope / later

- Advanced ranges (rolling 30/90), streaks UI, export
- Per-task analytics beyond group / aggregate surfaces
- Motion systems beyond snooze/complete/open + sheet/checkbox
- Cross-page dashboards (Journey adherence remains [RB-033](./task-track-over-time-adherence.md))

## Dependencies & risks

- Builds on task groups ([RB-026](./task-groups-calendar-md-labels.md)) for life-area breakdown
- Complements track-over-time ([RB-033](./task-track-over-time-adherence.md)); do not duplicate Journey adherence here
- `todoEvents` must stay append-only and cheap to query for monthly + group aggregates

## Notes

- Intake 2026-09-24: insert near current task work (after RB-033); effort **S**; status **In Progress**; owner Product.
- Rank **6** (after RB-033 @ 5); RB-002 and below shifted +1.
