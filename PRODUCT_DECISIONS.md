# JeremyOS — Product decisions (locked)

Last updated: 2026-10-10  
Status: **JeremyOS pivot recorded** — executive assistant / personal OS north star; trail metaphor retiring; recovery/fund remain personal tools. **2026-08-29 follow-up:** morning/evening ritual + drop craving stats / Home craving CTA (**RB-020**; RB-009 Won't Do); Journey label keep **superseded 2026-10-10** → **Health** (**RB-043**). Personal tools intake: cameras / workout / recipes (RB-017–019). **2026-09-15:** Gmail **inbox** centralization elevated (**RB-002** Ready / rank 7) — connect + read inbox in JeremyOS; outbound send = phase 1b. **2026-09-27:** **Save Goals** (**RB-037**) — Home “Save towards something”; separate from Future/Treat; tracking only. **2026-10-07:** Save Ledger **removed from Close** (`/evening`) — Home/Adjust path stays; not a product kill. **2026-09-28:** **Close edition = Open parity** (**RB-038**) — chrome Done; **content thinned by RB-042**. **2026-10-05:** **Ignore missed journal days** (**RB-039**) — past missed/incomplete only; persisted dismiss; today never ignorable. **2026-10-07:** **Open/Close thin redesign** (**RB-042**) — Close = journal + star + photo + dayRating 1–5 (Mood/Stress **dropped**); Open = Home gate on sleep quality 1–5 + focus line + lean briefing. **2026-10-10:** **Health tab** (**RB-043**) — nav label Journey→Health; sleep quality 1–5 primary; drop Conditions chart + med adherence (**RB-031** Won't Do); keep BP/HR data (secondary viz). Prior V1 behaviors (schedule, Treat/Save, fund ledger, daily/weekly loop, Fly envs) stay locked unless explicitly superseded below.

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
| **Health nav** | Nav/tab label **Health** (was Journey) — locked **2026-10-10** ([RB-043](./product/items/health-tab-sleep-primary.md)); supersedes 2026-08-29 “keep Journey” (RB-012 / RB-020). Route may stay `/journey` (label-first); `/health` redirect optional later |
| **Daily Open / Close ritual** | **Keep and elevate** as personal EA ritual — **thinned 2026-10-07 (RB-042):** Open = sleep quality 1–5 + focus line; Close = journal + single day rating 1–5. **Mood + Stress dropped** (supersedes 2026-08-29 multi-metric wording) |
| **Health tab content** | **Sleep quality 1–5 primary** (Open era ~2026-10-07); **drop Conditions** multi-metric 1–10 chart; **no Medication adherence**; **keep all BP/HR vitals data** (secondary; better viz than list-only — not the old vitals chart). **RB-031 Won't Do** |
| **Craving stats** | **Drop / Won't Do** — Health/Home craving charts, pattern panels, craving analytics (RB-009 Won't Do) |
| **Home craving CTA** | **Removed** “I’m having a craving” from Home — **RB-020 Done** (2026-08-29; ID remapped from branch-local RB-017) |

Canonical backlog: RB-012 (rebrand + drop trail), RB-013 (north star), RB-014 (todos), RB-016 (five-year journal UX), RB-002 (Gmail/email), RB-005 (podcast + recovery content), RB-017 (cameras), RB-018 (workout), RB-019 (recipes), RB-015 (hub); **RB-020** (drop craving CTA/stats — Done); **RB-043** (Health tab sleep primary). Journal backfill integrity remains RB-010 (distinct from RB-016 paper UI). RB-009 craving patterns = Won't Do. RB-031 med adherence = Won't Do.

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

**Elevated (2026-08-29; thinned 2026-10-07):** morning Open + evening Close that start and end the day — founder loves the ritual; treat as personal EA ritual, not optional chrome. **Metrics thinned by RB-042** (below) — ritual kept, multi-scale Mood/Stress **dropped**.

**Dropped (2026-08-29):** craving **stats / analytics** and Home **“I’m having a craving”** CTA — **RB-020 Done**; RB-009 Won't Do for pattern insights.

**Dropped (2026-10-07 — RB-042):** evening **Mood + Stress** (1–10); morning multi-scales (mood/energy/stress/sleep-hours UI); Open/Close rich paper body (workout, world news, multi-scale chrome, Into the day, edition wait as needed). Supersedes prior PRODUCT_DECISIONS / RB-032 / RB-038 content locks that kept Mood+Stress and twin paper sections.

Interactive every day:

