# JeremyOS product roadmap

Living roadmap for **JeremyOS** (formerly framed as ReBuild) — Jeremy’s **executive assistant / personal OS**: things he wants and will actually use, not a generic recovery/incentive or trail-themed product to polish indefinitely.

Recovery journey + fund/incentive tools remain **personal tools** when useful (no trail language); they are secondary to the EA / personal-OS north star. Historical item IDs keep the `RB-*` prefix. **Rebrand, not rewrite** — see [RB-012](./items/rebrand-jeremyos.md).

Maintained by the **Head of Product** agent (`.cursor/agents/head-of-product.md`).  
**Priority ranking is the primary planning signal.** Due dates, effort, and timeline support rank — they do not override it.

Last updated: 2026-09-11

## North star (locked 2026-08-29)

| Principle | Meaning |
| --- | --- |
| **Name** | **JeremyOS** (corrected from early “Jeremy PS” lean) |
| **Role** | **Executive assistant / personal OS for Jeremy** |
| **Focus** | All about Jeremy and things he wants |
| **Anti-goal** | Stop inventing a generic product “to love daily”; don’t add features for their own sake; drop trail/hiking metaphor |
| **Elevate** | Email/Gmail, podcast + regular recovery content, **to-do lists**, **five-year journal**, home cameras, workout tracker, favorite recipes, links to **other apps/sites Jeremy creates**; **morning/evening mood & feeling** ritual ([RB-027](./items/morning-day-start-briefing.md) shipped; [RB-029](./items/morning-briefing-conversational.md) conversational calendar-first iterate); **calendar (iCal + work Google)** when asked; **5×5 daily mini crossword on Home** (replaces On Air / Entertainment — [RB-024](./items/daily-puzzle-on-home.md)) |
| **Recovery / fund** | Keep documented as personal tools (no trail language); ship honesty fixes if mid-flight; demote expansion vs EA / personal OS; **drop craving stats** + Home craving CTA ([RB-020](./items/drop-craving-stats-home-cta.md)); **park / replace Home Entertainment** ([RB-025](./items/park-home-entertainment.md)) |
| **Delivery** | Rebrand / reframing over greenfield (RB-012); keep **Journey** nav label |

Build filter: see [RB-013](./items/personal-os-north-star.md).

## Current focus

| Rank | ID | Item | Priority | Status | Effort | Target due |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | RB-012 | Rebrand to JeremyOS (EA + drop trail) | P0 | Ready | M | TBD |
| 2 | RB-013 | Personal OS north star (cut bloat) | P0 | Ready | S | TBD |
| 3 | RB-014 | To-do lists (first-class) | P0 | Ready | L | TBD |
| 4 | RB-026 | Task groups + colors & calendar M/D | P0 | In Progress | M | TBD |
| 5 | RB-029 | Conversational morning briefing (calendar-first) | P0 | Ready | S | TBD |
| 6 | RB-016 | Five-year / paper journal UX | P0 | In Progress | M | TBD |
| 7 | RB-021 | Journal photos (attach + paperclip) | P1 | Backlog | S | TBD |
| 8 | RB-022 | Journal edit, star & month calendar | P0 | In Progress | M | TBD |

## Now / Next / Later

### Now

1. **RB-012 — Rebrand to JeremyOS (EA + drop trail)** — naming + executive-assistant framing + retire trail metaphor (copy/IA); **Journey nav label kept**; thin chrome pass after docs; **not** a rewrite. Detail: [`items/rebrand-jeremyos.md`](./items/rebrand-jeremyos.md).
2. **RB-013 — Personal OS north star** — enforce EA / personal-use build filter; ranking already reflects pivot. Detail: [`items/personal-os-north-star.md`](./items/personal-os-north-star.md).
3. **RB-014 — To-do lists** — **scope locked 2026-08-31** (+ **2026-09-04**): Today’s Items (merge personal tasks + supports), **one Home banner / flat list** (no “Your tasks” sub-area), snooze/auto-roll, simple recurrence (+ 1st of month), master page (± nav tab); **no email**. Effort **L**. Detail: [`items/todo-lists.md`](./items/todo-lists.md).
4. **RB-026 — Task groups + colors & calendar M/D** — **In Progress.** Scope locked 2026-09-08 (+ undated **No date**, Settings calendar→group): Home calendar **M/D**; fixed groups Real estate/Family/Home/Work (red/yellow/blue/green); mandatory group; Home flat open-only + color bar; Tasks page grouped open + forever completed under chevrons; **one first ship**. Effort **M**. Detail: [`items/task-groups-calendar-md-labels.md`](./items/task-groups-calendar-md-labels.md).
5. **RB-029 — Conversational morning briefing (calendar-first)** — **Ready / P0.** Locked 2026-09-11 (ship-and-iterate on **RB-027 Done**): drop rigid labeled dashboard; **conversational** rules-based surface; **calendar + open windows / Try here** first; weather/feeling secondary (do not dominate); intention + 1–10 check-in unchanged; **no** morning Items checklist; **no** LLM. Effort **S**. Detail: [`items/morning-briefing-conversational.md`](./items/morning-briefing-conversational.md). Parent: [`items/morning-day-start-briefing.md`](./items/morning-day-start-briefing.md).
6. **RB-016 — Five-year / paper journal UX** — same calendar day across years; headline + short summary; journal vibes (not stacked cards). Detail: [`items/five-year-journal-ux.md`](./items/five-year-journal-ux.md). Distinct from RB-010 backfill integrity.
7. **RB-021 — Journal photos (attach + paperclip)** — optional pics on journal/evening entries; paperclip (or similar) on year slots when a photo is present; tap to view; **reuse** existing photo infra. Detail: [`items/journal-photos.md`](./items/journal-photos.md).

