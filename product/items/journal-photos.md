# Journal photos (attach + paperclip indicator)

| Field | Value |
| --- | --- |
| ID | RB-021 |
| Rank | 6 |
| Priority | P1 |
| Status | Backlog |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product (build: Reese attach model + UXUI journal/evening) |

## Problem

Journal entries are text-only. Jeremy wants to **add pics to the journal** and see a clear signal (paperclip or similar) on a day/year slot when a photo is attached — so the five-year page shows which entries have media without opening every year.

## Outcome

Optional photo(s) can be attached when writing or closing a journal/evening entry. On the five-year journal day page, any year slot with a photo shows a **paperclip (or equivalent) symbol**; tap opens/views the photo. Reuses the existing celebration photo stack — no new storage system.

## Scope (v1)

- **Attach:** optional photo on journal / evening capture (same picker pattern as milestone Treat/Save celebration photos)
- **Persist:** link photo id(s) on the journal entry (or day record) using existing `.data/photos` + `GET /api/photos/[id]` (`src/lib/photos.ts`, `clientPhoto`, `SubtlePhotoPicker`)
- **Indicate:** on five-year journal year slots (`/journal`), show a paperclip (or similar) when that year’s entry has at least one photo
- **View:** tap indicator (or entry) to view the attached photo
- Thin UX only — one clear affordance, not a media gallery product

## Out of scope / later

- Multi-photo galleries, albums, or carousel polish beyond “one (or a few) attached + view”
- Camera-only / in-app capture flows (library pick is enough for v1 if picker already supports it)
- Editing or deleting photos after attach (unless a thin remove falls out of reuse) — **add photos on edit of existing entries** is **[RB-022](./journal-edit-star-calendar.md)** (reuse this item’s storage model; do not fork)
- Auto-attaching milestone celebration photos into journal slots (may surface later if PRODUCT_DECISIONS already implies Journey/journal day display — do not block this item on that)
- Print/export of photo journals; AI captions
- Five-year layout / headline+summary model — remains **[RB-016](./five-year-journal-ux.md)**
- Month calendar, star bookmark, prose edit of existing entries — **[RB-022](./journal-edit-star-calendar.md)**
- Missed-evening backfill integrity — remains **[RB-010](./backfill-missed-evening-journal-close.md)**

## Dependencies & risks

- **Reuse only:** do not invent a second photo store; extend existing photo infra used by `MilestoneReward`
- Depends on stable journal day slots from RB-016 (shipped slice OK; polish can land in parallel)
- Evening close path (`evening/page.tsx`) + journal page must agree on where photo ids live
- Storage growth on device / Fly volume — keep v1 to small optional attaches
- Accessibility: paperclip needs a text alternative (“has photo”)

## Notes

- Intake **2026-08-30** founder: “Can I add pics to the journal, give me a paperclip or some symbol when it's there.”
- Rank **5** / **P1** — founder-asked enhancement to the five-year journal surface; sits immediately after RB-016 core UX, ahead of Gmail/podcast expansion. Not P0: does not block rebrand, todos, or journal layout finish.
- Build **after** RB-016 day-page is usable (already largely shipped); pull forward when journal is touched — effort **S** because infra exists.
- Related: [RB-016](./five-year-journal-ux.md), [RB-010](./backfill-missed-evening-journal-close.md), [RB-022](./journal-edit-star-calendar.md) (edit-path photos + calendar/star — builds on this infra); code anchors `src/lib/photos.ts`, `src/lib/clientPhoto.ts`, `SubtlePhotoPicker`.
