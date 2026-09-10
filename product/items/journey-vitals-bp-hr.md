# Journey vitals: BP + heart rate

| Field | Value |
| --- | --- |
| ID | RB-028 |
| Rank | 13 |
| Priority | P1 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants to log **blood pressure** and **heart rate** as objective vitals on **Journey**. Today Journey **Conditions** cover subjective check-ins (sleep, mood, etc.); there is no separate place for numeric BP/HR entries or trends — and Home / morning must not own this.

## Outcome

On Journey, Jeremy can log BP + HR anytime (with AM/PM), browse past logs, and see a **neutral** Vitals chart/trends surface — distinct from Conditions. No medical advice or target bands in v1.

## Scope (v1)

Locked **2026-09-10**:

1. **Journey only** — log entry + trends live on Journey; **not** Home / morning day-start
2. **Each entry requires** systolic + diastolic + heart rate (all three required)
3. **Freeform anytime** logging; user **selects AM or PM** per entry
4. **No teaching / explainers** for systolic, diastolic, or HR (labels only — assume Jeremy knows)
5. **Separate Vitals chart from Conditions** — Conditions stay subjective (sleep/mood/etc.); Vitals are objective numbers
6. **Logs + trends**; tone **neutral** — no medical advice, no target bands / “healthy range” UI for v1

## Out of scope / later

- Home or morning check-in vitals capture
- Medical advice, alerts, target bands, clinician export
- Wearable / Apple Health sync
- Teaching copy or educational tooltips for BP/HR terms
- Merging Vitals into Conditions charts

## Dependencies & risks

- Journey Conditions UI exists — keep Vitals as a **sibling** surface; do not overload Conditions
- Scope creep into “health OS” / clinical framing — stay a personal log + neutral trends
- Related health log: [RB-018](./workout-tracker.md) (workouts ≠ vitals)

## Notes

- Intake **2026-09-10** — six locked decisions above; founder ask.
- Rank **13** / **P1** — health + Journey adjacent; sits with personal health tools ahead of [RB-018](./workout-tracker.md); after cameras [RB-017](./home-cameras-reolink.md) and recovery content [RB-005](./recovery-content-offers.md). Does not displace P0 EA / journal / morning work.
- Distinct from morning subjective metrics ([RB-027](./morning-day-start-briefing.md)) — vitals are Journey-only objective logs.
