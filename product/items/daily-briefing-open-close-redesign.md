# Daily briefing: Open / Close redesign

| Field | Value |
| --- | --- |
| ID | RB-032 |
| Rank | 5 |
| Priority | P0 |
| Status | Ready |
| Effort | L |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Open (`/morning`) and Close (`/evening`) shipped as separate rituals ([RB-027](./morning-day-start-briefing.md), [RB-029](./evening-close-recap-news.md), [RB-030](./morning-briefing-conversational.md)) but do not feel like matching **Daily briefing** twins. Entry points still live under Tasks Home; evening mood UI does not match morning tap chips; briefing bodies are thinner than Jeremy wants (weather, this-day-in-history, news, expanded tasks, workout gaps, sleep/mood trends).

## Outcome

Open and Close are **matching Daily briefing rituals**: same shell and check-in-first flow, launched from **Home header** Open / Close buttons (grey out when done — never dismiss/skip). Morning and evening briefings are rich, scrollable newsletters with the locked content modules below — rules-based, not LLM.

## Scope (v1) — locked 2026-09-12 (full ship, not phased)

### 1. Home header entry (not Tasks)

- Single **Open** and **Close** buttons beside the greeting on Home
- When that ritual is done for the day: **grey out + inactive** (do **not** hide)
- Remove Open / Close from the Tasks Home group
- **No “Not today” / dismiss** for open or close — cannot skip

### 2. Shared Daily briefing shell

- Shared look/feel across Open (`/morning`) and Close (`/evening`)
- Framing: **Daily briefing**
- Flow: **check-in FIRST**, then newsletter body
- Unify mood / scale UI: evening uses **tap chips** like morning (same patterns)

### 3. Open briefing (after check-in)

- **Expanded weather** — today + context
- **This day in history** (journal) — show **ALL** past entries for this month-day across years; cleaner, more telling presentation (not sparse)
- **Top 5 headlines**, no duplicates; if today is in the **Bills season window** (Aug 1 through March 1 inclusive, spanning year boundary), always include **1 recent Buffalo Bills** story (as one of the 5 or replace)
- **Tasks with expanded details** (titles etc.) — **no** lumping by category counts only; **no** checkboxes in the briefing
- **Workout** — both longest gap since any workout **and** which type (run / hiit / lift / stretch) hasn’t been done in a while
- **Sleep / mood trends** — last 7 days insights

### 4. Close briefing twin

- Same shell + check-in first (mood / stress tap scales + journal)
- **Weather = tomorrow only**, slightly more detailed than the home strip
- Same news rules (top 5 + Bills in season)
- Same this-day-in-history
- Tasks expanded (done / left details, **no** checkboxes)
- Same body/mind block (workout gaps + 7-day trends)

### 5. Layout

- Scrollable full content is OK — prefer meaningful content over cramming above the fold

## Out of scope / later

- LLM / generative briefing (still later; after this rules-based twin ship)
- Interactive task completion inside the briefing
- Dismiss / skip / “Not today” for Open or Close
- Broad task-product work beyond removing Open/Close from Tasks Home ([RB-014](./todo-lists.md), [RB-026](./task-groups-calendar-md-labels.md))

## Dependencies & risks

- **Parents (Done):** [RB-027](./morning-day-start-briefing.md), [RB-029](./evening-close-recap-news.md), [RB-030](./morning-briefing-conversational.md) — this item **iterates** those rituals; do not reopen them as separate active Now slots
- **Journal history:** this-day-in-history density depends on journal data quality ([RB-016](./five-year-journal-ux.md), [RB-010](./backfill-missed-evening-journal-close.md)); presentation must stay readable when years are sparse or dense
- **News + Bills rule:** need a thin feed with dedupe + seasonal Bills injection; fail soft if feed unavailable; never invent headlines
- **Workout signals:** may lean on existing workout log ([RB-018](./workout-tracker.md)) or whatever is already persisted — eng confirms source; gaps/types must be honest when data is thin
- **Home chrome:** Open/Close beside greeting must not fight other Home CTAs; grey-out state must stay clear without looking broken
- **Effort L:** shared shell + Home move + dual rich briefings + news/history/trends/workout modules in one full ship (founder: not phased)

## Notes

- Intake / lock: **2026-09-12** founder-approved Daily briefing redesign of Open/Close.
- Why rank **5 / P0:** founder-locked daily-loop twin; sits after framing / todos / task groups (**RB-012–014**, **RB-026**); ahead of journal polish cluster so Open/Close stop living under Tasks and feel like one ritual. Done parents **RB-027 / RB-029 / RB-030** renumbered below this active iterate.
- Effort **L:** full ship across Home header, shared shell, Open + Close content parity — not a thin copy pass.
- Related Later: LLM generative morning/evening briefing still deferred until after this rules-based twin.
