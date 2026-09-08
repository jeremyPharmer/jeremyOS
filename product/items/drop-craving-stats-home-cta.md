# Drop craving stats + Home craving CTA

| Field | Value |
| --- | --- |
| ID | RB-020 |
| Rank | 24 |
| Priority | P0 |
| Status | Done |
| Effort | XS |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product (ship: UXUI) |

## Problem

Home and Journey still surface craving **stats / analytics** and a Home entry point like **“I’m having a craving”** (craving timer / intervention). The founder does not want those. He wants to keep the **morning + evening mood / feeling** ritual that starts and ends the day, and keep the **Journey** nav label — not craving dashboards or a Home craving CTA.

## Outcome

Craving-related stats panels and the Home craving CTA are gone. Daily mood/stress/feelings (morning start + evening close) stay and are framed as a personal EA ritual. Journey remains the nav label. No expansion of other recovery polish under this item.

## Scope (v1)

Thin UXUI cut only:

- Remove Home **“I’m having a craving”** (or equivalent craving-timer / intervention) entry point
- Remove craving **stats / analytics** surfaces (Journey/Home charts, craving pattern panels, craving-points / playbook-style analytics already shown or implied)
- Do **not** remove morning/evening mood, stress, or feelings capture
- Do **not** rename Journey (locked keep — see [RB-012](./rebrand-jeremyos.md))

## Out of scope / later

- Broader recovery-loop redesign, support-target polish, content catalog work
- Deleting craving capture APIs/data wholesale unless needed for a clean UI (prefer hide/remove surfaces first)
- Rebuilding craving insights later — craving analytics are **Won't Do** under [RB-009](./recovery-patterns-insights.md) unless Jeremy re-asks
- Five-year journal (RB-016), todos (RB-014), or other EA surfaces

## Dependencies & risks

- UXUI owns the thin Home + Journey surface pass; coordinate with Reese only if removing UI leaves broken empty states or dead API calls that must be stubbed
- Do not conflate with RB-012 trail-copy retirement — this is a **feature cut**, not metaphor
- Related north-star filter: [RB-013](./personal-os-north-star.md)

## Notes

- Intake **2026-08-29** founder follow-up (typos interpreted): keep Journey naked/label; love daily mood/feeling start+end; drop craving stats; drop Home “I’m having a craving.”
- Originally tracked as **RB-017** on the EA/trail branch; **remapped to RB-020** on merge with `main` because `main` had already assigned RB-017–019 to cameras / workout / recipes.
- Effort **XS** — remove CTA + craving stats surfaces only; no other recovery polish.
- **Done 2026-08-29:** Home craving CTA removed; Journey playbook / headwind / trail craving blocks / rhythm craving contrast removed; Settings craving interventions UI removed. APIs + stored craving data kept (hide surfaces first).
- Rank **19** / **Done** — terminal after open work; cameras keep RB-017.
