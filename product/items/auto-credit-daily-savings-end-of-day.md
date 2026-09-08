# Auto-credit daily savings when the day ends

| Field | Value |
| --- | --- |
| ID | RB-011 |
| Rank | 16 |
| Priority | P1 |
| Status | In Progress |
| Effort | S |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product (build: Reese) |

## Problem

Waiting-to-reclaim only grows when the user closes an evening. If they skip or forget close for any reason, that day’s `historicalDailySpend` never shows in waiting reclaim — so the incentive total under-reports savings and there is a reason for funds *not* to show. Closing the day should not be a gate for daily savings accrual.

## Outcome

Each completed abstinence calendar day in the current run credits **one** day’s historical daily spend into waiting-to-reclaim when that day ends — whether or not evening was closed. Closing the evening also ensures the same credit (same amount, **no double credit**). There is no reason for funds to fail to show because the journal step was skipped.

## Scope (v1)

- When a calendar day in the **current run** has ended, ensure a `reclaimDays` entry for that date at `profile.historicalDailySpend` (unaccounted), if missing
- Evening close continues to call the same ensure path (idempotent by date)
- No double credit if both end-of-day accrual and evening close run
- Waiting-to-reclaim / projected pool UIs stay honest without requiring close
- Retroactive catch-up for already-elapsed days in the current run that lack a reclaim row (one-time / on load), so existing gaps heal

## Out of scope / later

- Changing Move-to-Rebuild / bucket split behavior (RB-006)
- Creating evening / journal entries without user action (**RB-010** — separate)
- Editing or revaluing past reclaim amounts when `historicalDailySpend` changes later
- Days outside the current run; reset / return days that should not accrue

## Relationship to RB-010

| | **RB-011** (this item) | **RB-010** |
| --- | --- | --- |
| Job | Funds: auto-credit daily savings → waiting reclaim | Journal: backfill missed evening mood/journal |
| Gate | Day ends (or evening close) | User picks a missing day and completes evening UX |
| Side effects | `ensureReclaimDay` only | Full evening path (journal + existing reclaim ensure) |

RB-010 must **not** be required for funds to appear. After RB-011, a backfilled evening still writes the journal; reclaim ensure is a no-op if the day was already credited.

## Dependencies & risks

- Reuse existing idempotent `ensureReclaimDay` (date key) — do not invent a second ledger
- Trigger choice: lazy on state load / Home (local “today”), and/or scheduled job — must cover “user never opens app until days later”
- Timezone: use the same local-date convention as journey / evening (do not drift UTC vs local)
- Do not credit days after a run reset that are outside the new run; do not credit the reset day if product rules exclude it
- Honor-system reclaim remains until verification (unchanged)

## Notes

- **Product decision locked 2026-08-21:** daily savings accrue at end of day regardless of evening close; close is not a reclaim gate.
- **2026-08-29 JeremyOS:** demoted to rank **9** / **P1**; **2026-08-29** → rank **12** after personal-tools intake (RB-017–019). Fund honesty remains a personal-tool integrity fix (RB-013 build filter #2) — finish the thin In Progress slice; do not expand money OS. No longer highest open P0 vs rebrand / todos / journal / email.
- Supersedes the old decision wording “Reclaim from every **closed** evening” as the *only* credit path; close remains a valid credit path, not the sole one.
- Implementation notes for Reese: prefer ensure-on-read catch-up + keep evening ensure; tests for miss-close, close-then-end, end-then-close, multi-day catch-up.

## Rank history

- 2026-08-21: Intake as RB-011 rank 2 (P0). Renumbered open items below.
- 2026-08-29: JeremyOS pivot → rank **8** / **P1**; bumped to **9** when RB-016 entered (personal fund tool, secondary to personal OS).
