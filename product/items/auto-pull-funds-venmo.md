# Auto-pull funds: checking → Venmo

| Field | Value |
| --- | --- |
| ID | RB-001 |
| Rank | 19 |
| Priority | P1 |
| Status | Backlog |
| Effort | L |
| Target due | TBD |
| Milestone | later |
| Owner | Product |

## Problem

Jeremy may still want funds moved from checking into a destination used by personal incentive / recovery tools. Manual transfers create friction. Under JeremyOS this is a **personal money rail**, not the product’s north-star feature.

## Outcome

JeremyOS can initiate an automatic pull from a linked checking account and deposit into **Venmo** (v1 destination still locked for this item), so incentive-related money movement is reliable without manual steps — when Jeremy still prioritizes it.

## Scope (v1)

- Link / authorize a checking account as the funding source
- Auto-pull (ACH or equivalent) into **Venmo** as the destination
- User-visible confirmation of pull success / failure
- Basic retry / error handling for failed pulls
- Audit trail suitable for support and trust

## Out of scope / later

- Destination: alternate **soccer bank account** (or other dedicated checking destination) — track as a follow-on after Venmo v1
- Multi-destination routing in one flow
- Complex scheduling rules beyond the initial auto-pull behavior (unless required for a minimal viable pull)

## Dependencies & risks

- Venmo / payment-rail API access, ToS, and compliance (KYC, money-transmission constraints)
- Bank linking UX and auth (Plaid or equivalent may be required)
- Failure modes: insufficient funds, revoked auth, delayed ACH settlement
- User trust: clear consent copy before any auto-pull

## Notes

- Product decision (2026-08-10): **Venmo is the v1 destination** for this item. Soccer / alternate bank account is explicitly later — do not block a thin pull on it.
- **2026-08-29 JeremyOS:** demoted to rank **12** / **P1** / **later**; **2026-08-29** → rank **15** after RB-017–019. Still documented; not Won't Do. Secondary to personal OS. Feasibility blockers (no official Venmo Add Money API) remain — see notes below.
- Added as highest rank (1); renumbered over time (RB-007, RB-011). Was open P0 before personal-OS pivot.
- 2026-08-13: Acorns / segregated hold explored as later alternate — see [RB-008](./segregated-rebuild-account-rails.md).
- **2026-08-13 feasibility:** No official Venmo/PayPal partner API for “Add Money” from checking into Venmo balance. Practical implication: honor-system / deep-link UX or non-Venmo rail (Dwolla me-to-me) — decide when this item is pulled forward again.
