# Track over time (task adherence)

| Field | Value |
| --- | --- |
| ID | RB-033 |
| Rank | 5 |
| Priority | P0 |
| Status | In Progress |
| Effort | S |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Habits Jeremy wants to stick with (meditation, meds, flossing, workouts) are created as repeating tasks, but there’s no simple “how often have I actually done this since I started?” view tied to the task itself. Weekly supports were removed from Home; personal tasks need a light adherence path that surfaces on Health (was Journey).

## Outcome

When creating/editing a repeating task, Jeremy can toggle **Track over time: Yes/No** (same Yes/No pattern as Repeat). Tracked tasks show a simple **adherence % since created** on **Health** — enough to prove tracking works (not advanced time ranges or charts yet).

## Scope (v1)

- Composer: **Track over time** Yes/No under Repeat (only when Repeat = Yes)
- Persist `trackOverTime`, `createdAt`, and a completion date log on the task
- On complete/undo of a tracked recurring task, update the log
- Health (was Journey): list tracked tasks with **% = completions ÷ scheduled occurrences since created** (through today)
- Copy framing: “Adherence” on Health — **not** alongside a medication card ([RB-031](./journey-med-adherence-drop-vitals-chart.md) Won't Do; surface = [RB-043](./health-tab-sleep-primary.md))

## Out of scope / later

- Multi-range stats (30/90 day), charts, streaks UI
- Auto-linking to legacy Support types
- Tracking one-off (non-repeating) tasks
- Push reminders / accountability nags

## Dependencies & risks

- Needs an occurrence schedule from recurrence (same engine as due dates)
- Legacy tasks without `createdAt` get one when Track is turned on

## Notes

- Intake 2026-09-12 (founder): track meditation / meds / flossing style habits via task create options; show success since created on Journey/Health; keep v1 intentionally thin.
- **2026-10-10:** Surface rename Health ([RB-043](./health-tab-sleep-primary.md)); do not pair copy with Medication adherence ([RB-031](./journey-med-adherence-drop-vitals-chart.md) Won't Do).
