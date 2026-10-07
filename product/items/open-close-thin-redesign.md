# Open / Close thin redesign

| Field | Value |
| --- | --- |
| ID | RB-042 |
| Rank | 8 |
| Priority | P0 |
| Status | Ready |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: UXUI + Reese) |

## Problem

Open and Close grew into heavy **edition paper** rituals ([RB-032](./daily-briefing-open-close-redesign.md) Done; [RB-038](./close-edition-open-parity.md) Done chrome). Founder wants a **thin** start/end: journal + one day rating at Close; sleep quality gate + focus + lean briefing at Open. Evening **Mood + Stress** (1–10) and multi-scale morning check-in no longer match what Jeremy will use.

## Outcome

**Close** is journal-first with a single 1–5 day rating (no Mood/Stress; no paper body). **Open** gates Home until today’s sleep quality is in; then a lean Home-bound briefing (history + weather phrases + calendar/tasks prose). Ritual stays mandatory (no dismiss/skip); fund / Treat-Save / reclaim locks unchanged.

## Scope (v1) — locked 2026-10-07

### Close (`/evening`)

| Keep | Drop |
| --- | --- |
| Journal **headline** + short **summary** | **Mood** and **Stress** entirely |
| **Star** + **photo** (existing surfaces) | Paper body: weather, news, tasks, body/mind, this-day-in-history, trends, edition wait chrome as needed |
| Single **day rating 1–5** (new) | Multi-scale evening check-in |
| Move to Rebuild / fund path as today | Save Ledger on Close (already removed — RB-037) |
| Aligned close always; backfill RB-010; Ignore RB-039 | |

### Open (`/morning` → Home)

| Rule | Detail |
| --- | --- |
| **Gate Home** | Until **sleep quality 1–5** is submitted for **today** — then Home |
| **Fields** | Sleep quality **1–5** + focus line labeled **“One thing I will focus on today”** (replaces intention / do-well) |
| **Show** | **This-day-in-history** journal (prior years; **hide if empty**); **today weather** with morning/afternoon/evening **derived phrases**; **real-language calendar + tasks prose** (rules-based OK; generative AI optional later) |
| **Strip** | Workout, world news, multi-scales (mood/energy/stress/sleep-hours UI), “Into the day”, edition paper wait chrome as needed |

### API / persistence notes (eng)

| Surface | Today | v1 target |
| --- | --- | --- |
| Evening rating | `EveningCheckIn.mood` + `stress` (1–10) | Single **`dayRating` 1–5** — **not** mood; drop stress from UI and new writes |
| Morning scales | `sleepQuality` + `mood` / `energy` / `stress` (+ `sleepHours`) on 1–10 taps | **`sleepQuality` 1–5 only** for the gate; stop collecting mood/energy/stress/hours on Open |
| Focus line | `MorningCheckIn.intention` | Same field OK; **UI label** = “One thing I will focus on today” (copy lock) |
| Legacy rows | Old mood/stress 1–10, multi-scale mornings | Read soft for history/analytics elsewhere; **do not** require backfill; new closes write `dayRating` |

Exact schema shape (`dayRating` on `EveningCheckIn` vs rename) is eng’s call — product lock is **one 1–5 day rating, not mood/stress**.

## Out of scope / later

- LLM / generative calendar·tasks prose (optional after rules-based v1)
- Re-adding Mood/Stress or multi-scale Open check-in
- Rebuilding rich Open/Close paper twin ([RB-032](./daily-briefing-open-close-redesign.md) content scope **superseded**)
- Fund / Venmo / Treat-Save / waiting-reclaim changes
- Dismiss / skip Open or Close
- Broad journal UX beyond star/photo already on evening ([RB-016](./five-year-journal-ux.md), [RB-022](./journal-edit-star-calendar.md))

## Dependencies & risks

- **Supersedes** PRODUCT_DECISIONS locks for evening Mood+Stress (1–10) and “keep/elevate mood ritual” as multi-metric — ritual **kept**, metrics **thinned** (see Notes)
- Parents Done: [RB-027](./morning-day-start-briefing.md), [RB-029](./evening-close-recap-news.md), [RB-030](./morning-briefing-conversational.md), [RB-032](./daily-briefing-open-close-redesign.md), [RB-038](./close-edition-open-parity.md) — do not reopen as active Now slots; this item owns the thin redesign
- Home gate must not soft-lock forever if Open submit fails — clear error + retry
- Weather phrases need honest failure when feed missing
- Calendar + tasks prose depends on existing agenda/todo data ([RB-023](./calendar-ical-google.md) Done, [RB-014](./todo-lists.md) / [RB-026](./task-groups-calendar-md-labels.md))

## Notes

- Intake / lock: **2026-10-07** founder thin Open/Close redesign.
- **Rank 8 / P0 / Ready / Effort M** — Now queue after Gmail Ready; active ritual work (chrome parity RB-038 Done; content thin-down is this item).
- Supersedes RB-038 “keep Mood+Stress + paper sections” content lock; RB-038 visual parity history stands as Done, not the target content set.
- Supersedes RB-032 rich twin briefing body as the *active* Open/Close scope.
- PRODUCT_DECISIONS Daily + weekly loop Morning/Evening rows updated same day.
