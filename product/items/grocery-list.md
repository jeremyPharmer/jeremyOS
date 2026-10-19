# Grocery list (Home card)

| Field | Value |
| --- | --- |
| ID | RB-044 |
| Rank | 20 |
| Priority | P1 |
| Status | In Progress |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants a **simple grocery list** on Home — same interaction pattern as the task list (starts collapsed, expand to add/check items) — without waiting on voice or smart-home integrations.

## Outcome

Home shows a **collapsed grocery list card directly under Save Goals**. Jeremy can expand it, add items, check them off, and remove them; the list persists across sessions in `db.json`.

## Scope (v1)

Thin Home utility — mirror task-list interaction, not a shopping OS.

- **Placement:** Home card **immediately under the Save Goals card**
- **Collapse:** Starts **collapsed** (same pattern as the task list); expand to work the list
- **Items:** Add free-text grocery items
- **Check-off:** Tap the row/check → strike/fade (task-list clear) → **remove** (not retained)
- No separate Remove control — check-off is the only clear path
- **Persistence:** Store in `.data/db.json` (same persistence model as other Home lists)
- **UX:** Lean; reuse existing Home / task-list affordances where practical — no separate grocery page required in v1

## Out of scope / later

- **Google Home** / voice assistants / smart-speaker sync
- Recipe → grocery auto-add ([RB-019](./favorite-recipes.md) favorites are separate)
- Shared household lists, categories/aisles, stores, prices, or receipt OCR
- Push notifications or shopping-trip mode
- Merging grocery items into the task list / Today’s Items ([RB-014](./todo-lists.md)) — keep a distinct Home card

## Dependencies & risks

- Home density: keep the card as thin as the task-list collapse pattern so it does not fight Save Goals / agenda / puzzle
- UXUI owns Home card; Reese owns `db.json` shape + API if needed
- Distinct from Save Goals ([RB-037](./save-goals.md) / [RB-041](./save-goals-reserve-hub.md)) — placement only; no fund ledger hooks
- Google Home integration is explicitly **later** — do not block v1 on OAuth or device APIs

## Notes

- Intake **2026-10-18**: founder wants a grocery list that resembles the task list (collapsed + add items), placed under Save Goals on Home; Google Home integration eventual but out of v1.
- Status **In Progress** — eng implementing thin Home card + `groceryItems` persistence (RB-044).
- **2026-10-18 polish:** Check-off matches tasks — click, fade, remove; do **not** retain checked rows.
- **2026-10-19:** Dropped Remove button (touch was revealing it as a second step); whole row tap clears.
- Rank **20** among Near-term / Home surface work.