**Morning (Open)** — **Gate Home** until **sleep quality 1–5** is submitted for today. Fields: sleep quality **1–5** + focus line labeled **“One thing I will focus on today”** (replaces intention / do-well; may still store as `intention`). After submit → Home. Lean briefing show: **this-day-in-history** journal (prior years; hide if empty); **today weather** with morning/afternoon/evening derived phrases; **real-language calendar + tasks prose** (rules-based OK; generative AI optional later). **No** morning Items checklist; tasks stay on Home / prose. Canonical item: **[RB-042](./product/items/open-close-thin-redesign.md)**. Parents Done: [RB-027](./product/items/morning-day-start-briefing.md), [RB-030](./product/items/morning-briefing-conversational.md), [RB-032](./product/items/daily-briefing-open-close-redesign.md).  
**Day** — Log supports: recovery content (2/wk), meditation (5), medication (7), gym (4). **No** Home craving-timer CTA (RB-020). **No** Medication adherence card on Health (**RB-031** Won't Do / **RB-043**).  
**Evening (Close)** — Close the day: journal **headline** + optional **short summary** (~5 sentences soft limit; maps to stored `oneLine` / `expandedJournal`) + **star** + **photo** + single **day rating 1–5** (`dayRating` — **not** mood; **no** stress) → Move to Rebuild → Treat/Save if milestone. **No** Mood/Stress. **No** paper body (weather/news/tasks/bodymind/history/etc.). **Missed closes** can be backfilled from Journal (pick a day in the current run without an evening) via the same evening path (**RB-010** — journal only; funds for that day may already be in waiting reclaim via end-of-day accrual). Chrome history: [RB-038](./product/items/close-edition-open-parity.md) Done; **content = RB-042**.

**Journal UI (RB-016)** — Paper **five-year** layout: one calendar day (month-day) shows that day across up to five years (headline + summary). Not a stacked feed. Catch-up for missed evenings stays a thin link; integrity rules remain RB-010. **Ignore past missed/incomplete days** (not today) is **RB-039** — persisted dismiss from catch-up; does not create a close; does not change reclaim/milestones.

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

## Save Goals (locked 2026-09-27)

| Decision | Detail |
| --- | --- |
| **Ask** | Founder: Home card “Save towards something”; to-go paydown; $500/mo → per day; lump sums; evening spend + leftover (or go negative); target date; tracking only — “let’s go” |
| **ID** | **RB-037** |
| **Name** | **Save Goal** (empty CTA: “Save towards something”) |
| **≠ fund buckets** | Separate from Future / Treat / Venmo Total — see `product/FUND_MODEL.md` § Save Goals |
| **Money** | Does **not** move real cash; no Venmo; no debit from Future/Treat |
| **Income math** | `dailyRate = monthlyIncome / daysInMonth` (default monthlyIncome = 500) |
| **Evening / Close** | **Removed 2026-10-07** — no Save Ledger / Day total / Add·Subtract·Apply / leftover on `/evening`. Entry = Home + Adjust (+ Reserve transfer). Product stays; Close surface cut only |
| **Rank / status** | **Rank 17 / P0 / In Progress / Effort M** — Now queue after five-year journal + Ignore-missed (RB-039); founder-elevated personal tool |
| **≠** | Reward-moment “Save for the Future” (skip Treat) |

## Ignore missed / incomplete journal days (locked 2026-10-05)

| Decision | Detail |
| --- | --- |
| **Ask** | Founder: aside from today, Journal missed/incomplete days need an **Ignore** option so the day goes away |
| **ID** | **RB-039** (new item — **not** an expansion of RB-010 / RB-016 / RB-022) |
| **Ignore means** | **Persisted dismiss** from catch-up / missed UI (Journal + evening pick-a-missed-day). **Not** UI-only. **Not** a synthetic evening close |
| **Eligibility** | Past days only (`date < today`) in the current run with no evening close — same set as `missingEveningDates` excluding today. “Missed” and “incomplete” share that set in v1 |
| **Today** | **Never ignorable** |
| **Integrity** | No reclaim, Move, milestone, or clean-day side effects; no fabricated journal prose |
| **Restore** | Out of v1 UI; storage stays reversible for a later un-ignore |
| **Rank / status** | **Rank 15 / P0 / In Progress / Effort XS** — Now, immediately after RB-016; eng can ship thin slice now |
| **≠** | RB-010 backfill (complete the close); RB-016 five-year presentation; RB-022 edit/star/calendar |

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

## Gmail inbox centralization (locked 2026-09-15)

| Decision | Detail |
| --- | --- |
| **Ask** | Founder: connect Gmail inbox now; centralize email in JeremyOS — “it’s time” |
| **ID** | **RB-002** (extend existing item — no duplicate Gmail mega-item) |
| **v1** | Settings Google OAuth → **read-only** inbox list + message read; single Gmail account; prefer `gmail.readonly` |
| **Out of v1** | Full client (compose/labels/archive), multi-mailbox, AI triage, replacing Gmail app |
| **Phase 1b** | Outbound transactional send (unblocks forgot-password + RB-003 digest) — same ID, after inbox |
| **Rank / status** | **Rank 7 / P0 / Ready / Effort L** — Now queue after framing + todos + mid-flight task IP |
| **Start eng?** | **Not full ship yet** — finish or free-lane around In Progress RB-026 / RB-033 / journal; **OAuth/consent spike OK early** (restricted Gmail scopes) |
| **≠ calendar** | Google Calendar OAuth remains **RB-023** (Done); separate grant from Gmail |

## Close edition = Open parity (locked 2026-09-28; content superseded 2026-10-07)

| Decision | Detail |
| --- | --- |
| **Ask** | Founder: evening “close for the day” should use the same format / look-and-feel as morning **The Daily Open** / edition box |
| **ID** | **RB-038** |
| **Name** | **The Daily Close** (Evening edition) — twin of **The Daily Open** |
| **Change** | Visual/structure parity only: mast, edition-box check-in, collapsed reopen, paper story sections |
| **Status** | **Done** (chrome). **Content keep-list superseded by RB-042** — do not rebuild Mood+Stress or rich paper body |
| **Not on Close** | Save Ledger / Save Goals spend block (removed 2026-10-07 — see RB-037) |
| **Do not change** | Fund buckets / Venmo Total / waiting-reclaim accrual; Treat/Save on Home only; news never in `oneLine`; no dismiss/skip |

## Open / Close thin redesign (locked 2026-10-07)

| Decision | Detail |
| --- | --- |
| **Ask** | Founder: thin Open/Close — Close journal + star + photo + day rating 1–5; Open gates Home on sleep quality 1–5 + focus + lean briefing |
| **ID** | **RB-042** |
| **Close** | Journal headline + short summary; star; photo; single **dayRating 1–5**. **Drop Mood/Stress entirely.** **Drop paper body** (weather/news/tasks/bodymind/etc.) |
| **Open** | **Gate Home** until sleep quality 1–5 submitted for today → then Home. Fields: sleep quality 1–5 + focus **“One thing I will focus on today”** (replaces intention/do-well). Show: this-day-in-history (hide if empty); today weather morning/afternoon/evening phrases; real-language calendar+tasks prose (rules-based OK). Strip workout, world news, multi-scales, Into the day, edition wait chrome as needed |
| **Supersedes** | Evening Mood+Stress 1–10 lock; “keep/elevate mood ritual” as multi-metric; RB-032 rich twin paper body as active scope; RB-038 content keep-list |
| **API** | Evening: **`dayRating` 1–5** (not `mood`); drop stress on new writes. Morning: **`sleepQuality` 1–5** for gate; focus may reuse `intention` with new label. Legacy mood/stress/multi-scale rows: read soft; no backfill required |
| **Do not change** | Fund / Venmo / Treat-Save / waiting reclaim; no dismiss/skip; aligned close always |
| **Rank / status** | **Rank 8 / P0 / Ready / Effort M** — Now after Gmail Ready |

## Trail metaphor retirement (locked 2026-08-29)

Founder follow-up: drop trailer/trail theming — product is an executive assistant. Interpretation: **“trailer” = trail** (hiking/recovery trail copy). **RB-012** owns thin chrome/copy/IA retirement. Do not start over from a blank codebase for metaphor alone.

## Journey label + craving cut (locked 2026-08-29; nav superseded 2026-10-10)

Founder follow-up (2026-08-29): keep Journey (nav/surface); keep daily start+end ritual; drop craving stats; drop Home “I’m having a craving.” Product: **RB-020 Done** (UI cut shipped; ID remapped from branch-local RB-017 after main assigned RB-017–019); RB-009 craving patterns → Won't Do. **2026-10-07:** start+end ritual metrics thinned to Open sleep quality + Close dayRating (**RB-042**) — Mood/Stress multi-metric wording superseded. **2026-10-10:** “Keep Journey nav label” **superseded** — see **Health tab** lock below (**RB-043**).

## Health tab (locked 2026-10-10)

| Decision | Detail |
| --- | --- |
| **Ask** | Founder: rename Journey → **Health**; sleep quality primary; drop Conditions + med adherence; keep BP/HR |
| **ID** | **[RB-043](./product/items/health-tab-sleep-primary.md)** |
| **Nav label** | **Health** (not Journey). Supersedes RB-012 / RB-020 Journey keep |
| **Route** | Prefer keep **`/journey`** (label-first). Optional `/health` redirect later — not required for v1 |
| **Primary** | **Sleep quality** only — **1–5** scale from Open move (**RB-042**, ~**2026-10-07**). Top of Health page |
| **Drop** | Historic **Conditions** chart (mood/energy/stress multi-metric **1–10** era); **Medication adherence** section entirely |
| **Vitals** | **Keep all BP/HR data** ([RB-028](./product/items/journey-vitals-bp-hr.md)); secondary to sleep; visualize differently from list-only (not restore old vitals chart) |
| **Supersedes** | **[RB-031](./product/items/journey-med-adherence-drop-vitals-chart.md)** → **Won't Do**; Journey nav keep notes |
| **Rank / status** | **Rank 8 / P0 / In Progress / Effort S** — thin reshape building now |
