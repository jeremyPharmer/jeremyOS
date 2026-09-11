# Email integration

| Field | Value |
| --- | --- |
| ID | RB-002 |
| Rank | 10 |
| Priority | P0 |
| Status | Backlog |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

JeremyOS needs a reliable email channel for skills Jeremy actually wants (reminders, digests, account notices) — especially **his Gmail**. Without it, daily open-checklist email (RB-003) and forgot-password delivery stay blocked. Founder **likes email skills** and said **“My Gmail obviously”** — elevate under the personal-OS pivot; do not invent a separate Gmail mega-item.

## Outcome

JeremyOS can send transactional and product emails to Jeremy’s authenticated address (Gmail as the obvious personal destination), with deliverability basics and preference controls. Later slices may deepen Gmail-side skills if he asks — still this ID.

## Scope (v1 of this item)

- Capture / verify user email (Jeremy’s Gmail as the primary personal address)
- Send transactional emails via a provider
- Basic templates and unsubscribe / preference hook
- Enough surface area to power RB-003 (daily open-checklist email)

## Out of scope / later

- Marketing campaigns / drip sequences
- Rich HTML design system polish beyond usable templates
- SMS (see RB-004)
- Full Gmail inbox client / sync product (unless Jeremy asks — then extend this item, don’t fork a duplicate)

## Dependencies & risks

- Provider choice (SendGrid, SES, Resend, etc.)
- Deliverability and spam compliance
- Required before RB-003 can go live
- Open: send-only transactional vs later Gmail read/skills (OAuth) — v1 stays send/transactional unless spike says otherwise

## Notes

- Added 2026-08-10 as future backlog; renumbered when RB-005 / RB-007 shifted ranks; **2026-08-18** shifted when RB-009 inserted; **2026-08-21** rank **8** when RB-011 took rank 2.
- Platform enabler for daily end-of-day checklist email (RB-003) and **forgot-password delivery** for RB-007.
- **2026-08-29 JeremyOS pivot:** elevated to rank **5** / **P0** (was 4; bumped when RB-016 entered). Founder likes email skills; personal OS ships what Jeremy will use — ahead of money-rail and generic recovery polish.
- **2026-08-29 personal tools intake:** founder “My Gmail obviously” — fold into this item (no duplicate Gmail ID). Rank **5**.
- **2026-09-01:** Calendar / iCal / Google Calendar is **[RB-023](./calendar-ical-google.md)** — do **not** overload this email item. Stub comments that cite “RB-002 / calendar” are wrong.
