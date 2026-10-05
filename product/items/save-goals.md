# Save Goals — “Save towards something”

| Field | Value |
| --- | --- |
| ID | RB-037 |
| Rank | 15 |
| Priority | P0 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product (build: Reese + UXUI) |

## Problem

Jeremy wants a simple way to save toward a named thing (gift, trip, holiday) on Home — see how much is **to go**, watch it pay down, and each evening decide whether leftover cash after spend goes into those goals (or whether overspend pulls them backward). This is **not** the Venmo-matching Future / Treat incentive ledger; actual bank money does not move.

## Outcome

- Home shows a **Save Goals** card per active goal: name, **to go**, progress paid down over time, projected **target date**.
- Monthly income ($500 on the 1st) is converted to a **per-day rate**; evening close captures **total spend**, leftover (or deficit), and allocation to goals.
- Optional **lump-sum** days split among goals.
- Tracking-only UI + backend — no rails, no Venmo, no debit from Future/Treat.

## Naming (locked)

| Term | Meaning |
| --- | --- |
| **Save Goal** | One named target (gift / trip / holiday). Canonical product name. |
| **Card title** | “Save towards something” when empty / create CTA; active cards use the goal’s name. |
| **to go** | `max(0, targetAmount − savedAmount)` for display of remaining; balance may go **negative** in the ledger when overspend is applied. |
| **Not** | A third fund bucket. Not Future. Not Treat Yourself. Not a “category” in UX copy (implementation may use `allocations[]` internally). |

## Relation to Future / Treat (locked)

| | **Future / Treat Yourself** (`FUND_MODEL.md`) | **Save Goals** (this item) |
| --- | --- | --- |
| Job | Recovery incentive set-aside matching Venmo Total | Discretionary cashflow planner toward named goals |
| Source | `historicalDailySpend` → waiting reclaim → Move | Monthly income ($500 default) → daily rate − spend → leftover |
| Money moves? | Honor-system reclaim / Move / Treat spend (Venmo story) | **Never** — UI + `db.json` tracking only |
| Ledger | `state.fund` | `state.saveGoals` + `state.saveGoalDays` (new) |
| Evening | Journal / reclaim ensure; no Treat/Save moment | **New step:** spend + leftover / deficit allocation |

Do **not** debit Future or Treat when funding a Save Goal. Do **not** include Save Goal balances in Venmo Total.

Canonical rules also noted in [`../FUND_MODEL.md`](../FUND_MODEL.md) § Save Goals.

---

## Scope (v1) — implementation spec

### 1. Data model

Add to app state (same `.data/db.json` patterns as fund/todos):

```ts
type SaveGoal = {
  id: string;
  name: string;                 // e.g. "Hawaii", "Mom's gift"
  targetAmount: number;         // > 0
  savedAmount: number;          // can go negative when deficit applied
  createdOn: string;            // YYYY-MM-DD
  status: "active" | "reached" | "archived";
  /** 0–1 share of positive leftover / lump among active goals; v1 default equal weights renormalized */
  allocationWeight: number;
};

type SaveGoalSettings = {
  monthlyIncome: number;        // default 500
  incomeDayOfMonth: number;     // default 1 (display/mental model; rate uses full month)
};

type SaveGoalDay = {
  date: string;                 // YYYY-MM-DD, one row per closed day
  dailyIncome: number;          // snapshot of rate used that day
  spendTotal: number;           // user-entered total spend (≥ 0)
  leftover: number;             // dailyIncome − spendTotal  (may be negative)
  lumpSum: number;              // optional extra that day (default 0)
  allocations: Array<{
    goalId: string;
    amount: number;             // signed: + toward goal, − drawn from goal
  }>;
};

// on AppState / user state:
saveGoalSettings: SaveGoalSettings;
saveGoals: SaveGoal[];
saveGoalDays: SaveGoalDay[];
```

**Invariants**

- One `SaveGoalDay` per calendar date (idempotent on evening re-close: replace that date’s row and recompute `savedAmount` from all days, or apply delta carefully — prefer **recompute from ledger**).
- `savedAmount` for each goal = sum of `allocations[].amount` for that `goalId` across all `saveGoalDays` (+ optional seed). Prefer derived-on-read or rewrite-on-write; keep UI honest.
- Goal reaches `status: "reached"` when `savedAmount >= targetAmount` (do not auto-archive).

### 2. Daily income rate math

