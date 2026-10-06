# Save Goals — Reserve as hub + fixed $/day projection

| Field | Value |
| --- | --- |
| ID | RB-041 |
| Rank | 17 |
| Priority | P0 |
| Status | Done |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: Reese + UXUI) |

## Problem

The original Save Goals model treated every named pocket (including **Reserve**) like a goal you “work towards,” with projected payoff dates driven by **% of daily inbound**. Jeremy clarified that is the wrong mental model: **Reserve is a holding tank**, not a savings goal with an ETA. Named goals (City, basketball, new shirt) are funded by **moving money out of Reserve**, and each named goal’s payoff date should come from a **fixed dollars-per-day** pace he sets — updating as Reserve → goal transfers raise saved and shrink to-go.

## Outcome

- **Reserve** is the default destination / holding tank: inbound Adjust and leftover credits land in Reserve first; **no** projected payoff / “to go” ETA on Reserve.
- Jeremy can **transfer** from Reserve into named Save Goals (tracking only — same ledger constraint as RB-037).
- Each **named** goal has an optional **fixed $/day** rate (not % of daily inbound).
- Projected payoff date for a named goal = `f(remaining, fixed $/day)` and **recalculates on read** when transfers change `savedAmount`.

## Decision (intake 2026-10-06)

| Choice | Rationale |
| --- | --- |
| **New item RB-041** (not a silent rewrite of RB-037) | Clear v1.x / v2 slice after ledger-only; keeps mid-flight RB-037 honest |
| Ship **after** ledger-only (RB-037 mid-flight on `cursor/save-goals-ledger-only-8ada`) | Complementary: daily % mix / daily apply UI already paused; Adjust remains the digital ledger entry path |
| **Existing balances stay put** (locked 2026-10-06) | Do **not** migrate named-goal balances into Reserve on ship; only **new** inbound / Adjust → Reserve |
| Rank **17** (immediately after RB-037); status **Done** | Shipped: PR #266 / `cursor/save-goals-reserve-hub-impl-8ada` → jeremyos-prod |

Parent: [RB-037 Save Goals](./save-goals.md). Still **not** Future/Treat / Venmo Total.

## Naming (locked)

| Term | Meaning |
| --- | --- |
| **Reserve** | System holding tank / default destination. Not a “working towards” goal. No payoff ETA. |
| **Named goal** | User-created Save Goal (e.g. City, basketball, new shirt) with optional target + fixed $/day. |
| **Transfer** | Ledger move Reserve → named goal (tracking only). Raises goal `savedAmount`, lowers Reserve balance. |
| **Fixed $/day** | Constant daily pace on a **named** goal for ETA math — **not** percent of inbound. |
| **Adjust** | Remains the digital ledger entry path for now (inbound / subtract) — credits **Reserve** by default when inbound. |

## Mental model (one sentence)

All tracked money lands in **Reserve** first; Jeremy moves amounts into named goals, and each named goal’s projected date follows remaining ÷ fixed $/day as those transfers land.

## Scope (v1) — recommended ship slice

Ship soon after ledger-only lands. Thin and numbers-first.

1. **Reserve as hub**
   - Reserve is a distinguished system pocket (always present or auto-created).
   - **No** projected payoff / target-date line on Reserve.
   - **No** “working towards Reserve” framing; copy = holding / available / default destination.
   - Default: Reserve has a **balance** (`savedAmount`); target amount optional / unused for ETA (default: **no target / no to-go ETA** — see defaults below).

2. **Inbound → Reserve**
   - Adjust **Inbound** (and any remaining apply/leftover path while paused UI stays off) credits **Reserve**, not a % split across goals.
   - **Ship migration:** leave existing named-goal `savedAmount`s unchanged — no bulk transfer into Reserve.
   - Daily % mix UI stays suppressed (ledger-only); do not revive % chips for this slice.

