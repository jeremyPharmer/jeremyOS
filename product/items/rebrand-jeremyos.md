# Rebrand to JeremyOS (executive assistant)

| Field | Value |
| --- | --- |
| ID | RB-012 |
| Rank | 1 |
| Priority | P0 |
| Status | Done |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

The product is still framed and named as **ReBuild** — a generic recovery app with incentives, plus a **hiking/recovery trail** metaphor (Trailhead, trail markers, “set out on the trail”, Journey trail days, climb language). The founder wants **JeremyOS**: an **executive assistant / personal OS for Jeremy**, not a recovery-trail product. Greenfield rewrite is tempting but would throw away working personal tools for little EA upside.

## Product recommendation (locked 2026-08-29)

**Prefer rebrand / reframing over greenfield rewrite.**

| Reason | Detail |
| --- | --- |
| Keepers | Journal, fund ledger honesty, auth, APIs, and data already work under an EA framing |
| Trail is shallow | Mostly copy + IA + metaphor — not a reason to delete the codebase |
| Start-over cost | High cost, little EA upside vs a coherent rename + copy + nav pass |
| Scope discipline | Thin “retire trail metaphor” carve-out only; do **not** invent a full new stack |

## Outcome

Product docs, user-facing naming, chrome, and copy consistently present **JeremyOS** as Jeremy’s **executive assistant / personal operating system**. Trail metaphor is gone. Recovery/fund remain optional personal tools **without** trail language. Historical IDs stay `RB-*`.

## Scope (v1)

- Lock product name **JeremyOS** + framing **executive assistant / personal OS for Jeremy** in roadmap, backlog, and decision docs (this item)
- **Drop trail metaphor** across chrome/copy/IA: Trailhead, trail markers, “set out on the trail”, Journey trail-day language, climb / re-climb marketing copy, and similar hiking framing
- Product framing copy: EA / personal OS / things Jeremy wants; drop “generic recovery product to love daily” and trail narrative as north star
- Inventory surfaces that still say ReBuild or trail language (app chrome, onboarding, emails, nav labels) and ship a thin rename/copy pass where low-risk
- Keep recovery/fund as optional personal tools; strip trail language only — do not kill features solely for metaphor
- Keep historical IDs (`RB-*`) and repo/path history; do not rewrite git history

## Out of scope / later

- Greenfield rewrite or new tech stack “because of branding”
- Full marketing site / public launch under JeremyOS
- Renaming Fly apps, domains, or package names if that risks deploy breakage (track as follow-on if needed)
- Killing recovery/fund features solely because of the name/metaphor change (see RB-013 + fund model)
- Deep IA redesign beyond thin chrome/nav/copy needed for EA + no-trail coherence

## Dependencies & risks

- UXUI owns user-visible string/chrome/IA label changes after product framing lands
- Avoid half-renames (docs say JeremyOS EA, UI still screams ReBuild trail) — prefer one coherent pass for high-traffic chrome
- Effort **M** already covers rename + framing + trail-copy/IA drop; if inventory reveals far more surfaces than expected, note spillover — do **not** auto-promote to L/XL mega-project
- Open: legal / display variants (“Jeremy OS” vs “JeremyOS”) — default **JeremyOS**
- **Was locked (2026-08-29):** keep **Journey** as the nav label — **superseded 2026-10-10** by [RB-043](./health-tab-sleep-primary.md): nav/tab label → **Health** (route may stay `/journey`)

## Notes

- Intake **2026-08-29** from founder: first lean “Jeremy PS” → corrected to **JeremyOS**.
- Follow-up **2026-08-29**: drop trailer/trail theming; product is an executive assistant — **rebrand, not start over** (interpretation: “trailer” = trail hiking metaphor unless contradicted).
- Follow-up **2026-08-29**: founder confirmed keep **Journey** nav label; elevate morning/evening mood loop; craving stats + Home craving CTA cut via [RB-020](./drop-craving-stats-home-cta.md).
- **2026-10-10:** Journey nav label keep **superseded** — rename to **Health** ([RB-043](./health-tab-sleep-primary.md)); craving-cut item RB-020 stays Done.
- Rank **1** / **P0** — naming, EA framing, and trail retirement must lead before feature work is re-sold as ReBuild/trail polish.
- Related: [RB-013 Personal OS north star](./personal-os-north-star.md).
