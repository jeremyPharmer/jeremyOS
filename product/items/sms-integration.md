# SMS integration

| Field | Value |
| --- | --- |
| ID | RB-004 |
| Rank | 21 |
| Priority | P2 |
| Status | Backlog |
| Effort | M |
| Target due | TBD |
| Milestone | later |
| Owner | Product |

## Problem

Some recovery/incentive nudges land better as SMS than email. ReBuild currently has no SMS channel for reminders or critical notices.

## Outcome

The product can send SMS to a verified phone number for high-signal notifications (reminders, urgent checklist nudges, etc.), with opt-in controls.

## Scope (v1 of this item)

- Capture / verify phone number with explicit SMS opt-in
- Send transactional SMS via a provider (e.g. Twilio)
- Preference / opt-out handling (STOP, etc.)
- Shared notification content model that can later mirror email digests

## Out of scope / later

- Replacing email digests entirely
- Two-way conversational SMS agent
- Marketing blasts

## Dependencies & risks

- Carrier compliance, A2P / 10DLC registration where required
- Cost per message
- User consent and quiet hours

## Notes

- Added 2026-08-10 as future backlog.
- **2026-08-29 JeremyOS:** rank **15**; **2026-08-29** → rank **18** after RB-017–019. SMS stays Later — founder elevated **email**, not SMS. Do not build for generic-product completeness (RB-013).
- Independent of Venmo (RB-001); only pull forward if Jeremy asks for SMS specifically.