```text
daysInMonth(y, m) = calendar days in that month
dailyIncomeRate(date) = monthlyIncome / daysInMonth(year(date), month(date))
```

Examples at `$500` (**daily rate** floors to whole dollars; Subtract/Add lines keep cents):

| Month | Days | Per day |
| --- | --- | --- |
| January | 31 | `$16` |
| February (non-leap) | 28 | `$17` |
| April | 30 | `$16` |

- Use the **same local-date convention** as evening / journey (no UTC drift).
- Snapshot `dailyIncome` onto `SaveGoalDay` when the day is closed so later settings edits do not rewrite history.
- Mental model copy: “$500 lands on the 1st; each day of the month gets an equal share.”

### 3. Evening close flow changes

Insert a thin **Money today** step in evening close (after mood/journal is fine; before or after Move-to-Rebuild — **do not block** reclaim / journal). Suggested order: mood → journal → **Save Goals day** → existing reclaim/Move UI if any → success recap.

**Fields**

1. **Total spend** (required number, ≥ 0) — what Jeremy spent today.
2. **Lump sum** (optional, ≥ 0) — extra money to put toward goals today (bonus / gift / windfall).
3. Compute:
   ```text
   leftover = dailyIncomeRate(today) − spendTotal
   pool = leftover + lumpSum
   ```
4. **Allocation UI**
   - **Positive leftover** uses preset **inbound chips** (`allocationWeight` as 0–100%, sum 100% across actives). Default: 100% to one target area (trip / gift / general saving).
   - If leftover `< 0` (overspend): **choose which goal to take from** (required when more than one active); balances may go **negative**.
   - **Lump / one-time**: chips — **Daily chips** (same preset) or **Custom (one area)** to send all to a chosen goal.
   - If `pool === 0`: no allocations; still store the day row.
   - If **no active goals**: skip allocation UI; still store spend/income/lump for history.
5. Persist `SaveGoalDay` + update `savedAmount`s. Closing again for the same date **replaces** that day’s close row (recompute). One-time Home adjusts append `kind: "adjust"` rows.
6. Changing inbound % **recalculates target dates** on read (`goalDaily = projectedPool × percent/100`).

**Out of evening:** creating/editing goals, changing monthly income, inbound chips / Split %, one-time add/subtract (Home).

### 4. Landing (Home) card UX

- Placement: Home, with other glance cards (not inside Future/Treat Money bar).
- **Empty state:** one card — title **“Save towards something”**, short line (“Gift, trip, holiday…”), CTA to create first goal (name + target amount).
- **Active goal card(s):**
  - Goal **name** as title
  - **To go:** `$X to go` where `X = max(0, target − saved)`; if `saved < 0`, also show deficit tone (e.g. “$Y under”).
  - Progress: paid-down bar or simple `saved / target` (clamp bar at 0–100% for display even if saved &lt; 0 or &gt; target).
  - **Target date** line: `On track for Mon, Apr 12` / `Reached` / `Needs leftover to project`.
- v1: show **up to 3** active goals as separate compact cards (or one stacked card with rows); overflow → “See all” later OK to omit if ≤3 is the soft cap.
- No Venmo Total, no Future/Treat chrome on this card.

### 5. Target date calculation rules

For each **active** goal with `savedAmount < targetAmount`:

```text
remaining = targetAmount − savedAmount          // cents OK
share = inboundPercent(goal) / 100              // live chip %

// Steady pace = regular daily inbound × %  (e.g. $16 × 20% = $3.20/day)
// Ignore Left, rolled carry, one-time adds/lumps, and today’s spend.
base = dailyIncomeRate(today)                   // floored whole dollars
goalDaily = base × share
if goalDaily ≤ 0 or share ≤ 0 → targetDate = null  // UI: "Needs leftover" / "0% daily"

// If today not yet applied, count today’s regular credit once
if today open: remaining -= goalDaily
etaDays = ceil(remaining / goalDaily)
targetDate = today + etaDays calendar days
```

Example: Reserve $985 to go at 20% of $16/day → $3.20/day → ~308 days (show **year** in the label).

- If `savedAmount >= targetAmount` → show **Reached** (no date needed).
- Do not use Future/Treat or `historicalDailySpend` in this math.
- Recalculate on read so inbound % steppers update the date immediately.
- Date labels always include the year (goals often land next calendar year).

### 6. Create / settings (thin)

