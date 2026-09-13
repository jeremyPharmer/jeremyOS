# Bills panel on Home

| Field | Value |
| --- | --- |
| ID | RB-034 |
| Rank | 20 |
| Priority | P1 |
| Status | Done |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants a **Buffalo Bills** (NFL) glance on Home — schedule first, plus record and a bit of stats — without turning JeremyOS into a generic sports app or rebuilding Entertainment.

## Outcome

Home ends with a **clean, lean card** showing Bills **schedule** (primary), **wins/losses**, and a small set of **stats**, so Jeremy can check the team without leaving JeremyOS.

## Scope (v1) — locked 2026-09-13 · shipped

Open questions **answered via deferred founder defaults** (2026-09-13). Status **Done** — eng shipped 2026-09-13.

Working intake from founder (2026-09-13): *“Bills panel - on the homepage, [a lean / Alena?] clean looking card at the very bottom of the [Home]. Schedule, as it is, [no?] fancy stats, wins losses and schedule is all.”* (Initially misheard as Chicago Bulls; corrected to **Buffalo Bills** / NFL — see Notes.)

### Locked v1

| Decision | Locked (deferred defaults 2026-09-13) |
| --- | --- |
| Team | **Buffalo Bills** (NFL) only |
| Placement | **Very bottom** of Home (below existing Home stack) |
| Visual | **Lean / minimal clean home-card** (“Alena” = lean) |
| Schedule | **Last completed game** + **next 2–3 upcoming** |
| Live | Show **in-progress score** when game is live; otherwise **finals + upcoming**; **refresh on Home load** |
| Fancy stats | Season **W–L** + **division standing** + **streak** (**cap 3**) |
| Off-season | Quiet **in-card empty state**; **hide card** outside **Aug 1 – Mar 1** Bills season window (same rule as [RB-032](./daily-briefing-open-close-redesign.md) / `isBillsSeason`) |
| Tap | Link out to **ESPN Bills clubhouse** |
| Priority | Keep **rank 20** (do not jump P0s) |
| Interactivity | Glance card + external tap-out only (no in-app Bills detail surface in v1) |

## Out of scope / later

- Multi-team / fantasy / betting / live score push spam
- Full ESPN-style box scores, play-by-play, or video
- Rebuilding Home Entertainment / On Air (that slot is crossword — [RB-024](./daily-puzzle-on-home.md); park [RB-025](./park-home-entertainment.md))
- Other Buffalo / NFL teams unless founder asks — separate items
- Treat/fund hooks or recovery framing around games
- Duplicating briefing “Bills headline in season” ([RB-032](./daily-briefing-open-close-redesign.md)) — panel is schedule/record/stats, not news

## Dependencies & risks

- **Data source:** ESPN public site API (spike 2026-09-13) vs other NFL/third-party — licensing, rate limits, and reliability
- **Seasonality:** reuse **Aug 1 – Mar 1** Bills window; hide outside window; quiet in-card empty when shown but no games
- **Home density:** bottom card must stay lean so it does not fight Daily Puzzle / tasks / agenda
- UXUI owns card polish; Reese owns fetch + cache contract if live data
- Distinct from calendar agenda ([RB-023](./calendar-ical-google.md)) — sports schedule is not personal calendar (locked: **no** merge)
- Distinct from Open/Close news Bills injection — share season helper if useful; do not conflate product surfaces

## Open questions

**Answered 2026-09-13 via deferred founder defaults** (recommended defaults adopted; Q1–Q7 closed). Eng may ship against locked scope above.

| # | Question | Answer (deferred default) |
| --- | --- | --- |
| 1 | “Alena” lean vs style ref? | Lean / minimal card |
| 2 | Schedule window? | Last completed + next 2–3 upcoming |
| 3 | Live vs static? | In-progress score when live; else finals + upcoming; refresh on Home load |
| 4 | Which fancy stats (cap)? | Season W–L + division standing + streak (cap 3) |
| 5 | Off-season UX? | Quiet in-card empty; hide card outside Aug 1–Mar 1 |
| 6 | Tap behavior? | Link out to ESPN Bills clubhouse |
| 7 | Priority? | Keep rank 20 |

## Notes

- Intake **2026-09-13** from founder verbatim (punctuation normalized in Problem/Outcome). Initial pass misheard as Chicago Bulls (NBA); **founder correction 2026-09-13: Buffalo Bills (NFL), not Bulls.** Schedule primary; W–L + light stats; bottom Home card.
- **2026-09-13:** Rescoped item file `bulls-panel-home.md` → `bills-panel-home.md`; team/league, scope, risks, and open questions updated for NFL Bills; seasonality aligned to briefing **Aug 1 – Mar 1**.
- **2026-09-13:** Scope **locked** via deferred defaults; Status was **Ready**; eng shipping next. Rank remains **20**.
- **2026-09-13 Done:** Eng shipped Home bottom Bills card — ESPN schedule (last completed + next upcoming), W–L + division standing + streak; card **hidden** outside **Aug 1 – Mar 1**; tap → ESPN Bills clubhouse. Status → **Done**.
- Passes [RB-013](./personal-os-north-star.md) filter as a personal want (team affinity), not generic product bloat — keep v1 thin.
- Rank **20** — with personal Home / life tools cluster after [RB-018](./workout-tracker.md); **does not** jump P0 rebrand/todos/journal or In Progress Home puzzle ([RB-024](./daily-puzzle-on-home.md)).
- **2026-09-13 eng spike (no build yet at spike time):** ESPN public site API works for Buffalo Bills without auth:
  - Team: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/buf` → record summary, logos, colors
  - Schedule: `.../teams/buf/schedule` → events with week, date, competitors, scores, status; `recordSummary`, `standingSummary` (e.g. "1st in AFC East")
  - Soft-fail + cache pattern should mirror weather/news APIs
  - As of spike date, Bills were **1-0 Week 1 (vs HOU)** mid-2026 season — good live data for v1.
