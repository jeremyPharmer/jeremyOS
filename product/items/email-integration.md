# Email / Gmail inbox centralization

| Field | Value |
| --- | --- |
| ID | RB-002 |
| Rank | 7 |
| Priority | P0 |
| Status | Ready |
| Effort | L |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

JeremyOS is supposed to be Jeremy’s executive assistant / personal OS, but email still lives only in Gmail. Founder asked to **connect Gmail inbox now** so email can be **centralized in JeremyOS** — “it’s time.” Without inbox read, EA surfaces (Home / briefing / later digests) cannot see what needs attention. Outbound transactional send (forgot-password, RB-003 open-checklist digest) remains blocked until a send path exists; that is a **follow-on slice of this same ID**, not a separate mega-item.

## Outcome

Jeremy connects **his Gmail** once in Settings; JeremyOS shows a thin **centralized inbox** (recent / unread + read a message) so he can triage email inside the personal OS without opening Gmail first. Later slices on this ID may add outbound send + digests.

## Scope (v1) — inbox connect + centralize

**Locked 2026-09-15 (founder: “connect to Gmail inbox now… centralize email… it’s time”):**

- **Google OAuth connect Gmail** in Settings (connect / disconnect / reconnect) — reuse patterns from shipped [RB-023](./calendar-ical-google.md) Calendar OAuth; **do not** overload calendar scopes or IDs
- **Single account:** Jeremy’s primary Gmail (`jeremyrschrader@gmail.com` / authenticated profile email)
- **Read-only inbox surface:** list recent messages (from, subject, date, snippet); filter or default bias toward **unread / recent**
- **Message read view:** open one message (headers + body text/HTML sanitized); deep-link or “open in Gmail” OK as escape hatch
- **Honest connection state:** Settings + inbox empty/error states when not connected / token expired
- **Token handling:** store refresh tokens like calendar OAuth; treat Gmail scopes as sensitive; no casual logging of message bodies

## Out of scope / later (same ID or follow-ons)

- Full Gmail client: compose, reply, forward, labels, archive, star, snooze, advanced search
- Multi-mailbox / non-Gmail IMAP
- AI triage, smart folders, auto-categorize
- Replacing Gmail web/app entirely
- **Outbound transactional send** (provider or Gmail API send) — **phase 1b** on this ID after inbox v1; unblocks forgot-password delivery + [RB-003](./daily-open-checklist-email.md)
- Marketing / drip campaigns
- SMS ([RB-004](./sms-integration.md))
- Calendar (already [RB-023](./calendar-ical-google.md) Done) — email ≠ calendar

## Dependencies & risks

- **OAuth / security sequencing (blocks careless “just ship”):**
  - Needs Google Cloud OAuth client with **Gmail scopes** (prefer `gmail.readonly` for v1; escalate only if a later slice requires send/modify)
  - Gmail scopes are **restricted / sensitive** — consent screen, verification, and prod redirect URIs may gate real use; spike auth before promising a due date
  - Reuse RB-023 Google OAuth plumbing where possible, but **separate Gmail grant** (calendar.readonly ≠ mail access)
  - Token refresh, revoke on disconnect, and Fly secrets / encrypted-at-rest expectations — `db.json` alone is a weak home for refresh tokens
- Depends on existing auth (RB-007 Done) — connect is per signed-in user
- RB-003 and forgot-password delivery wait on **send** slice (phase 1b), not on inbox list alone
- Effort **L**: OAuth + API + inbox UI + security hygiene (larger than calendar ICS agenda)

## Implementation sequencing (product)

| Step | When |
| --- | --- |
| Scope lock + Ready | **Now** (this intake) |
| Full eng implementation | **Do not start full inbox ship while displacing In Progress** RB-026 / RB-033 / RB-016 / RB-022 mid-flight |
| Allowed early | Auth/OAuth **spike** + Google Cloud consent setup in a free eng lane (no UI commitment until Ready work starts) |
| Start build | Next major EA slice after current task/journal In Progress finishes, **or** parallel free lane once spike clears restricted-scope risk |

## Notes

- Added 2026-08-10 as future backlog; renumbered when RB-005 / RB-007 shifted ranks; **2026-08-18** shifted when RB-009 inserted; **2026-08-21** rank **8** when RB-011 took rank 2.
- Platform enabler for daily end-of-day checklist email (RB-003) and **forgot-password delivery** for RB-007 — via **phase 1b send**, not inbox-only.
- **2026-08-29 JeremyOS pivot:** elevated to rank **5** / **P0** (was 4; bumped when RB-016 entered). Founder likes email skills; personal OS ships what Jeremy will use — ahead of money-rail and generic recovery polish.
- **2026-08-29 personal tools intake:** founder “My Gmail obviously” — fold into this item (no duplicate Gmail ID). Rank **5**.
- **2026-09-01:** Calendar / iCal / Google Calendar is **[RB-023](./calendar-ical-google.md)** — do **not** overload this email item. Stub comments that cite “RB-002 / calendar” are wrong.
- **2026-09-15 founder intake:** “Can you connect to Gmail inbox now so we can centralize email now, it’s time.” **Scope pivot:** v1 is **inbox OAuth + centralized read**, not send-only transactional. Status → **Ready**; rank → **6** / **P0**; effort → **L**. Passes [RB-013](./personal-os-north-star.md) build filter (Jeremy asked; EA north star elevate). Do **not** fork a duplicate Gmail ID. Full implementation stays sequenced after mid-flight task/journal work; OAuth spike OK early.
