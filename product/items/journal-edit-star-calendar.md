# Journal edit, star & month calendar

| Field | Value |
| --- | --- |
| ID | RB-022 |
| Rank | 9 |
| Priority | P0 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: UXUI `/journal` + Reese prose-edit + photo/star model) |

## Problem

After the five-year day page ([RB-016](./five-year-journal-ux.md)), Jeremy still cannot **edit** an existing entry’s headline/summary (or add photos later), **bookmark** memorable days, or **browse by month** from `/journal`. Missed closes must stay on the integrity path ([RB-010](./backfill-missed-evening-journal-close.md)) — not invent a second “create past day” flow.

## Outcome

From `/journal` only: a **month calendar** (tap a day → day page), **in-place edit** of existing entries (headline + summary + add photos), and a **personal star** (bookmark) on concrete `YYYY-MM-DD` days — surfaced on the month view, five-year day page, and a **starred list**. Prose/media only; no reclaim/milestone re-runs. No delete.

## Scope (v1)

Thin slice with **all three** capabilities (calendar + edit + star):

1. **Month calendar** on `/journal` → tap a day to open that day’s five-year page (or equivalent day context)
2. **Edit existing entries only** — fields: **headline**, **summary**, **add photos**; keyed to concrete `YYYY-MM-DD` (not whole MM-DD slot across years)
3. **Missed / missing days:** do **not** create via the edit path; **notify / route to close** via **[RB-010](./backfill-missed-evening-journal-close.md)**
4. **Star:** personal bookmark only; no cap; same `YYYY-MM-DD` keying
5. **Star surfaces:** month calendar, five-year day page, **and** a starred list
6. **Calendar markers:** only what’s needed — closed / missing / starred (no extra data piled on)
7. **Entry point:** `/journal` only
8. **Side effects:** prose (+ photo attach) only — **no** reclaim / milestone re-runs
9. **Delete:** no — in-place edit only

## Out of scope / later

- Editing **mood / stress** (remains out)
- Creating missed-day closes via edit UI — **RB-010** stays the missed-close path; do not widen RB-010 into edit-past
- Delete entry / hard wipe
- Capture-time photo attach + paperclip-on-slot as a standalone slice — already **[RB-021](./journal-photos.md)**; this item **reuses** that model for **edit-path** add-photos (do not fork storage)
- Widening RB-016 into calendar/star/edit — keep RB-016 as five-year presentation + capture model

## Dependencies & risks

- **Depends on / extends** RB-016 day page + RB-021 photo infra (`src/lib/photos.ts`, `.data/photos`, `SubtlePhotoPicker` / client photo helpers)
- **Photo storage (Reese):** V1 has **no auth**; persistence is **`.data/db.json`** + photo files on disk/volume. Edit-path “add photos” needs an explicit data-model note: where photo ids hang on the journal/evening record, size limits, and volume growth on Fly — same stack as RB-021, not a second store. Risk if db.json + blobs grow without caps/cleanup.
- Must not trigger evening/reclaim/milestone mutations on edit
- Clear UX fork: **existing** → edit; **missing** → notify + route to RB-010 close (no silent create)
- Star list + calendar markers must stay thin (closed / missing / starred only)

## Notes

- Intake **2026-08-31** founder (Jeremy) locked decisions: edit fields = headline + summary + add photos; existing-only edit; missed → notify/route to close (RB-010); prose-only side effects; no delete; month view → tap day; minimal markers; `/journal` only; star = personal bookmark, no cap; star on calendar + five-year day + starred list; thin slice with all three; star/edit keyed to `YYYY-MM-DD`.
- Rank **6** / **P0** — founder-loved journal tooling; sits **Next after** RB-016 (In Progress) and RB-021 (photos), without stealing RB-016’s slot. Ahead of Gmail / podcast expansion in rank order.
- Related: [RB-016](./five-year-journal-ux.md), [RB-021](./journal-photos.md), [RB-010](./backfill-missed-evening-journal-close.md). Journal **month browse** only — event calendar sync is **[RB-023](./calendar-ical-google.md)** (unrelated).
