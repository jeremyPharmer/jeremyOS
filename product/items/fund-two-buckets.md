# Fund buckets: Future + Treat @ 30/70

| Field | Value |
| --- | --- |
| ID | RB-006 |
| Rank | 18 |
| Priority | P1 |
| Status | Backlog |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |
| UX review | UXUI — see `product/UX_HANDOFF_FUND_BUCKETS.md` |

## Problem

Three fund buckets don’t match a clear short-term vs long-horizon story. Reward moments also need a simple choice: spend short-term Treat (optionally dipping into Future) or Save for the Future.

## Outcome

- **Future** = longer-horizon park (30% of each Move)
- **Treat Yourself** = short-term spendable (70% of each Move)
- Reward day: **Treat Yourself** (Treat first, optional Future pull) **or** **Save for the Future**
- Old “Save & compound → move into Treat” is retired

Canonical rules: [`../FUND_MODEL.md`](../FUND_MODEL.md)

## Scope (v1)

- Two-bucket ledger + Money bar
- Reward/Destination UX per handoff
- Optional Future pull when treating
- Save-for-Future delay rule (max 2 in a row)
- UXUI review before/with implementation polish

## Notes

- Locked 2026-08-11 at 50/50; updated same day to **Future 30% / Treat 70%** so ~$1,095 parks by Day 365 at $10/day while Treat stays the dominant short-term incentive.
- Handed to UXUI for review on PR #3.
- **2026-08-29 JeremyOS:** demoted to rank **11** / **P1** / milestone **v1.x**; **2026-08-29** → rank **14** after RB-017–019. Fund model stays **locked** as a personal incentive tool (`FUND_MODEL.md`); not killed. Secondary to personal OS (todos, five-year journal, email, podcasts, hub). Do not expand money UX for generic-product polish.