**Mid-flight (finish thin; do not expand):** RB-011 (fund auto-credit), RB-010 (journal backfill) — personal-tool integrity, ranks 18–19. Do **not** widen RB-010 into edit-past ([RB-022](./items/journal-edit-star-calendar.md)).

### Next

1. **RB-022 — Journal edit, star & month calendar** — month view → tap day; edit existing (headline + summary + photos); star bookmark + starred list; `/journal` only; prose-only; missed days route to RB-010. Detail: [`items/journal-edit-star-calendar.md`](./items/journal-edit-star-calendar.md). After RB-016 / RB-021; does not steal RB-016’s In Progress slot. **Not** event calendar sync (that’s shipped [RB-023](./items/calendar-ical-google.md)).
2. **RB-002 — Email / Gmail** — elevated; founder “My Gmail obviously.” Detail: [`items/email-integration.md`](./items/email-integration.md). **Not** calendar — see RB-023 (Done).
3. **RB-024 — Daily Puzzle on Home** — **In Progress.** Locked: **5×5 Mini Crossword** replaces On Air; **Start** → attempt; banner **`completed/attempts · success%`** (lifetime rate, e.g. `2/3 · 67%` — **not** today’s fill %); podcasts off Home. Effort **M**. Detail: [`items/daily-puzzle-on-home.md`](./items/daily-puzzle-on-home.md).
4. **RB-005 — Podcast-first + regular recovery content** — **In Progress**; keep podcast useful + no-repeat off Home for now; founder still wants some regular recovery content (no duplicate item). Home On air **hidden** — slot is crossword (RB-024) / park RB-025. Detail: [`items/recovery-content-offers.md`](./items/recovery-content-offers.md).
5. **RB-017 — Home cameras (Reolink)** — founder ~priority **5** on the personal-tools list; API spike / engineer handoff OK. Detail: [`items/home-cameras-reolink.md`](./items/home-cameras-reolink.md).
6. **RB-028 — Journey vitals: BP + heart rate** — **Backlog / P1.** Locked 2026-09-10: Journey-only log (not Home/morning); each entry systolic + diastolic + HR (all required); freeform anytime with AM/PM; no teach/explainers; **Vitals chart separate from Conditions**; logs + neutral trends (no medical advice / target bands v1). Effort **M**. Detail: [`items/journey-vitals-bp-hr.md`](./items/journey-vitals-bp-hr.md).
7. **RB-018 — Workout tracker** — personal log, not fitness SaaS. Detail: [`items/workout-tracker.md`](./items/workout-tracker.md).
8. **RB-019 — Favorite recipes** — thin favorites section. Detail: [`items/favorite-recipes.md`](./items/favorite-recipes.md).
9. **RB-015 — Hub: Jeremy’s other apps & sites** — link hub v1. Detail: [`items/jeremy-apps-hub.md`](./items/jeremy-apps-hub.md).
10. **RB-003 — Daily email: open checklist / todos** — after RB-002 (+ prefer RB-014 list model).
11. **RB-011 — Auto-credit daily savings** — complete In Progress slice; then stop money expansion.
12. **RB-010 — Backfill missed evening / journal** — complete thin slice if still useful personally (integrity only; five-year UI is RB-016; edit/star/calendar is RB-022).

### Later

