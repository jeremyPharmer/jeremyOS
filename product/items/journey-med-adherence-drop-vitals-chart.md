# Journey: med adherence card + drop vitals chart — Won't Do (superseded)

| Field | Value |
| --- | --- |
| ID | RB-031 |
| Rank | 26 |
| Priority | P1 |
| Status | Won't Do |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

~~On Journey, the Vitals chart adds noise next to the BP/HR log list. Separately, medication adherence as its own Journey card.~~

**Superseded 2026-10-10:** Founder no longer wants Medication adherence tracking. Health tab reshape is owned by **[RB-043](./health-tab-sleep-primary.md)** (sleep primary, drop Conditions, keep vitals data, better vitals viz later).

## Outcome

**Won't Do.** Do **not** ship a Medication adherence card. Vitals **data** stay (RB-028); Health page direction (label, sleep primary, Conditions cut, no med adherence) = **RB-043**.

## Scope (v1) — historical (locked 2026-09-11; superseded)

~~1. Drop the Vitals chart — keep BP/HR list.~~  
~~2. Medication adherence card on Journey from medication Support + SupportCompletion.~~  
~~3–7. % days covered, same-day “took it”, Journey only.~~

Active product instead:

- **No** Medication adherence section ([RB-043](./health-tab-sleep-primary.md))
- Drop historic **Conditions** chart; sleep quality **1–5** primary on **Health**
- Keep BP/HR data; visualize differently from list-only (follow sleep)

## Out of scope / later

N/A — item closed as Won't Do / superseded.

## Dependencies & risks

- Do not implement med-adherence UI “while in Journey/Health”
- Vitals list/chart history still referenced by RB-028 / RB-043

## Notes

- Intake **2026-09-11** — founder Journey ask (med adherence + drop vitals chart).
- **2026-10-10:** Status → **Won't Do**; superseded by [RB-043](./health-tab-sleep-primary.md). Med adherence removed from product direction; Health rename + sleep primary + Conditions drop replace this follow-on.
- Rank **26** (terminal with other closed/later health follow-ons).
