# Recovery content: weekly podcast & book offers

| Field | Value |
| --- | --- |
| ID | RB-005 |
| Rank | 10 |
| Priority | P0 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

JeremyOS’s content surface should serve **podcast integration Jeremy likes** — not endless generic recovery-catalog polish for a multi-user product. Offers still mix podcasts and articles/books; avoid repeating heard/read ids. Do not expand into a media platform for its own sake.

## Outcome

**Primary (JeremyOS):** Podcast integration stays useful — Jeremy can pick / open episodes he cares about; heard ids are not re-offered.

**Secondary (keep thin):** Articles/books may remain in the pool if Jeremy uses them; do not grow catalog depth as a “daily love” KPI.

**Original weekly model (Later / consider only):** Exactly two selectable offers per week — park unless Jeremy asks for it.

## Scope

### In progress — podcast-first on the shipped card

Runtime already ships a thinner Recovery Content surface (~5 offers: 3 podcasts + 2 articles) with `listenedPodcasts` (and read) tracking. Founder feedback (2026-08-21): content **repeats too often**. **2026-08-29:** founder likes **podcast integration** under JeremyOS — prioritize that over generic catalog expansion.

Polish / expand (this slice):

- **Never re-offer** ids already heard or read (no fallback into the consumed pool)
- Prefer podcast sources Jeremy actually listens to; grow catalog only enough to avoid repeats — not a completeness race
- Keep the shipped multi-offer card shape; thin article/book pool OK

### Later / consider — weekly two-offer model (do not elevate)

- Two offers per week, books mix, Rich Roll optional excellence — park unless Jeremy asks

## Out of scope / later

- Full in-app podcast player or ebook reader
- Personalized ML recommendation engine
- Deep catalog expansion as generic product polish (fails RB-013 build filter)
- Building the weekly-two UX before podcast-first no-repeat is solid

## Weekly offer model

| Rule | Value |
| --- | --- |
| Offers shown | **2** (consider model; shipped card currently shows ~5) |
| Refresh | **Weekly** (consider); shipped picker refreshes from catalog |
| Mix | Podcasts and/or books/articles |
| Selection | User can select from the offers shown |
| Branding | Not required to be Rich Roll every week |
| Repeat policy | **Never re-offer** heard/read ids (locked for shipped polish) |

## Candidate pool (research snapshot — 2026-08-10)

### Podcasts — Rich Roll (loved starter set)

| Offer | Why it fits |
| --- | --- |
| **Rich Roll** — Zac Clark (#1005): getting sober & staying that way | Direct recovery story; purpose/service |
| **Rich Roll** — Ethan Suplee (Jun 2025): transformation, relapse, addiction patterns | Honest relapse / change narrative |
| **Rich Roll** — Addiction & Recovery Masterclass (#644) | Dense overview of addiction + recovery |

### Podcasts — other strong voices

| Offer | Why it fits |
| --- | --- |
| **Recovery Elevator** | Long-running alcohol-recovery community |
| **That Sober Guy** | Practical sobriety; strong for men’s recovery |
| **One Day At A Time Recovery Podcast** | Relapse shame; therapist + lived experience |

### Books

| Offer | Why it fits |
| --- | --- |
| **In the Realm of Hungry Ghosts** — Gabor Maté | Trauma-informed addiction classic |
| **Alcoholics Anonymous (Big Book)** | Foundational 12-step recovery text |
| **This Naked Mind** — Annie Grace | Popular alcohol-freedom / desire-change framing |
| **Atomic Habits** — James Clear | Habit systems useful for recovery routines (supportive, not addiction-specific) |

## Example week (illustrative)

1. Rich Roll × Zac Clark (podcast)  
2. *In the Realm of Hungry Ghosts* (book)

Next week might be Recovery Elevator + *This Naked Mind* — no Rich Roll required.

## Dependencies & risks

- Licensing / linking (podcast deep links, book buy/library links)
- Lightweight CMS or config for catalog + weekly pair selection
- Tone: recovery-safe framing; avoid sensational relapse content without care
- Thin catalog + fallback-to-heard in `pickRecoveryOffers` is the known repeat cause — fix policy and catalog size together

## Notes

- **2026-08-29 JeremyOS:** rank **6** / **P0** (was 5; bumped when RB-016 entered). Reframed podcast-first; demote deep catalog / weekly-2 as generic polish. Still behind rebrand, north star, todos, five-year journal, email.
- **2026-08-29 personal tools intake:** founder still wants **some regular recovery content** — keep that need on this item (no conflicting duplicate). Podcast-first remains primary; thin articles/books OK if Jeremy uses them. Do not expand into generic catalog KPI polish (RB-013). Rank **6**.
- **2026-08-21 founder feedback:** recovery content repeats too often → never re-offer heard/read. Status **In Progress**; weekly 2-offer remains consider.
- Updated 2026-08-10: expand beyond podcasts-only; weekly **two selectable** offers; books included; Rich Roll optional. Shipped thinner surface already live.
- **2026-09-03:** Home **Entertainment section** parked Later via [RB-025](./park-home-entertainment.md) (founder: drop to the back). This item stays **In Progress** for thin podcast no-repeat only — do **not** expand Entertainment card prominence. Rank **10** (bumped when [RB-024](./daily-puzzle-on-home.md) entered at 9).
- **2026-09-04:** Home On air / Entertainment **hidden** — crossword takes the slot ([RB-024](./daily-puzzle-on-home.md)). Podcast work continues **off Home**; do not restore an On air Home card.