1. **RB-006 — Fund buckets Future + Treat @ 30/70** — model still **locked** (`FUND_MODEL.md`); implementation polish secondary under JeremyOS.
2. **RB-001 — Auto-pull funds: checking → Venmo** — demoted from P0; personal rail when Jeremy asks; API feasibility still hard.
3. **RB-008 — Segregated account feasibility** — research preserved; not near-term.
4. **RB-004 — SMS integration** — Later; email elevated, not SMS.
5. **RB-025 — Park Home Entertainment section** — On Air / Today’s Entertainment **replaced by** 5×5 crossword (RB-024); residual layout cleanup Later. Detail: [`items/park-home-entertainment.md`](./items/park-home-entertainment.md).
6. Alternate payment destination: soccer / bank — still deferred.
7. In-app how-to walkthrough — still deferred.
8. Task group add/rename (v2) — after [RB-026](./items/task-groups-calendar-md-labels.md); calendar group sections still out of scope unless founder reopens.
9. LLM / generative morning briefing — after [RB-029](./items/morning-briefing-conversational.md) conversational rules-based iterate (parent [RB-027](./items/morning-day-start-briefing.md) Done).

**Won't Do:** RB-009 recovery patterns / craving analytics (founder: drop craving stats).  
**Done:** RB-007 accounts + onboarding; **RB-020** drop craving stats + Home craving CTA; **RB-023** calendar iCal + Google (Home agenda + Settings; superseded env/Today’s Build PR #70 approach).

## Timeline (effort view)

| Focus | Planned | Notes |
| --- | --- | --- |
| Now (framing) | RB-012 rebrand (EA + drop trail) + RB-013 north star | Effort **M** + **S**; docs first, then chrome/copy; Journey label locked keep |
| Now (personal tools) | RB-014 todos (**Ready / L**) → **RB-026 task groups + calendar M/D** (**In Progress / M**, locked 2026-09-08; one first ship) → **RB-029 conversational morning briefing** (**Ready / P0 / S**, locked 2026-09-11; parent RB-027 Done) → RB-016 five-year journal → **RB-021 journal photos** | Merged Today’s Items + master page; groups/colors + Home no-completed; morning iterate = conversational calendar-first briefing (not labeled dashboard; not Items checklist); journal cluster still in flight |
| Next (journal tooling) | **RB-022 edit / star / month calendar** | After RB-016 + RB-021; effort **M**; photo storage risk (no auth, db.json + `.data/photos`); ≠ event calendar |
| Next (EA + Home) | RB-002 Gmail → **RB-024 daily puzzle** → RB-005 podcast (thin; **off Home**) → RB-017 cameras → **RB-028 Journey vitals BP+HR** → RB-018 workout → RB-019 recipes → RB-015 hub → RB-003 digest | Puzzle = **5×5** crossword replacing On Air; Start→attempt; banner `completed/attempts · success%` (**M**; not fill %); Entertainment park RB-025; **RB-023 calendar Done**; vitals = Journey-only objective log/chart (≠ Conditions) |
| Finish thin | RB-011, RB-010 | Do not expand money/daily-loop polish; journal UI = RB-016; media = RB-021; edit/star/calendar = RB-022 |
| Later (personal fund) | RB-006, RB-001 | Locked model; rails demoted |
| Later / paused | RB-008, RB-004, **RB-025 Home Entertainment park**, RB-026 v2 group CRUD, LLM morning briefing | Unrequested channels + Entertainment demoted; group add/rename after fixed v1 groups; generative briefing after RB-029 conversational rules-based pass |
| Done (morning v1) | **RB-027** redesigned morning day-start | Tap 1–10 + rules-based briefing shipped; iterate = RB-029 |
| Done (cut) | RB-020 drop craving stats + Home craving CTA | Surfaces removed; mood loop kept |
| Done (calendar) | **RB-023** iCal + Google Home agenda | Settings Apple/Work/extra iCal + Google OAuth; Home `TodayAgendaCard`; superseded env/Today’s Build PR |
| Won't Do | RB-009 | Craving pattern analytics |

## Ranking principles

1. **Jeremy will use it** beats generic product completeness (RB-013)
2. Rank order is authoritative; P-tags support rank
3. Ship a thin v1 over boiling the ocean
4. Personal-tool honesty (e.g. fund ledger) can finish mid-flight without re-elevating money OS
5. No silent reordering — document why rank changed in the item Notes
6. Do not kill recovery/fund history without evidence — demote and note instead; **exception:** founder-explicit cuts (e.g. craving stats) → Won't Do + thin removal item

## How to update

Use the **head-of-product** agent or the **product-roadmap** skill. Keep `ROADMAP.md`, `BACKLOG.md`, and `product/items/*` aligned.
