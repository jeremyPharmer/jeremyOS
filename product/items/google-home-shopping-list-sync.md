# Google Home shopping-list sync

| Field | Value |
| --- | --- |
| ID | RB-045 |
| Rank | 41 |
| Priority | P2 |
| Status | Backlog |
| Effort | TBD |
| Target due | TBD |
| Milestone | later |
| Owner | Product |

## Problem

Jeremy already says **“Hey Google, add X to the shopping list.”** He wants those voice adds to show up on the JeremyOS grocery list ([RB-044](./grocery-list.md)) without typing on Home. RB-044 ships the thin Home card first; this item covers the eventual smart-home bridge.

## Outcome

Items spoken into Google’s native shopping list appear on JeremyOS grocery (Home card) with low friction — preferably by **import/sync from Google**, not by replacing Assistant’s list.

## Scope (v1)

Prefer **Google → JeremyOS** one-way (or one-way-primary) sync. Do **not** try to make JeremyOS the Assistant shopping-list backend in v1.

- Keep using Google Assistant / Home for voice: “add … to the shopping list”
- Periodically (poll) or on event (webhook, if available) pull new items from Google’s shopping list into JeremyOS `groceryItems`
- Dedupe / idempotent import (same text + recent window → don’t double-add)
- Map imported open items onto the existing RB-044 Home grocery card (same check-off → remove behavior)
- Auth: reuse or extend Google account linking patterns where practical ([RB-023](./calendar-ical-google.md) calendar OAuth; [RB-002](./email-integration.md) Gmail) — spike which scopes/APIs actually expose shopping list
- Settings: connect/disconnect Google shopping sync; last-sync status is enough for v1

### Explicit non-goals for v1

- Replacing Google’s shopping list as the Assistant target
- Bidirectional sync (JeremyOS check-off clearing Google, or JeremyOS adds pushing to Google)
- Custom Actions / Dialogflow “talk to JeremyOS” voice skill as the primary path
- Household shared lists, aisle sorting, or multi-store routing

## Out of scope / later

- **Phase 2:** JeremyOS → Google push (add from Home also lands on Google list)
- **Phase 2:** Bidirectional check-off / delete reconciliation
- True “Assistant Actions” custom skill if Google shopping-list APIs stay closed
- Alexa / Siri / other assistants
- Recipe → grocery auto-add ([RB-019](./favorite-recipes.md))

## Dependencies & risks

- **API feasibility is the main risk.** Google does not cleanly document a first-party “Shopping List API” for third-party apps the way Calendar/Gmail do. Options to spike (order TBD by eng):
  1. **Keep Tasks / Shopping List surfaces** (if still readable via Tasks API or related Google APIs — historically fragile / may be unavailable)
  2. **Google Home / Nest / Assistant developer surfaces** — often not suitable for “append to shopping list” as an external sync source
  3. **Unofficial / scrape / Keep** — reject for product quality and ToS risk unless founder explicitly accepts research-only
- If no supported read path exists, v1 may become **Won't Do** or pivot to a worse UX (e.g. custom Assistant action that POSTs to JeremyOS) — capture that decision after spike; do not schedule build ahead of spike
- Depends on **RB-044** Home grocery list shipped (persistence + UI already there)
- OAuth / consent complexity may overlap RB-002 / RB-023 Google linking — avoid a third parallel Google login if one account can hold scopes
- Poll latency vs “said it in the kitchen, see it on phone” expectation — set founder expectation (minutes OK for v1)

## Notes

- Intake **2026-10-19**: founder follow-up on RB-044 — wants Google Home / Assistant voice adds on JeremyOS grocery. Product choice: **separate Later item** so RB-044 rank/status stay honest (mid-flight Home card stays P1 / In Progress).
- Rank **41** / **P2** / milestone **later** — not competing with mid-flight P0s or RB-044 ship.
- Effort **TBD** until API spike; planning placeholder **L** if a supported read API exists, else reassess (may be XL or Won't Do).
- Linked from [RB-044](./grocery-list.md) out-of-scope / later.
