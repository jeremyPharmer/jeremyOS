# Close edition: match Open’s Daily Open format

| Field | Value |
| --- | --- |
| ID | RB-038 |
| Rank | 8 |
| Priority | P0 |
| Status | Done |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: UXUI + Reese as needed) |

## Problem

Morning **Open** shipped a clearer **“The Daily Open” / edition-box** newspaper format (`open-edition` mast + check-in box → paper stories). Evening **Close** still uses the older `paper-edition` / panel check-in shell from [RB-032](./daily-briefing-open-close-redesign.md). Twin rituals no longer match — Close feels like last week’s paper.

## Outcome

**The Daily Close** uses the **same format and look-and-feel** as **The Daily Open**: shared edition mast, edition-box check-in, then paper body with story sections. Content stays evening-correct (look-back + tomorrow); locked evening / fund / journal behaviors do not change.

## Naming (locked)

| Term | Meaning |
| --- | --- |
| **The Daily Close** | Masthead title (twin of **The Daily Open**) |
| **Evening edition** | Flag / dateline under the mast (twin of **Morning edition**) |
| **Edition box** | Unified check-in container before the paper body (same chrome as Open) |
| **Close the paper** (or equivalent) | Primary CTA after check-in fields are ready — mirrors Open’s **Open the paper** |
| **Not** | A new product surface; not a second journal; not a money OS redesign |

## Scope (v1) — visual / structure parity

### Must-have parity with Open

1. **Mast** — date · Evening edition / **The Daily Close** / rule (same hierarchy as Open)
2. **Edition box** for pre-close check-in — kickers, vitals, lead fields, soft “about a minute” note; drop generic `panel` chrome
3. **Collapsed check-in** after close (reopenable) — same pattern as Open’s collapsed lead
4. **Paper body** — `open-edition` story / section-head / pair layout (or shared class twin); no dashboard cards
5. **Flow** — check-in **first**, then paper (already locked in RB-032; keep)

### Content sections Close should keep

| Section | Role |
| --- | --- |
| **Mood + Stress** (1–10 tap chips) | Evening check-in only — **not** morning’s five scales |
| **Journal** — Headline + optional short summary (~5 sentences soft) | Personal prose → `oneLine` / `expandedJournal` |
| **Star** + optional **photo** | RB-022 / RB-021 surfaces on evening |
| **Money today** (Save Goals spend / leftover / lump) | When [RB-037](./save-goals.md) is live — **tracking only**; numbers-first, one block |
| **Move to Rebuild** preview / confirm (as today) | Personal fund tool — do not redesign ledger |
| **Remember** (post-close lead) | Persisted headline + summary; never empty curly quotes |
| **Weather = tomorrow** | Slightly richer than Home strip; **not** today’s Open weather |
| **Tasks** expanded (done / left) | No checkboxes; hide when empty |
| **Body / mind** (workout gap + 7-day trends) | Same honesty rules as RB-032 |
| **World headlines** (top 5 + Bills in season) | **Close-only** (Open omits World) |
| **This day in history** | Hide when empty |
| **Backfill / missed close** | Same path ([RB-010](./backfill-missed-evening-journal-close.md)); catch-up flag OK |

### Intentional Close ≠ Open content (do not force parity)

- **No Day Ahead / calendar timetable** on Close (Open looks forward; Close looks back)
- **No morning intention capture** on Close (may **show** morning’s lead as “Today’s lead” post-close if present)
- **World news stays Close-only**
- Weather stays **tomorrow**, not today

## Out of scope / later

- LLM / generative evening essay
- Treat / Save reward moment on evening (stays **Home** celebration card)
- Changing fund buckets, Venmo Total, waiting-reclaim accrual, or Save Goals math
- Reopening morning Open layout (Open is the reference)
- Dismiss / skip / “Not today”
- Interactive task completion inside the edition
- Broad journal UX ([RB-016](./five-year-journal-ux.md), [RB-022](./journal-edit-star-calendar.md)) beyond star/photo already on evening

## Locked — do not change (`PRODUCT_DECISIONS` / `FUND_MODEL`)

| Lock | Detail |
| --- | --- |
| Evening metrics | **Mood + Stress** only (1–10); aligned close always |
| Journal fields | Headline + optional summary; news **never** written into `oneLine` |
| Treat / Save | **Home** reward card only — evening does **not** host Claim / Save for the Future |
| Waiting reclaim | Day-end **or** evening close, first wins; **no double credit**; close is **not** a gate for funds to show |
| Future / Treat split | 30/70 (user `treatSplit`) on Move — unchanged |
| Save Goals | Parallel tracker; evening spend/leftover; **not** Venmo Total; **not** Future/Treat debit |
| Home entry | Open / Close header buttons; muted when done but **reopenable**; **no** dismiss |
| Generation | Rules-based / templated — LLM still Later |

## Dependencies & risks

- **Parent Done:** [RB-032](./daily-briefing-open-close-redesign.md) — twin ritual shipped; this is a **Close chrome iterate** after Open’s edition-box evolution
- **Reference UI:** `/morning` `open-edition` (mast, box, collapsed, paper stories) — reuse classes or extract a shared twin shell
- **Save Goals denseness:** keep Money today as one edition-box / story block; do not balloon Close into a finance worksheet ([RB-037](./save-goals.md))
- **UXUI owns surface;** Reese only if check-in/save API contracts need thin adjustments — fund mutations stay untouched

## Notes

- Intake **2026-09-28** founder ask: evening “close for the day” should match Open’s **Daily Open / edition box** newspaper style that shipped recently.
- **Shipped 2026-09-28:** `/evening` remounted onto `open-edition` (mast, box, collapsed, wait/live paper); CTA **Close the paper**; evening content unchanged. Live on prod.
- Why rank **8 / P0:** elevated morning/evening EA ritual; Close is visibly behind Open after edition-box ship. Sits after framing / todos / mid-flight task IP / Gmail Ready; ahead of Done ritual parents and journal polish so twin parity can ship without reopening RB-027/029/030/032 as active Now slots.
- Effort **M:** shared shell remount + Close content remapped into edition stories — not a CSS-only restyle, not a new ritual.
- Related: [RB-029](./evening-close-recap-news.md) (recap + news parent), [RB-032](./daily-briefing-open-close-redesign.md) (twin redesign Done).
