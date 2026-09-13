# Long-term tracking (Journey adherence)

| Field | Value |
| --- | --- |
| ID | RB-033 |
| Rank | 5 |
| Priority | P0 |
| Status | Ready |
| Effort | S |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Jeremy needs a simple way to see **long-term habit adherence** (e.g. medication, later custom habits) on Journey. An earlier spike tried this via repeating tasks (**Track over time**) — that path is the wrong model. Weekly supports already carry frequency (times/week) and completion logs; they should be the longitudinal trackers, under clearer naming.

## Outcome

**Weekly supports** are renamed **Long-term tracking** in Settings / onboarding. Jeremy adds trackers with a **frequency (times/week)**. Default / cleared profile set is **Medication only**. Journey shows adherence for these long-term trackers — not task-based track-over-time.

## Scope (v1)

- **Rename** Settings + onboarding: **Weekly supports** → **Long-term tracking** (copy/IA; same underlying Support model)
- Users **add trackers** with a **frequency (times/week)** (existing support target semantics)
- **Default / cleared set = Medication only** — remove recovery content, meditation, and gym from defaults; **clear those** from existing profiles (keep medication)
- **Journey** lists long-term trackers with adherence (reuse SupportCompletion / weekly target math as engineering defines for v1)
- Medication Journey card remains aligned with [RB-031](./journey-med-adherence-drop-vitals-chart.md) (default tracker + % days covered)

## Out of scope / later

- **Won't Do — task-based Track over time:** composer Yes/No on repeating tasks, task completion logs as the adherence source, Journey adherence from tasks (superseded by this decision)
- Multi-range stats (30/90 day), charts, streaks UI
- Push reminders / accountability nags
- Re-adding recovery content / meditation / gym as product defaults (Jeremy may still add custom trackers)

## Dependencies & risks

- Engineering is updating runtime (defaults clear, rename, Journey adherence from supports) — docs lead; app code may lag
- Historical **$20 weekly gift** / “hit all four supports” rules assumed four canned supports — with med-only default, gift eligibility needs an explicit eng/product pass (do not invent a new gift rule here)
- [RB-031](./journey-med-adherence-drop-vitals-chart.md) owns vitals-chart cut + med adherence card details; this item owns rename, defaults clear, and multi-tracker Journey framing

## Notes

- Intake **2026-09-12**: task Track over time (In Progress spike framing).
- **Founder decision 2026-09-13:** stop using tasks for long-term habit adherence; rename Weekly supports → Long-term tracking; default/clear to **Medication only**; Journey adherence from these trackers. Task-based approach → **Won't Do**. Item reframed; file renamed from `task-track-over-time-adherence.md`.
- Rank **5** / **P0** / Effort **S** unchanged — still the near-term Journey adherence ship after todo/groups work.
