# Personal OS north star (cut bloat)

| Field | Value |
| --- | --- |
| ID | RB-013 |
| Rank | 2 |
| Priority | P0 |
| Status | Ready |
| Effort | S |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Roadmap energy has been spent making a **generic** recovery + incentives product “lovable for daily use” — more features, deeper catalogs, polish loops, plus a **trail** metaphor that sells hiking/recovery narrative. The founder does not want that. JeremyOS should feel like an **executive assistant / personal OS for Jeremy** — **all about Jeremy and things he wants** — not a product we invent features (or trail themes) into.

## Outcome

Every open backlog item is judged against: **Will Jeremy actually use this?** Feature-for-feature’s-sake work is cut, paused, or parked Later. Recovery/fund pieces remain only as **personal tools** he still uses — secondary to the EA / personal-OS focus, not killed without evidence. Trail metaphor is retired via [RB-012](./rebrand-jeremyos.md) (rebrand, not rewrite).

## Scope (v1)

- Document north star in `ROADMAP.md` + `PRODUCT_DECISIONS.md` as **executive assistant + personal OS for Jeremy**
- Re-rank backlog: elevate email, podcasts, to-dos, hub to Jeremy’s other apps; demote generic daily-loop / recovery-catalog polish
- Add a short “build filter” to ranking principles: personal use > generic product completeness
- Align with RB-012: rebrand/reframe over greenfield; trail copy is framing debt, not a rewrite trigger
- Leave fund model locked and documented; demote money-rail expansion unless Jeremy still needs it soon

## Out of scope / later

- Deleting historical item files or rewriting past decisions
- A full kill of recovery/fund without founder confirmation
- Building new “delight” features that fail the personal-use filter
- Greenfield rewrite “to match the new identity”

## Build filter (locked default)

Ship only if **at least one** is true:

1. Jeremy said he wants / loves it (e.g. to-dos, Gmail, podcasts, cameras, workout, recipes, links to his other apps)
2. It keeps an existing personal tool honest (e.g. fund ledger accuracy) without expanding scope
3. It is required plumbing for (1) or (2)

Otherwise: **Later** or **Won't Do**, with a note — do not invent justification.

## Dependencies & risks

- Teams may still have In Progress work on demoted items — finish thin slices already mid-flight if cheaper than aborting; do not expand
- Partial answer (2026-08-29): Jeremy **loves** morning/evening mood & feeling; wants craving **stats** and Home craving CTA **gone** ([RB-020](./drop-craving-stats-home-cta.md), [RB-009](./recovery-patterns-insights.md) Won't Do). Fund rails (RB-001 / RB-006) still demoted pending further ask.

## Notes

- Intake **2026-08-29** with JeremyOS rebrand. Founder: stop trying to create a generic product to love daily; don’t add features for the sake of adding them.
- Follow-up **2026-08-29**: drop trail theming; EA framing — product recommendation is **rebrand, not start over** (see RB-012).
- Follow-up **2026-08-29**: elevate daily mood/feeling start+end as personal EA ritual; drop craving analytics; remove Home “I’m having a craving” (RB-020). Journey label kept (RB-012).
- Effort **S** = product/docs + ranking pass (this pivot). Ongoing enforcement is process, not a megaproject.
- Companion items: [RB-012](./rebrand-jeremyos.md), [RB-014](./todo-lists.md), [RB-016](./five-year-journal-ux.md), [RB-015](./jeremy-apps-hub.md), elevated [RB-002](./email-integration.md) / [RB-005](./recovery-content-offers.md); personal tools [RB-017](./home-cameras-reolink.md), [RB-018](./workout-tracker.md), [RB-019](./favorite-recipes.md); craving cut [RB-020](./drop-craving-stats-home-cta.md); calendar ICS [RB-023](./calendar-ical-google.md); daily puzzle [RB-024](./daily-puzzle-on-home.md); Entertainment park [RB-025](./park-home-entertainment.md).
- **2026-08-29 follow-up:** cameras / workout / recipes added — still passes build filter (Jeremy asked).
- **2026-09-01:** founder asked to tie in iCal + work Google Calendar → [RB-023](./calendar-ical-google.md) (passes build filter).
- **2026-09-03:** founder asked for a simple daily brain game/puzzle on Home → [RB-024](./daily-puzzle-on-home.md); demote Home Entertainment → [RB-025](./park-home-entertainment.md).
- **2026-09-04:** RB-024 preferred v1 → **Mini Crossword** (chip-through-the-day); effort **M**.
- **2026-09-04 (later):** lock **5×5**; crossword **replaces On Air / Today’s Entertainment** Home slot; progress banner + start semantics open questions on RB-024.
- **2026-09-04 (share #1):** RB-024 locks Start button; banner **`completed/attempts · today%`** (later superseded); podcasts hide from Home.
- **2026-09-07:** RB-024 banner `%` relocked to **lifetime success rate** (`completed/attempts`), not today’s fill — founder: `2/3` → ~67%, not 100% fill.
