# Bills panel on Home

| Field | Value |
| --- | --- |
| ID | RB-034 |
| Rank | 20 |
| Priority | P1 |
| Status | Backlog |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants a **Buffalo Bills** (NFL) glance on Home — schedule first, plus record and a bit of stats — without turning JeremyOS into a generic sports app or rebuilding Entertainment.

## Outcome

Home ends with a **clean, lean card** showing Bills **schedule** (primary), **wins/losses**, and a small set of **stats**, so Jeremy can check the team without leaving JeremyOS.

## Scope (v1) — draft pending founder answers

Working intake from founder (2026-09-13): *“Bills panel - on the homepage, [a lean / Alena?] clean looking card at the very bottom of the [Home]. Schedule, as it is, [no?] fancy stats, wins losses and schedule is all.”* (Initially misheard as Chicago Bulls; corrected to **Buffalo Bills** / NFL — see Notes.)

### Tentative v1 (defaults until answers land)

| Decision | Tentative default |
| --- | --- |
| Team | **Buffalo Bills** (NFL) only |
| Placement | **Very bottom** of Home (below existing Home stack) |
| Visual | **Lean / clean card** — one composition, not a dashboard of chips |
| Primary content | **Schedule as-is** (upcoming / recent games — exact window TBD) |
| Record | Season **W–L** (and optionally home/away, division, or last-N — TBD) |
| Stats | **Light** “fancy” glance (e.g. AFC East place, point differential, streak) — **schedule wins**; not a full analytics suite |
| Seasonality | Align with briefing news **Bills season window: Aug 1 – Mar 1** inclusive (year-boundary span; same rule as [RB-032](./daily-briefing-open-close-redesign.md) / `isBillsSeason`) — full panel in-season; quiet off-season UX (exact behavior TBD in open questions) |
| Interactivity | Read-only glance; optional tap-out to official schedule (TBD) |

### Must clarify before Ready

See **Open questions** below — founder explicitly asked to be asked. Do not start eng until Q1–Q7 are answered (or explicitly deferred).

## Out of scope / later

- Multi-team / fantasy / betting / live score push spam
- Full ESPN-style box scores, play-by-play, or video
- Rebuilding Home Entertainment / On Air (that slot is crossword — [RB-024](./daily-puzzle-on-home.md); park [RB-025](./park-home-entertainment.md))
- Other Buffalo / NFL teams unless founder asks — separate items
- Treat/fund hooks or recovery framing around games
- Duplicating briefing “Bills headline in season” ([RB-032](./daily-briefing-open-close-redesign.md)) — panel is schedule/record/stats, not news

## Dependencies & risks

- **Data source:** official NFL / third-party API vs scrape vs manual/static — licensing, rate limits, and reliability
- **Seasonality:** reuse **Aug 1 – Mar 1** Bills window for show/hide or empty-state policy; off-season must not look broken (draft, free agency, “next kickoff”)
- **Home density:** bottom card must stay lean so it does not fight Daily Puzzle / tasks / agenda
- UXUI owns card polish; Reese owns fetch + cache contract if live data
- Distinct from calendar agenda ([RB-023](./calendar-ical-google.md)) — sports schedule is not personal calendar unless founder wants merge (default: **no**)
- Distinct from Open/Close news Bills injection — share season helper if useful; do not conflate product surfaces

## Open questions (ask Jeremy)

1. **“Alena”** — Did you mean **a lean** (minimal) card, or is **Alena** a person/style reference we should match?
2. **Schedule window** — What should “schedule as-is” show: next game only, next N games, this week, or a short past + upcoming strip?
3. **Live vs static** — Live scores / in-progress games on Home, or schedule + final results only (refresh on load / periodic)?
4. **Which stats** — Beyond season W–L, what is “fancy stats” for v1 (AFC East place, point differential, streak, last-N)? Cap at 2–3 numbers?
5. **Off-season (Mar 2 – Jul 31)** — Hide the card, show a quiet “season starts …” empty state, or keep last season’s record + next season schedule when available? (Default lean: quiet empty state or hide — align with Aug 1–Mar 1 window.)
6. **Tap behavior** — Card is glance-only, or tap opens a Bills detail / external NFL/Bills link?
7. **Priority vs other Home work** — OK to stay behind todos / journal / Daily Puzzle on Home, or bump sooner once scope is locked?

## Notes

- Intake **2026-09-13** from founder verbatim (punctuation normalized in Problem/Outcome). Initial pass misheard as Chicago Bulls (NBA); **founder correction 2026-09-13: Buffalo Bills (NFL), not Bulls.** Schedule primary; W–L + light stats; bottom Home card; **ask clarifying questions** before build.
- **2026-09-13:** Rescoped item file `bulls-panel-home.md` → `bills-panel-home.md`; team/league, scope, risks, and open questions updated for NFL Bills; seasonality aligned to briefing **Aug 1 – Mar 1**.
- Passes [RB-013](./personal-os-north-star.md) filter as a personal want (team affinity), not generic product bloat — keep v1 thin.
- Rank **20** — with personal Home / life tools cluster after [RB-018](./workout-tracker.md); **does not** jump P0 rebrand/todos/journal or In Progress Home puzzle ([RB-024](./daily-puzzle-on-home.md)).
- Status stays **Backlog** until open questions close → then **Ready** with locked scope table.
