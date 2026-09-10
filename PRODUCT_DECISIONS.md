# JeremyOS — Product decisions (locked)

Last updated: 2026-08-29  
Status: **JeremyOS pivot recorded** — executive assistant / personal OS north star; trail metaphor retiring; recovery/fund remain personal tools. **2026-08-29 follow-up:** keep Journey label + morning/evening mood ritual; drop craving stats and Home craving CTA (**RB-020**; RB-009 Won't Do). Personal tools intake: cameras / workout / recipes (RB-017–019). Prior V1 behaviors (schedule, Treat/Save, fund ledger, daily/weekly loop, Fly envs) stay locked unless explicitly superseded below.

---

## Product identity (locked 2026-08-29)

| Decision | Detail |
| --- | --- |
| **Name** | **JeremyOS** (founder corrected from early “Jeremy PS” lean) |
| **Role** | **Executive assistant / personal OS for Jeremy** — not a recovery-trail product |
| **Former framing** | ReBuild — recovery app with incentives + hiking/trail metaphor (docs/history may still say ReBuild/trail; IDs stay `RB-*`) |
| **North star** | EA + personal OS for Jeremy — things he wants and will use |
| **Anti-goal** | Do not invent a generic product to “love daily”; do not add features for their own sake; do not sell trail/hiking narrative |
| **Rebrand vs rewrite** | **Rebrand / reframe** (RB-012) — keep working tools (journal, fund honesty, auth, APIs, data); retire trail via copy + IA; no greenfield stack |
| **Elevate** | Email/Gmail skills, podcast + regular recovery content, to-do lists, five-year journal, home cameras (Reolink), workout tracker, favorite recipes, connections to other apps/sites Jeremy creates |
| **Recovery / fund** | Still valid as **personal tools** without trail language; secondary to EA / personal OS in ranking — not killed without evidence |
| **Journey nav** | **Keep “Journey”** as nav label / surface name (locked 2026-08-29; was open on RB-012) |
| **Daily mood / feeling** | **Keep and elevate** morning start + evening mood/stress/feelings as personal EA ritual |
| **Craving stats** | **Drop / Won't Do** — Journey/Home craving charts, pattern panels, craving analytics (RB-009 Won't Do) |
| **Home craving CTA** | **Removed** “I’m having a craving” from Home — **RB-020 Done** (2026-08-29; ID remapped from branch-local RB-017) |

Canonical backlog: RB-012 (rebrand + drop trail), RB-013 (north star), RB-014 (todos), RB-016 (five-year journal UX), RB-002 (Gmail/email), RB-005 (podcast + recovery content), RB-017 (cameras), RB-018 (workout), RB-019 (recipes), RB-015 (hub); **RB-020** (drop craving CTA/stats — Done). Journal backfill integrity remains RB-010 (distinct from RB-016 paper UI). RB-009 craving patterns = Won't Do.

---

## Environments

| Env | Purpose | Host |
|---|---|---|
| **dev** | Test / sample data; push freely without touching real journey | Fly.io (private) |
| **prod** | Founder true-source data | Fly.io (private) |

Separate data volumes/stores. Dev deploys must not overwrite prod.  
Venmo reconcile / link = later (UI totals first).

---

## Journey math

- One journey: cannabis + alcohol abstinence
- Combined historical daily spend
- Home: **Day N** = calendar days on the current abstinence run (**Day 1 = start date** / `currentRunStartedOn`, including the start day before any evening)
- **Milestones unlock when that day is reached** (clean-day count ≥ milestone day), not only after evening close — Home reward card can appear on the morning of Day 3, etc.
- **Waiting-to-reclaim accrual (locked 2026-08-21):** each completed calendar day in the current run credits **one** day’s `historicalDailySpend` into waiting reclaim when that **day ends**, whether or not the user closed the evening. Closing the evening also ensures the same credit (idempotent by date — **no double credit**). Evening close is **not** a gate for funds showing. Move to Rebuild still pulls from waiting reclaim as today. See RB-011.
- **Reset my journey** (Settings) → run resets next calendar day; history kept; restart / re-achieve (trail “re-climb” copy retired under RB-012)
- Return to use via evening alignment UI is **retired** (legacy `return_to_use` evenings still in history)
- Auth (RB-007): email/password accounts required; synced optional PIN; remember-this-device; admin allowlist; honor-system reclaim remains until verification exists
- Weekly support 100% gift: **$20** out-of-pocket; **not** in Save-delay rule

---

## Daily + weekly loop (personal recovery tools)

Still available as Jeremy’s personal recovery tools under JeremyOS (executive assistant / personal OS) — not the product north star. No trail metaphor in UX copy (RB-012). Do not expand this loop for “generic daily love” (see RB-013).

**Elevated (2026-08-29):** morning + evening **mood / feeling** that starts and ends the day — founder loves this; treat as personal EA ritual, not optional chrome.

**Dropped (2026-08-29):** craving **stats / analytics** and Home **“I’m having a craving”** CTA — **RB-020 Done**; RB-009 Won't Do for pattern insights.

Interactive every day:

**Morning** — Start the day (sleep + mood/state on 1–10 taps) → day-start briefing (quote + written summary); tasks stay on Home  
**Day** — Log supports: recovery content (2/wk), meditation (5), medication (7), gym (4). **No** Home craving-timer CTA (RB-020).  
**Evening** — Close the day: **Mood + Stress** (1–10), journal **headline** + optional **short summary** (~5 sentences soft limit; maps to stored `oneLine` / `expandedJournal`) → Move to Rebuild → Treat/Save if milestone. **Missed closes** can be backfilled from Journal (pick a day in the current run without an evening) via the same evening path (**RB-010** — journal only; funds for that day may already be in waiting reclaim via end-of-day accrual).

