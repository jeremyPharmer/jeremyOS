# Home cameras via Reolink

| Field | Value |
| --- | --- |
| ID | RB-017 |
| Rank | 11 |
| Priority | P1 |
| Status | Backlog |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants **access to his home cameras** inside JeremyOS. Cameras are reachable via **Reolink**. There is no personal-OS surface for live/recent views yet, and API path (cloud vs local NVR) is unexplored.

## Outcome

Jeremy can open home-camera views from JeremyOS (thin v1: browse / open feeds he cares about). Reolink integration path is chosen after a short API spike — product keeps the item on the roadmap; engineering may hand off.

## Scope (v1)

- **Spike:** explore Reolink APIs (cloud API vs local/NVR/ONVIF-style access) and document what is feasible without bloat
- Thin JeremyOS surface: list cameras Jeremy owns + open live or recent view (deep-link or embedded — decide after spike)
- Keep on roadmap at founder ~priority **5** among personal tools (rank **7** after framing + todos / journal / email / podcast)
- **Engineer handoff OK** after spike notes land — product owns priority, not the full implementation

## Out of scope / later

- Multi-brand camera hubs or generic smart-home platform
- Recording archive / NVR management UI
- Sharing cameras with other users
- Mobile push for motion unless Jeremy asks later

## Dependencies & risks

- Reolink cloud vs local NVR auth models differ; credentials and network assumptions TBD
- May need another engineer for camera/streaming plumbing after product spike
- Privacy: home cameras are sensitive — local-first if cloud ToS or tokens are painful

## Notes

- Intake **2026-08-29** founder follow-up: “access to my home cameras… accessible via Reolink so explore those APIs, refer them to another engineer if needed… like **5** on the list.”
- Placed at rank **7** (5–8 band): after Now personal stack (todos, five-year journal, email/Gmail, podcast) — counts as ~5th personal tool on the list.
- Nearby personal OS tools: [RB-018](./workout-tracker.md), [RB-019](./favorite-recipes.md).
- Open: Reolink **cloud API** vs **local NVR** / LAN — spike must answer before build.
