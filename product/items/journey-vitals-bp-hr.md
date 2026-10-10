# Journey vitals: BP + heart rate

| Field | Value |
| --- | --- |
| ID | RB-028 |
| Rank | 24 |
| Priority | P1 |
| Status | Done |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants to log **blood pressure** and **heart rate** as objective vitals on **Journey**. Today Journey **Conditions** cover subjective check-ins (sleep, mood, etc.); there is no separate place for numeric BP/HR entries or trends — and Home / morning must not own this.

## Outcome

On Journey (now **Health**), Jeremy can log BP + HR anytime (with AM/PM) and browse past logs — distinct from Conditions. No medical advice or target bands in v1.

**Follow-on history:** Vitals chart cut + med adherence were [RB-031](./journey-med-adherence-drop-vitals-chart.md) — **Won't Do / superseded 2026-10-10** by [RB-043](./health-tab-sleep-primary.md). **Keep all BP/HR data**; Health page = sleep primary, vitals secondary with a **better viz than list-only** (not the old vitals chart).

## Scope (v1)

Locked **2026-09-10**:

1. **Health / Journey surface only** — log entry + history live on this tab; **not** Home / morning day-start
2. **Each entry requires** systolic + diastolic + heart rate (all three required)
3. **Freeform anytime** logging; user **selects AM or PM** per entry
4. **No teaching / explainers** for systolic, diastolic, or HR (labels only — assume Jeremy knows)
5. **Separate from Conditions** — Conditions (historic subjective charts) are dropped under RB-043; Vitals remain objective numbers
6. **Logs** kept; tone **neutral** — no medical advice, no target bands / “healthy range” UI for v1

## Out of scope / later

- Home or morning check-in vitals capture
- Medical advice, alerts, target bands, clinician export
- Wearable / Apple Health sync
- Teaching copy or educational tooltips for BP/HR terms
- Merging Vitals into Conditions charts
- Reintroducing the old vitals chart panel (new viz ≠ restore that chart)

## Dependencies & risks

- Surface rename / layout owned by [RB-043](./health-tab-sleep-primary.md) — keep vitals data when Conditions and med adherence go away
- Scope creep into “health OS” / clinical framing — stay a personal log + neutral viz
- Related health log: [RB-018](./workout-tracker.md) (workouts ≠ vitals)

## Notes

- Intake **2026-09-10** — six locked decisions above; founder ask.
- Rank **25** / **P1** / **Done** — health tools; after cameras [RB-017](./home-cameras-reolink.md) and recovery content [RB-005](./recovery-content-offers.md).
- Distinct from morning subjective metrics ([RB-027](./morning-day-start-briefing.md) / [RB-042](./open-close-thin-redesign.md)) — vitals are Health-tab objective logs.
- **2026-09-11:** Founder cut chart — keep list; adherence was RB-031.
- **2026-10-10:** RB-031 Won't Do; active Health direction = [RB-043](./health-tab-sleep-primary.md) — keep vitals data, secondary to sleep, better viz than list-only.
