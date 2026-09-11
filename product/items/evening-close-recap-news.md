# Evening close success: day recap + world news

| Field | Value |
| --- | --- |
| ID | RB-029 |
| Rank | 6 |
| Priority | P0 |
| Status | Ready |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Every time Jeremy closes the day, the success / Remember screen shows a broken **Headline** as empty curly quotes (`"" ""`). Engineering exploration: local `oneLine` clears after refresh because the day leaves `missingEveningDates`, so the success UI re-reads empty; the **real journal headline is saved correctly**. Separately, founder wants that close moment to feel like a **general day recap**, not a thin/broken headline echo — and to surface **3–5 major world news headlines** he should know.

## Outcome

After evening close, Jeremy lands on a clear **day recap** plus a short **world news** strip (3–5 headlines). The empty-quotes Headline bug is gone. Journal Headline / `oneLine` stays **personal prose** ([RB-016](./five-year-journal-ux.md)) — news is never stuffed into the journal field.

## Scope (v1)

1. **Fix empty-quotes bug** on evening success / Remember — stop rendering Headline with empty curly quotes after close or refresh; prefer the **persisted** journal headline, or **hide** the Headline row when empty. Ship **with or immediately adjacent** to the recap work (same PR OK if thin; separate XS fix OK if it unblocks faster).
2. **Day recap** on the close success screen — short general recap of Jeremy’s day. **Rules-based / templated v1** (same posture as [RB-027](./morning-day-start-briefing.md) morning briefing — LLM not required for v1). Thin composition from available signals, e.g. evening mood/scores, morning intention (if captured), calendar highlights, tasks, and the journal headline/summary just entered — eng chooses the minimum readable set.
3. **World news** — **3–5** major headlines Jeremy should know (title + source; optional outbound link). **Fail soft** if the feed is unavailable.
4. Recap + news live on the **success / Remember** surface only. **Do not** overload journal Headline / `oneLine` with news ([RB-016](./five-year-journal-ux.md) constraint).

## Out of scope / later

- LLM / generative evening essay or long-form diary rewrite
- Full news product (topics, personalization, push alerts, in-app reader)
- Changing journal storage model or five-year / edit UX ([RB-016](./five-year-journal-ux.md), [RB-022](./journal-edit-star-calendar.md))
- Morning briefing changes ([RB-027](./morning-day-start-briefing.md) Done)
- Deep intention → evening consumption beyond a thin recap mention (noted as deferred from RB-027; optional if easy)
- Missed-evening backfill integrity ([RB-010](./backfill-missed-evening-journal-close.md))

## Dependencies & risks

- **News source:** eng picks a thin feed; need attribution + fail-soft; no fake headlines.
- **Hard constraint:** do **not** write news into `oneLine` / journal Headline — success UI is a separate composition.
- **Bug root:** success screen state after the day leaves `missingEveningDates` — fix the read path / local clear so refresh does not invent empty quotes.
- **Pairing:** UXUI for Remember/success composition; Reese for persistence/API + any news proxy; keep Venmo/fund close side effects untouched.
- Recap quality will be rough at first — bias to readable defaults over cleverness (ship-and-iterate, like RB-027).

## Notes

- Intake **2026-09-11** founder (Jeremy) + screenshot of Day closed / Remember with broken Headline quotes; eng exploration confirmed save OK / local clear bug; **no existing news feature**; morning has rules-based briefing (RB-027); evening intention wiring was deferred.
- Why rank **6 / P0:** founder-visible **daily-loop** breakage every close + natural **evening counterpart** to shipped morning briefing (RB-027 Done). Placed after framing / todos / task groups / morning; ahead of the journal polish cluster so the close ritual stops looking broken every night.
- Related: [RB-027](./morning-day-start-briefing.md) (morning pair), [RB-016](./five-year-journal-ux.md) (headline stays personal), [RB-010](./backfill-missed-evening-journal-close.md) (evening path integrity — distinct).
