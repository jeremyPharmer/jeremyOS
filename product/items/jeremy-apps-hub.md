# Hub: Jeremy’s other apps & sites

| Field | Value |
| --- | --- |
| ID | RB-015 |
| Rank | 14 |
| Priority | P1 |
| Status | Backlog |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy creates other apps and sites. JeremyOS should connect to **his** ecosystem — not only live as an isolated recovery app. There is no first-class hub or link surface for those properties.

## Outcome

A thin **hub** in JeremyOS lists and opens Jeremy’s other apps/sites (links + short labels). Feels like a personal OS home base, not a third-party integration marketplace.

## Scope (v1)

- Curated list of Jeremy’s apps/sites (config or simple admin-editable entries)
- Deep link / open in browser; optional short description
- Placement: Settings or a small Home “My stuff” block — one job, not a dashboard of widgets
- Seed with whatever Jeremy names first (open question at build)

## Out of scope / later

- OAuth / data sync with each app
- Bidirectional APIs, shared auth SSO across all properties
- Public developer platform or third-party app store
- Auto-discovery of Jeremy’s repos

## Dependencies & risks

- Needs Jeremy to name **which** apps/sites to connect first (blocked on that list for content, not for shipping an empty shell)
- Rebrand (RB-012) should land so the hub reads as JeremyOS, not ReBuild cross-promo
- Avoid cards-for-cards clutter — simple list is enough

## Notes

- Intake **2026-08-29** founder: wants connections to other apps or sites he creates.
- Effort **S** for link hub v1; any real data integration = separate items per app after he picks priorities.
- Rank **7** at intake; **2026-08-29** → rank **10** when RB-017/018/019 (cameras, workout, recipes) entered the personal-tools cluster ahead of hub.
