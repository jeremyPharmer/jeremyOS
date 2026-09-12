# Journey: med adherence card + drop vitals chart

| Field | Value |
| --- | --- |
| ID | RB-031 |
| Rank | 17 |
| Priority | P1 |
| Status | Ready |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

On Journey, the **Vitals chart** adds noise next to the BP/HR log list Jeremy actually uses. Separately, he takes a daily medication (default Support `type: "medication"`) and wants a clear **adherence** signal — percent of days covered since first dose — as its own card, framed as a daily reminder + light education, not a new clinical system.

## Outcome

Journey shows (1) vitals as **list-only** (no chart) and (2) a **Medication adherence** card with % days covered from first logged dose through today, with optional same-day “took it” via existing support completion.

## Scope (v1)

Locked **2026-09-11** (thin ship):

1. **Drop the Vitals chart** — remove the separate Journey vitals chart panel; **keep** the BP/HR list (`VitalsLogCard` / dates + measures). Do not merge vitals into Conditions.
2. **Medication adherence card on Journey** — dedicated card (sibling to vitals / other Journey panels), not buried only inside weekly Supports UI.
3. **Data source = existing medication Support** — default Support with `type: "medication"` (weeklyTarget 7) + **SupportCompletion** ledger by date. No new “education med” or separate adherence store.
4. **First dose** — earliest SupportCompletion date for that medication support (fallback: support created/start date if product needs a floor when completions exist; if zero completions, show empty / start state, not a fake %).
5. **% days covered** — count of distinct calendar days with a completion ÷ count of calendar days from first dose **through today** (inclusive). Surface that % on the card; short framing copy OK (daily reminder + what “days covered” means) — **not** medical advice.
6. **Optional same-day “took it”** — reuse existing `/api/support` (or equivalent SupportCompletion write path); do not invent a parallel med-log API for v1.
7. **Journey only** — not Home, morning, or evening ritual surfaces.

## Out of scope / later

- New medication / prescription data model or multi-med regimens
- Pharmacy, refill, dose timing (AM/PM), dosage amounts
- Adherence charts / sparklines; reintroducing vitals chart
- Alerts, streaks-as-shame, clinician export, medical advice
- Home or morning “took meds” CTA (unless founder reopens)
- Changing weekly Support target math beyond what’s needed to read completions for this card

## Dependencies & risks

- Depends on shipped [RB-028](./journey-vitals-bp-hr.md) vitals list; this item **cuts** the chart half of that Outcome.
- Medication Support must remain a default / discoverable support; if missing for a user, card should degrade gracefully (empty / setup nudge — thin).
- “Education is a daily reminder” interpreted as **UX framing** (reminder + % days covered education), not a second product entity — revisit only if founder means a distinct Education med.

## Notes

- Intake **2026-09-11** — founder Journey ask; engineering already has chart as separate panel vs `VitalsLogCard`, and SupportCompletion as best first-dose / coverage source.
- Rank **15** / **P1** / Effort **S** — thin follow-on immediately after Done vitals [RB-028](./journey-vitals-bp-hr.md); ahead of [RB-018](./workout-tracker.md). Does not displace P0 EA / journal / todo work.
- Supersedes RB-028 Outcome language that promised a Vitals **chart/trends** surface for ongoing product; list + neutral log remain; chart removed by this item.
