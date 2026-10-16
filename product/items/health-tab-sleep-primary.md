# Health tab: sleep primary (rename Journey)

| Field | Value |
| --- | --- |
| ID | RB-043 |
| Rank | 8 |
| Priority | P0 |
| Status | Done |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

The **Journey** tab still carries recovery-era chrome: a historic **Conditions** multi-metric chart (mood/energy/stress 1–10), a **Medication adherence** section, and list-only BP/HR. Founder wants a **Health** surface whose primary signal is **sleep quality** (Open’s 1–5 era), with vitals kept but secondary — and med adherence dropped entirely.

## Outcome

Nav/tab reads **Health**. Page leads with **sleep quality** (1–5, from Open / RB-042). Conditions chart and Medication adherence are gone. All BP/HR vitals data remain; visualization improves later (not list-only forever) but sleep ships first.

## Scope (v1)

Locked **2026-10-10** (thin reshape, building now):

1. **Rename nav/tab label Journey → Health** — user-visible chrome only. **Route may stay `/journey`** (label-first); optional `/health` redirect is fine later — do not block v1 on a path rename.
2. **Drop Conditions chart** — remove the historic mood/energy/stress (and related) multi-metric **1–10** Conditions chart era. Do not rebuild a Conditions dashboard.
3. **Primary surface = Sleep quality** — top of the Health page; data from when Open moved to **sleep quality 1–5** ([RB-042](./open-close-thin-redesign.md), shipped ~**2026-10-07**). Chart/trend of sleep 1–5 only for v1 primary viz.
4. **Remove Medication adherence** — delete the section entirely; no longer tracking med adherence on this surface. **Supersedes** med-adherence half of [RB-031](./journey-med-adherence-drop-vitals-chart.md) → **Won't Do**.
5. **Keep all BP/HR vitals data** — do not delete logs. Secondary to sleep on the page. Founder wants a **different visualization** than today’s list-only UI; that viz polish can follow sleep primary (same item Later, or thin follow-on) — **do not** cut vitals to make room for sleep.

## Out of scope / later

- Mandatory route rename `/journey` → `/health` (optional redirect OK)
- Reintroducing Conditions multi-metric charts or med adherence
- Clinical advice, target bands, wearable sync
- Full “health OS” expansion (workouts remain [RB-018](./workout-tracker.md))

## Dependencies & risks

- Sleep series depends on Open `sleepQuality` **1–5** writes from [RB-042](./open-close-thin-redesign.md); legacy 1–10 / multi-metric rows: soft-read / ignore for the primary chart — no backfill required.
- Vitals keep [RB-028](./journey-vitals-bp-hr.md) data; chart cut from RB-031 stays (no return of the old vitals chart); **new** BP/HR viz is intentional later work, not the old chart.
- Task adherence on this surface ([RB-033](./task-track-over-time-adherence.md)) may remain if already shipping — copy should say **Health**, not “alongside medication card.”
- Supersedes RB-012 / RB-020 “keep Journey nav label” lock.

## Notes

- Intake **2026-10-10** — founder direction for Health tab (was Journey).
- **Shipped 2026-10-10:** nav label Health; sleep quality 1–5 primary chart; Conditions + med adherence removed; BP range-bar viz + log/history kept secondary. Route remains `/journey`.
- Rank **8** / **P0** / Effort **S** / **Done** — thin reshape shipped.
- **RB-031** → **Won't Do** (med adherence + prior list-only vitals follow-on superseded by this direction).
- Eng locks: label **Health**; route **`/journey` OK**; sleep scale **1–5** from Open (~2026-10-07); no med adherence; Conditions chart out; BP/HR data kept, secondary.
