# Daily Puzzle on Home

| Field | Value |
| --- | --- |
| ID | RB-024 |
| Rank | 8 |
| Priority | P1 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Home is checklist / Move / Entertainment-heavy and lacks a small **daily cognitive ritual** Jeremy can return to. He asked for a simple brain game or puzzle on the Home Screen — calm, useful, not a casino or entertainment hub. Follow-ups: he likes **crossword** because he can **chip at it during the day** (progressive / multi-session); he wants the puzzle to **replace** the shipped **On Air / Today’s Entertainment** Home slot (`TodaysEntertainmentCard`).

## Outcome

Home’s former Entertainment / On Air slot is a **5×5 mini crossword** Jeremy can **Start**, leave, and resume the same calendar day with **progress saved**. Clear “Solved” when complete. A simple lower-banner inside the crossword block shows **`completed/attempts · success%`** (e.g. `8/15 · 53%` — lifetime success rate). Podcasts stay off Home. Executive / recovery-safe tone — no casino, no Entertainment hub.

## Scope (v1) — locked: 5×5 Mini Crossword (replaces On Air)

### Locked

| Decision | Value |
| --- | --- |
| Grid | **5×5** mini crossword (not ~7×7); about **3–5 clues** |
| Placement | **Replaces** On Air / Today’s Entertainment (`TodaysEntertainmentCard` / `home-layouts` `entertainment`) — not a second card. See [RB-025](./park-home-entertainment.md). |
| Podcasts on Home | **Hide** — Entertainment / On Air slot fully replaced; RB-005 content **not** on Home for now |
| Chip-through-day | Persist in-progress grid + answers for the calendar day; mark **Solved** when complete |
| Start model (**#1**) | **Start button** → grid unlocks; tap Start = **attempt** for that day |
| Attempt | Day counts **once** when user taps Start. **One attempt per calendar day max.** |
| Complete | Puzzle marked **Solved** that day |
| Progress fraction | **`completed / attempts`** — **not** year-365, not packs, not started-only numerator |
| Banner % | **Lifetime success rate** = `completed / attempts` as nearest-integer percent (e.g. `2/3` → **67%**). **Not** today’s grid fill %. |
| Banner location | **Footer inside** the crossword Home block |
| Preferred banner string | **`{completed}/{attempts} · {success}%`** — e.g. **`2/3 · 67%`** or **`8/15 · 53%`** (bare form preferred; light labels optional polish) |
| In-progress day | Counts toward **attempts**, not **complete**; banner `%` is still lifetime success (not fill). Grid itself shows fill. |
| Not started / zero attempts | If `attempts === 0`: **`0/0 · —`**. If attempts > 0: always show success `%` (does not require Start today). |
| Tone | Quiet “Solved” — no streaks-as-guilt, no coins, no ads, no casino framing |
| Content | Curated clue pack for v1 (hand-authored days; rotate) — not a full crossword CMS |
| Cadence | One puzzle per calendar day (seeded by date) |

### Resolved open questions (was A–F)

| Q | Resolution |
| --- | --- |
| A (`XXX`) | **Attempts** (lifetime count of days Started). **Not** 365/366. |
| B (numerator) | **Completed** (Solved), not “started” as the left number — founder: “(Complete)/attempts” |
| C (% finish) | **Superseded 2026-09-07:** lifetime **success rate** (`completed/attempts`), not today’s fill % |
| D (banner) | Footer **inside** the crossword Home block |
| E (Start) | Model **#1**: Start button then grid unlocks; Start = attempt |
| F (podcasts) | **Hide from Home** for now; RB-005 elsewhere later / not on Home |

## Out of scope / later

- Leaderboards, multiplayer, streaks monetization, or Treat/fund hooks
- Multiple puzzle types shipping at once
- Full newspaper crossword / NYT-scale grids or third-party embeds
- One-shot-only mechanics as the primary Home puzzle (unscramble / riddle / Simon) — see Notes “less preferred”
- Keeping Today’s Entertainment or podcast On air as a peer Home hero alongside the crossword
- Expanding Entertainment catalog polish (RB-025)
- Year-based denominators (365) or pack-count denominators for the banner

## Dependencies & risks

- UXUI: swap Entertainment Home slot for crossword card; Start gate; in-block lower banner; calm, not arcade
- Content: 5×5 clue + answer curation (avoid recovery triggers / junk slang)
- Persistence: day-keyed grid + attempt/complete flags + lifetime completed & attempts counters in existing store
- RB-005: podcast no-repeat may continue off-Home; do not restore On air on Home
- RB-025: Entertainment primary slot retired by this item when shipped

## Open questions

None blocking scope. Optional later polish only: whether to show light text labels vs the bare `2/3 · 67%` form (preferred default is the bare form). Fraction + success % are intentionally redundant (exact + glanceable).

## Notes

- Intake **2026-09-03** founder ask: simple daily brain game/puzzle on Home; demote Entertainment.
- Follow-up **2026-09-04:** prefers **crossword** for chip-during-the-day; effort **M**; Word Unscramble demoted from default.
- Follow-up **2026-09-04 (later):** lock **5×5**; replace On Air; open questions A–F posed.
- Follow-up **2026-09-04 (share #1 / Complete÷attempts):** Start model **#1**; fraction **completed/attempts**; originally locked % as today’s fill; banner (in-block footer); podcasts (hide from Home). A–F resolved.
- **Locked v1:** 5×5 Mini Crossword replacing Entertainment Home slot; Start → attempt; banner `completed/attempts · success%` — effort **M**.
- **2026-09-07 founder feedback (banner %):** screenshot `2/3 · 100%` with answers revealed; founder: “This should be 66% it's 2/3 correct.” **Decision: switch banner `%` from today’s fill progress → lifetime success rate** (`completed/attempts`, nearest-integer %; `2/3` → **67%**). Fill progress stays visible on the grid only — not in the banner. Keeps string shape `{completed}/{attempts} · {n}%`.
- **Progressive shortlist** (alternatives; crossword remains locked):

| Idea | Mechanic | Why it chips well | Effort | Home fit / risk |
| --- | --- | --- | --- | --- |
| **Mini Crossword** *(locked)* | **5×5** + 3–5 clues; Start then chip letters | Multi-session; leave half-filled | M | Founder lock; takes Entertainment slot |
| **Micro Number Place** | 4×4 or 6×6 sudoku-lite | Grid state progressive | M | Parked |
| **Daily Cryptogram** | Letter-substitution phrase | Chip letters over sessions | S–M | Not selected |
| **Mini Nonogram** | Tiny picross | Session-friendly painting | M | Not selected |
| **Word Framework** | Intersecting blanks + word bank | Crossword-lite | S–M | Not selected |
| **Acrostic Quote (thin)** | Clue-words unlock a quote | Gradual fill | M | Not selected |
| **Cross-Sums (Mini Kakuro)** | Number-crossword | Same chip rhythm | M | Not selected |

- **Also considered / less preferred for chip-at-day:** Daily Word Unscramble; Riddle of the Day; Pattern Pulse.
- Passes RB-013 build filter (Jeremy asked). Rank **9**. Slot replacement with [RB-025](./park-home-entertainment.md).
