# Schroeder soccer panel on Home

| Field | Value |
| --- | --- |
| ID | RB-035 |
| Rank | 21 |
| Priority | P1 |
| Status | Ready |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy asked to replicate the **Bills Home schedule card** for **Webster Schroeder varsity soccer** (Sabre logo + flag). Eng shipped only a **static ticket-stub sample** at `public/schroeder-soccer-stub-sample.html` — not a Home panel — so soccer never appears on Home. Founder then reported “don’t see soccer on Home” after prod deploy (expected; sample ≠ product surface).

## Outcome

Home shows a **lean Schroeder soccer glance card** (same job as [RB-034](./bills-panel-home.md) Bills panel): schedule primary, light record/standing, Sabre branding — without turning JeremyOS into a multi-sport app.

## Product intent (locked)

**Yes — Schroeder soccer is a Home panel like Bills**, not a static HTML sample. The stub is a **UI reference only**; v1 product delivery is a Home card adjacent to Bills.

## Scope (v1) — recommended lock 2026-09-15

Open questions below may still need founder defaults; until then eng may treat the **recommended defaults** as the working lock (same pattern as RB-034 deferred defaults).

### Locked / recommended v1

| Decision | Recommended lock |
| --- | --- |
| Team | **Webster Schroeder varsity boys soccer** only (matches stub / MaxPreps sample) |
| Surface | **Home panel card** (not the static HTML sample; sample stays reference) |
| Placement | **Bottom of Home, immediately under Bills** when both visible; alone at bottom when Bills is season-hidden |
| Visual | Lean / ticket-stub family matching Bills Home treatment; **Sabre logo** + optional **flag** accent (assets already in `public/schroeder-sabre-*`) |
| Branding | **Sabres** naming (“Go Sabres” / Schroeder); **not** Warriors as primary mark (Warriors mascot asset deferred) |
| Schedule | **Last completed** + **next 2–3 upcoming** (same window as Bills; not full-season scroll on Home) |
| Fancy stats | Season **W–L** + **league/section standing** + **streak** (**cap 3**) |
| Live | Show **in-progress score** when available; else finals + upcoming; **refresh on Home load** |
| Off-season | **Hide card** outside fall soccer window **Aug 15 – Nov 15** (quiet empty only if shown mid-window with no games) |
| Data source | **MaxPreps** Webster Schroeder varsity boys soccer (same source as stub); soft-fail + cache like Bills/weather |
| Tap | Link out to **MaxPreps team / schedule** page |
| Priority | Keep **rank 21** (after Bills Done; do not jump P0s) |
| Interactivity | Glance card + external tap-out only (no in-app soccer detail surface in v1) |

## Out of scope / later

- Shipping or promoting `schroeder-soccer-stub-sample.html` as the product surface
- Multi-team HS sports, girls soccer, or other schools (separate items if asked)
- Warriors-primary branding / mascot as the Home mark
- Fantasy, betting, push notifications
- Merging soccer into personal calendar ([RB-023](./calendar-ical-google.md)) — sports glance ≠ calendar
- Treat/fund hooks around games
- Fixing Bills logo “scribble” regression — eng/Bugbot follow-up on RB-034 ship, not this item

## Dependencies & risks

- **Data source harder than NFL:** MaxPreps has no official public API like ESPN site API; may need scrape, unofficial endpoint, or season-static fallback — spike before polish
- **Season publish lag:** stub notes Fall 2026 may not be published yet; card must soft-fail gracefully
- **Home density:** two sports cards (Bills + soccer) only when seasons overlap (roughly Aug–mid-Nov); keep both lean
- UXUI owns card polish (reuse Bills stub language); Reese owns fetch + cache contract
- Distinct from alternate payment “soccer bank” Later note — unrelated

## Open questions (need founder defaults)

| # | Question | Recommended default until answered |
| --- | --- | --- |
| 1 | Boys only, or girls / both? | **Boys varsity only** |
| 2 | Season hide window? | **Aug 15 – Nov 15** (hide outside) |
| 3 | Placement vs Bills? | **Directly under Bills** at Home bottom |
| 4 | Sabres vs Warriors primary naming/mark? | **Sabres** + Sabre logo/flag |
| 5 | MaxPreps OK as source + tap-out? | **Yes** (stub already uses it) |
| 6 | Live scores required in v1? | **Yes when available**; else schedule + finals |
| 7 | Priority jump above journal/puzzle? | **No** — keep rank **21** |

## Notes

- Intake origin: founder ask to replicate Bills schedule format for Webster Schroeder varsity soccer with Sabre logo and flag. Stub PR `#200` (`schroeder-soccer-stub-sample.html`) was **sample-only** — explains “don’t see soccer on Home.”
- **2026-09-15:** Product confirms Home-panel intent; creates **RB-035**; rank **21** (personal Home sports cluster immediately after [RB-034](./bills-panel-home.md) Done). Status **Ready** with recommended locked scope.
- Passes [RB-013](./personal-os-north-star.md) as personal affinity (same class as Bills), not generic sports bloat — keep v1 thin and seasonal.
- Bills logo “scribble” after look-alts / prod deploy is a **separate eng regression** on shipped RB-034 (`/bills-classic.svg` + `BillsPanelCard`); not blocked by RB-035.
