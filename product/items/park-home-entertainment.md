# Park Home Entertainment section

| Field | Value |
| --- | --- |
| ID | RB-025 |
| Rank | 22 |
| Priority | P2 |
| Status | Backlog |
| Effort | XS |
| Target due | TBD |
| Milestone | later |
| Owner | Product |

## Problem

**Today’s Entertainment** / **On Air** is a prominent Home surface (`TodaysEntertainmentCard`; layouts treat Move + Entertainment as twin pillars). Founder asked to **drop Entertainment into the back**, then locked that the **5×5 daily mini crossword** ([RB-024](./daily-puzzle-on-home.md)) **replaces that Home slot** — not sit beside it.

## Outcome

Entertainment is **off the primary Home hero**: the On Air / Today’s Entertainment block is **replaced by the daily crossword** when RB-024 ships. Podcast / On air content is **hidden from Home** (locked with RB-024). No Entertainment polish expansion. Podcast integrity can still finish thin under [RB-005](./recovery-content-offers.md) **off Home**.

## Scope (v1)

- Product decision: Entertainment Home section → **parked / replaced** (not a peer of the crossword)
- When RB-024 ships: remove or repurpose `TodaysEntertainmentCard` / `entertainment` layout block as the **crossword slot**; do **not** leave a podcast On air peer on Home
- Residual Later work (this item): any leftover layout presets, copy, or dead Entertainment chrome after the swap — thin cleanup only
- Do not schedule Entertainment UX polish ahead of higher-rank personal-OS items
- Cross-link: primary Home cognitive surface is [RB-024](./daily-puzzle-on-home.md)

## Out of scope / later

- Deleting podcast data, heard tracking, or RB-005 no-repeat work already In Progress
- Building a new media / Watch-Listen hub
- Casino, games arcade, or “delight feed” expansion
- Restoring podcast On air on Home (locked hide — see RB-024)

## Dependencies & risks

- Shipped `TodaysEntertainmentCard` + `home-layouts` entertainment blocks — RB-024 owns the slot swap; this item tracks park / residual demotion
- RB-005 remains In Progress for podcast no-repeat; keep that thin and separate from Home Entertainment prominence

## Notes

- Intake **2026-09-03** founder: demote Entertainment; add simple daily puzzle on Home instead (RB-024).
- Follow-up **2026-09-04:** crossword **replaces** On Air / Today’s Entertainment Home section — not demote-beside. RB-024 owns the replacement; this item stays Later for residual park/cleanup.
- Follow-up **2026-09-04 (lock):** podcasts **hidden from Home**; Entertainment slot fully given to crossword.
- No prior dedicated Entertainment backlog item — this captures the park decision for a **shipped** Home section.
- Rank **22** (last open item before Done / Won't Do). Milestone **later**.