**Journal UI (RB-016)** — Paper **five-year** layout: one calendar day (month-day) shows that day across up to five years (headline + summary). Not a stacked feed. Catch-up for missed evenings stays a thin link; integrity rules remain RB-010.

Weekly supports are **targets** (not shame). Counts may go **above** the weekly goal (e.g. 5 of 2). Hitting all four unlocks **$20 treat gift** (out of pocket).  
Content log asks: “What will you do differently because of this?”

Closing the day **always counts as aligned** for reclaim / milestones. There is no evening “did you stay aligned?” card. Missing close does **not** skip daily savings accrual (RB-011).

**Reset my journey** lives in **Settings** (bottom): confirm → same run reset as legacy return-to-use (history kept; clean-day counter restarts next calendar day).

---

## Milestone schedule (clean days this run)

Dense cashable **only at start**, then thin.

| Kind | Days | UX |
|---|---|---|
| Checkpoint | 1, 2, 5, 10, 21 | Celebrate only |
| Reward | 3, 7, 14, 45, 60, 75, 105, 120, 150, 210, 240, 300, 330 | Treat or Save |
| Destination | 30, 90, 180, 270, 365 | Both allowed; **Treat primary**, Save secondary |

First cashable: **Day 3**. Micro every-14: paused.

---

## Fund ledger (matches Venmo total)

**Locked model:** two buckets only — see also `product/FUND_MODEL.md`.

**Total (must match Venmo)** = Future + Treat Yourself  
= sum of user-confirmed Move to Rebuild amounts still set aside.

**What I Rebuilt / reinvested** = spent (left Venmo) → shown separately, **not** in Total.

### Waiting to reclaim (daily savings)

- Source amount per day: `profile.historicalDailySpend`
- **Credit when:** the calendar day has ended **or** the user closes that evening — whichever happens first; never twice for the same date
- **Do not** require evening / journal close for the day’s savings to appear in waiting reclaim
- Move to Rebuild accounts waiting days into Future / Treat per split below

### On each confirmed Move $X

| Bucket | Default share | Horizon |
|---|---|---|
| Future | 30% | Longer-horizon park |
| Treat Yourself | 70% | Short-term spendable |

Recommended default **70/30**; user chooses Treat/Future mix at onboarding (`treatSplit`) and that mix applies to every Move. Big Total + segmented bar underneath.  
Legacy **Rebuild** bucket removed (any leftover folds into Future on normalize).

- **Treat Yourself** spend → debit **Treat** first; optionally **pull from Future** if item costs more than Treat  
- **Save for the Future** → skip spending this reward moment (does **not** move money into Treat)  
- Weekly $20 support gift → into **Treat** (OOP; not Save-delay)

Venmo drift / force-reconcile: later.

---

## Treat / Save rules

- **Home celebration card** (not evening): when a Reward/Destination is pending — “You’ve earned this” → **Claim reward** or **Save for future**
- Evening close only moves money / journals — **no** Treat/Save moment there
- Max **2 Saves for the Future in a row**; 3rd **must Claim** (Save hidden)
- Claim with **assigned** wishlist item → show cost, debit Treat (+ optional Future pull), optional photo
- Claim with **nothing assigned** → “How did you treat yourself?” + optional note/photo (no fund debit)
- Photos optional; stored on Fly volume under `.data/photos`; shown on that Journey / journal day (trail-day copy retired under RB-012)
- Treat resets delay counter  
- Wishlist claimable if **Treat + optional Future pull** covers cost  
- Forced Treat: must Claim (Save hidden) 

### Projected next-incentive pool

```text
projected = alreadyReclaimed + waitingReclaim + daysToGo × historicalDailySpend
```

(Suggested-save curve that moved money into Treat is **retired**.)

---

## Deferred

- Micro-reward every 14 days  
- Venmo API / bank verify / reconcile flow  
- Editable segment amounts  
- AI, travel polish, community  
- Craving stats / pattern analytics (RB-009) — **Won't Do**; thin UI removal is RB-020  
- Generic daily-loop “lovability” polish (deep content catalog as KPI) — paused under JeremyOS unless Jeremy asks  
- SMS channel (email elevated instead)  
- Multi-destination payment rails / segregated hold production — Later; Venmo auto-pull demoted from open P0  

## JeremyOS ranking note (2026-08-29)

Money integrity items already In Progress (e.g. end-of-day reclaim auto-credit) may finish as thin personal-tool fixes. New money-OS expansion does not outrank todos, email/Gmail, podcasts, cameras, workout/recipes, or Jeremy’s app hub. See `product/ROADMAP.md`.

**Personal tools intake (same day):** RB-017 home cameras (Reolink, ~founder priority 5), RB-018 workout tracker, RB-019 favorite recipes. Gmail folds into RB-002; regular recovery content stays on RB-005.

## Trail metaphor retirement (locked 2026-08-29)

Founder follow-up: drop trailer/trail theming — product is an executive assistant. Interpretation: **“trailer” = trail** (hiking/recovery trail copy). **RB-012** owns thin chrome/copy/IA retirement. Do not start over from a blank codebase for metaphor alone.

## Journey label + craving cut (locked 2026-08-29)

Founder follow-up: keep Journey (nav/surface); keep daily mood/feeling start+end; drop craving stats; drop Home “I’m having a craving.” Product: RB-012 Journey label locked; **RB-020 Done** (UI cut shipped; ID remapped from branch-local RB-017 after main assigned RB-017–019); RB-009 craving patterns → Won't Do.