3. **Transfer Reserve → named goal**
   - Explicit transfer action: amount + destination goal; append ledger row(s); recompute balances.
   - v1 direction: **Reserve → named goal only** (reverse / goal↔goal later).
   - Cap transfer at available Reserve balance (no silent overdraft from Reserve in v1).

4. **Fixed $/day on named goals**
   - Per named goal: editable `dollarsPerDay` (or equivalent) ≥ 0.
   - Projection (on read):
     ```text
     remaining = max(0, targetAmount − savedAmount)
     if dollarsPerDay ≤ 0 or no target → targetDate = null  // “Set $/day to project” / no ETA
     etaDays = ceil(remaining / dollarsPerDay)
     targetDate = today + etaDays
     ```
   - After each transfer into the goal, saved ↑ → remaining ↓ → date moves **earlier** on next read.
   - Date labels include year (same as RB-037).

5. **Home / Save Goals surfaces**
   - Reserve card/row: balance (+ optional short “holding” line); **no** ETA.
   - Named goal cards: name, to-go, progress, **fixed $/day**, projected date (or prompt to set rate).
   - Transfer entry point on Reserve or goal detail — one short sheet, not a budget app.

6. **Tracking only** — still never touches Future/Treat or Venmo Total.

## Out of scope / later

- Reviving daily inbound % mix / multi-goal auto-split apply as the primary model
- Reserve payoff ETA or treating Reserve as a named savings goal
- Transfer **from** named goal → Reserve or goal↔goal (v1.x+ unless founder asks sooner)
- Auto-allocate fixed $/day from Reserve each calendar day (projection is pace math, not auto-drain)
- Real bank / Venmo movement
- Notifications when ETA slips
- Full envelope budgeting / categories beyond existing Adjust spend categories
- Custom weight editor / % chips as ETA drivers

## Defaults (product — not blocking)

| Topic | Default |
| --- | --- |
| Reserve target amount | **None** for ETA — balance-only hub; do not show “$X to go” as a goal race |
| Transfer direction v1 | **Reserve → named goal** only |
| Missing $/day | Named goal shows to-go / progress but **no** projected date until rate &gt; 0 |
| Inbound Adjust | Credits **Reserve** (new credits only) |
| Existing balances on ship | **Remain where they are** — do **not** migrate named-goal balances into Reserve |
| Ledger-only complementarity | Keep Adjust as entry path; do not re-enable daily apply/% mix in this slice |

## Dependencies & risks

- **Depends on** RB-037 ledger-only mid-flight (suppress daily inbound/% mix UI) landing or staying paused — this slice builds on Adjust-as-ledger, not on % apply.
- Do not debit Future/Treat; do not fold into RB-011 / RB-006.
- Projection must be **derived on read** so transfers immediately move the date (no stale cached ETA).
- RB-013 filter: founder-requested mental-model fix — ship thin; do not expand into generic finance OS.
- Evening Close “Money today” denseness (RB-038 / RB-032): prefer Home / `/save-goals` transfer sheet over thickening Close.

## Notes

- **Intake 2026-10-06:** Founder paused daily % mix / daily apply (ledger-only in flight). Clarified Reserve = holding tank; named goals funded by moves from Reserve; fixed $/day drives dynamic payoff dates. Captured as **RB-041** rank **17** / P0 — next Save Goals intent after ledger-only, without bumping unrelated higher P0s.
- **2026-10-06 ship start:** Status → **In Progress** (founder: ship to prod). **Migration locked:** existing named-goal balances **stay put**; only **new** inbound / Adjust credits default to Reserve going forward — no bulk move into Reserve on ship.
- **2026-10-06 Done:** Implemented on `cursor/save-goals-reserve-hub-impl-8ada`, **PR #266**, deployed **jeremyos-prod**. No-migrate honored (existing named-goal balances left in place).
- Supersedes RB-037 §5 target-date math **for named goals** (was inbound % × daily rate) and the example that projected Reserve ETA from %. RB-037 remains the parent item for ledger/Adjust history; **do not** delete RB-037.
- Related branch context: `cursor/save-goals-ledger-only-8ada` (complementary UI pause).