- Create goal: name + target amount; `allocationWeight = 1` (equal among actives).
- Settings (or inline on card): edit `monthlyIncome` (default 500); archive goal; edit target/name.
- v1 may use equal weights only (no UI for custom weights) — still store `allocationWeight` for lump/manual overrides later.

### 7. Apply totals when leftover has rolled (polish — locked 2026-09-28)

Unapplied days do **not** credit goals; their left **rolls** into today’s Day total / Left (`carryIn`). One tap of **Apply totals** today already locks the **full stack** (rolled + today) into goals in a single close — history is baked into carry. Founder ask: when there is rolled history, confirm what they mean to lock.

**When the prompt appears**

- Only when tapping **Apply totals** (or Re-apply) and `carryIn !== 0` on the apply date.
- If `carryIn === 0`: no sheet — apply today as today (unchanged).
- Same trigger on Home saver + evening Money today / `/save-goals`.

**UX (2 choices max — plain money, no calendar jargon)**

Lead (one line, dollars first):

> **$48 left** includes **$32** that rolled in.

Option labels + one-line helpers (use live `left` / `carryIn` amounts):

| # | Label | Helper |
| --- | --- | --- |
| 1 (default) | **Apply all $48** | Puts the full left into your goals — rolled + today. |
| 2 | **Apply only the $32 rolled** | Goals get the rolled amount; today’s leftover keeps rolling. |

Deficit tone when `left < 0` / `carryIn < 0`: same structure with “takes from your goals” instead of “puts … into”.

Primary CTA confirms the selected option; Cancel dismisses with no write.

**Backend semantics**

| Option | Behavior vs today’s single apply |
| --- | --- |
| **Apply all** | **Same as current** `applyTotals` / `applySaveGoalDayTotals(today)`: one close for today; `leftover = inbound(base+carry) + adds − spend`; allocations use that leftover; roll stops. |
| **Apply only rolled** | **Differs:** close each prior open day in the roll chain (`d < today`, no close yet) in date order via existing `recordSaveGoalDay` / apply path so each day’s own left credits goals; **do not** close today. Afterward `carryIn(today) === 0` and today’s Left is only today (`base + adds − spend`), still unapplied. No new ledger kinds required. |

Do **not** invent a third “apply through yesterday but rewrite today’s close” path. Do **not** require picking individual calendar days in the sheet.

**Not a new backlog item** — polish inside **RB-037**; effort stays **M** (thin sheet + prior-day catch-up apply loop).

## Out of scope / later

- Real bank / Venmo / auto-pull / moving cash
- Merging Save Goals into Future or Treat; “Save for the Future” reward moment unchanged
- Full budget app (merchant categories, bills calendar, envelopes beyond goals)
- >3 Home cards layout polish / dedicated Money page section (thin Settings list OK in v1)
- Custom weight editor UI (equal split is fine)
- Notifications / payday reminders
- Multi-currency
- Changing historical daily rates when `monthlyIncome` edits (history stays snapshotted)
- Per-day picker / “apply this date only” calendar UI for rolled history (catch-up sheet above is enough)

## Dependencies & risks

- Evening close is already dense (RB-032 Daily briefing Close) — keep Save Goals step **one screen**, numbers-first, no essay copy; roll prompt is a **short confirm sheet**, not a second Money step.
- Do not disturb RB-011 reclaim ensure or Venmo Total honesty.
- Timezone: reuse evening local date helper.
- RB-013 filter: founder-requested personal tool — ship thin; do not expand into generic finance OS.
- Apply-only-rolled must walk prior days with the **same** spend/add entries + inbound % / draw-from rules as a normal apply (deficit days still need a draw goal when >1 actives).

## Notes

- **Intake 2026-09-27:** Founder asked for Home “Save towards something”, to-go paydown, $500/mo → per day, lump sums, evening spend/leftover (incl. negative), target date; tracking only; “let’s go.” Elevated to **Ready / rank 13 / P0** — not parked with demoted fund rails (RB-001/RB-006).
- Distinct from reward-moment **Save for the Future** (skip Treat) — different words, different ledger.
- **2026-09-28 Apply-with-roll:** Founder unsure how to prompt elegantly when unapplied leftover rolls across days. Locked §7: two money-first choices (apply all vs apply only rolled); appear iff `carryIn !== 0`; default = apply all (= current single apply). Ship as RB-037 polish — no new ID.
