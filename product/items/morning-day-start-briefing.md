# Redesigned morning day-start (check-in + briefing)

| Field | Value |
| --- | --- |
| ID | RB-027 |
| Rank | 5 |
| Priority | P0 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Morning start is an **elevated** personal EA ritual (`PRODUCT_DECISIONS`: morning + evening mood/feeling), but today’s flow still feels like a recovery checklist: sliders, an intention field, and a post-check-in **Today’s Items** interactive list. Jeremy wants to **start the day oriented** — how he slept and feels, then a clear briefing — not re-enter a second task UI he already has on Home.

## Outcome

Jeremy opens morning, taps a fast 1–10 check-in, and lands on a **day-start briefing** that sets him up for the day: quote + written summary from weather, feeling, calendar, tasks, and free time. Snoozed / repeatedly deferred tasks are **suggested into open calendar gaps**. Ship thin, iterate live.

## Scope (v1) — locked 2026-09-10

**Check-in metrics (keep 5; unify scale)**

- Still **five** scores: **sleep hours, sleep quality, mood, energy, stress**
- **Hours slept** moves to **1–10** (same scale as the other four) — drop clock/hours-style sleep entry
- Replace **sliders** with **tap-a-number** on a horizontal **1–10** line
- Keep **“What’s the one thing you want to do well today?”** (intention) — shown on briefing; used at evening close later
- **Drop** the trigger / concern field from morning UI

**Post check-in: day-start briefing (not Items checklist)**

- Main screen after check-in is a **briefing**, not the old interactive Items checklist
- Include a **quote** + a **written day summary** that orients him for the day
- **Suggest** snoozed / repeatedly deferred tasks into **open calendar gaps**
- **No** interactive **Today’s Items** checklist on morning — rely on **Home tasks**

**Briefing content pillars (all for now)**

1. Weather  
2. Feeling (from the morning scores)  
3. Calendar (highlights)  
4. Tasks  
5. Free time  

**Generation model**

- V1 is **templated / rules-based** (not LLM): compose from calendar, tasks, free gaps, weather, and scores
- Generative LLM briefing is an explicit later upgrade

**Delivery**

- **Ship and iterate live** — prefer a clear v1 over boiling the ocean

## Out of scope / later

- LLM / generative briefing copy (upgrade path after rules-based v1)
- Morning interactive checklist (rely on Home tasks)
- Wiring intention into evening close UI (capture is back; close consumption is follow-on)
- Evening ritual redesign (separate; evening still elevated but not this item)
- Broad task/calendar product work owned by RB-014 / RB-026
- Agenda hours past 9PM when events run later — **related / in flight on a separate PR**; do not block this item on that ship, but briefing/calendar gap logic should tolerate late events once that lands

## Dependencies & risks

- **Calendar:** RB-023 Done (iCal + work Google). Late-evening agenda extend is a separate in-flight PR — briefing free-time / gap suggestions should not assume a hard 9PM day end once that ships.
- **Tasks:** Home / Today’s Items + snooze / defer behavior (RB-014, RB-026) — morning suggestions consume that model; morning must not fork a second checklist.
- **Weather:** need a thin weather source for the pillar (eng choose; fail soft if unavailable).
- **UX:** tap-1–10 + briefing is a meaningful morning surface rewrite — coordinate with UXUI; keep evening path untouched unless a thin consistency pass is needed for 1–10 controls.
- Ship-and-iterate means copy templates and gap heuristics will be wrong at first — bias to readable defaults over cleverness.

## Notes

- Intake / lock: **2026-09-10** founder decisions (metrics scale, tap UX, briefing vs checklist, rules-based v1, five pillars, no morning Items UI, ship live).
- **2026-09-10 follow-up:** drop trigger/concern field; restore intention (“one thing to do well”) for evening close; polish briefing layout into labeled sections.
- Why rank **5 / P0:** morning/evening mood ritual is explicitly **elevated** in `PRODUCT_DECISIONS` and the JeremyOS north star; placed after framing (RB-012/013) and task foundation (RB-014/026) so briefing can lean on Home tasks + calendar without blocking rebrand.
- Related (not this ID): extend Home agenda past 9PM when events run later — separate PR / branch; track as dependency note only.
- Supersedes prior morning copy that assumed post-check-in Today’s Rebuild / Items checklist as the primary morning destination.
