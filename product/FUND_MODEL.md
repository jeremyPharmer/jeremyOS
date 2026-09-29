# Fund model (locked)

Last updated: 2026-09-27  
Status: **Decision locked** — supersedes three-bucket 50/25/25 and the old “Save into Treat” direction.

**JeremyOS context (2026-08-29):** This ledger remains the locked model for Jeremy’s **personal** incentive / recovery money tools. Under the JeremyOS pivot it is **secondary** to the personal-OS north star (todos, email, podcasts, hub) — not deleted. Implementation polish (RB-006) and Venmo rails (RB-001) are demoted in ranking; do not invent a kill without founder confirmation.

**Save Goals (2026-09-27):** A **separate** discretionary tracker (**RB-037**) — named goals (“Save towards something”), monthly income → daily rate, evening spend/leftover. **Not** a third fund bucket; **not** in Venmo Total; actual money does not move. See § Save Goals below.

## Mental model

| Bucket | Horizon | Job |
| --- | --- | --- |
| **Future** | Longer | Park money for bigger / later goals |
| **Treat Yourself** | Short-term | Near-term spendable incentive — “I have $7 in here…” |

**Venmo-matching Total** = Future + Treat Yourself  
**What I Rebuilt** (spent / left Venmo) sits outside Total.

## Waiting to reclaim (before Move)

Daily savings enter **waiting reclaim** so Move to Rebuild has something to confirm:

| Rule | Detail |
| --- | --- |
| Amount | One day’s `historicalDailySpend` per eligible calendar day |
| When | When the **day ends**, or when the user **closes that evening** — first wins; **no double credit** |
| Gate | Evening / journal close is **not** required for funds to show |
| Scope | Current abstinence run only; do not invent a second ledger path |

Canonical backlog item: **RB-011**. Journal backfill of missed evenings is **RB-010** (separate).

## Split on each Move

On each confirmed **Move to Rebuild** amount `$X`, split by the user’s **Treat / Future** mix (chosen at onboarding; recommended default **70% Treat / 30% Future**):

| Bucket | Default share |
| --- | --- |
| **Future** | **30%** (recommended) |
| **Treat Yourself** | **70%** (recommended) |

Stored on the profile as `treatSplit` and applied to every Move. Weekly support gift ($20 OOP) → into **Treat**; does not count toward Save-delay.

## Reward / Destination moment (UX)

When the journey hits a **Reward** or **Destination** day, present two choices:

### 1. Treat Yourself (short-term)

- Spend on a wishlist item (or create one in-flow).
- Default pay-from: **Treat Yourself** balance.
- User may spend **up to the Treat balance**, and **optionally pull from Future** if they want a bigger treat than Treat alone covers.
- Example: Treat = $7, item = $40 → user can pull $33 from Future (if available) to complete the Treat, or pick a cheaper item, or Save for the Future instead.
- Debits: Treat first, then any opted Future pull. Logged under **What I Rebuilt**.

### 2. Save for the Future (longer horizon)

- Choose **not** to spend the short-term Treat right now.
- Reinforces parking for later — Future stays the long-horizon bucket.
- Does **not** move money *into* Treat (that old “Save & compound → Treat” direction is **retired**).
- Max **2 Saves for the Future in a row**; 3rd reward moment **must** Treat Yourself (Save hidden) so the short-term loop still fires.

## What we drop

- **Rebuild** middle bucket (25%)
- Split of 50 / 25 / 25
- “Save & compound” that moved Future → Treat
- Rule that Treat spend required Treat ≥ full cost with no Future pull
- Reclaim credit **only** via evening close (replaced by end-of-day accrual + optional close; RB-011)

## UX review ask (UXUI)

Please review Money + reward-moment flows for:

1. Two-segment bar: Future | Treat Yourself (30/70 after each Move)
2. Reward screen copy: **Treat Yourself** vs **Save for the Future**
3. Treat flow: show Treat balance; allow optional **pull from Future** when item > Treat
4. Clear short-term vs long-horizon language (Treat = now / soon; Future = park)

Handoff detail: `product/UX_HANDOFF_FUND_BUCKETS.md`

## Save Goals (separate from this ledger)

Canonical backlog: **RB-037**. Product name: **Save Goal**. Home empty CTA: **“Save towards something.”**

| Rule | Detail |
| --- | --- |
| Job | Track progress toward a named target (gift, trip, holiday) |
| Relation | **Parallel** to Future / Treat — never merges into `state.fund` |
| Venmo Total | **Excluded** — Save Goal balances do not affect Total |
| Money movement | **None** — UI + backend tracking only |
| Income | Default **$500** credited conceptually on the **1st**; daily rate = `monthlyIncome / daysInMonth` |
| Evening | Enter **total spend**; `leftover = dailyRate − spend` (+ optional lump sum); allocate to active goals; overspend may pull goals **negative**. Unapplied left **rolls**; Apply with roll-in prompts **all** vs **only rolled** (RB-037 §7) |
| Home | Card shows **to go**, paydown, projected **target date** |

Do **not** debit Future or Treat when allocating to a Save Goal. Do **not** confuse with reward-moment **Save for the Future** (skip Treat) — different words, different ledger.

## Implementation note

App code may still use `future / rebuild / treat` and 50/25/25. Migrate ledger + Money UI + milestone reward screen to this model.

Waiting reclaim: keep a single idempotent ensure-by-date path (`ensureReclaimDay`); call it from end-of-day catch-up **and** evening close.

Save Goals: new `saveGoals` / `saveGoalDays` / `saveGoalSettings` state — keep reclaim ensure and Venmo Total paths untouched.
