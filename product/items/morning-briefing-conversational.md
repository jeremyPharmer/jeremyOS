# Conversational morning briefing (calendar-first)

| Field | Value |
| --- | --- |
| ID | RB-029 |
| Rank | 5 |
| Priority | P0 |
| Status | Ready |
| Effort | S |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

RB-027 shipped a rules-based day-start briefing, but the live surface reads as a **rigid labeled dashboard** (YOU / WEATHER / CALENDAR / TASKS / OPEN TIME / TRY HERE). Founder feedback (2026-09-11): does **not** like the look; wants **calendar + when to do other tasks** prioritized; surface should feel **interesting / conversational** — not a wall of section labels.

## Outcome

After morning check-in, Jeremy gets a **conversational day-start briefing** that leads with **what’s on the calendar** and **when open windows are** for other work (“Try here”), with weather/feeling present but not dominating. Still rules-based v1 (tone/layout, not LLM). Intention + 1–10 check-in unchanged. **No** return to an interactive Today’s Items checklist on morning.

## Scope (v1) — locked 2026-09-11

**Surface & tone**

- Replace rigid labeled multi-board / dashboard layout with a **conversational briefing** (prose-led; section headers optional and light)
- Interesting to read; assistant-like orientation for the day — **not** a recovery checklist aesthetic
- **Rules-based / templated** copy composition only (same generation model as RB-027) — conversational *tone and layout*, **not** an LLM requirement

**Content priority (layout)**

1. **Calendar first** — today’s events / highlights as the primary orientation
2. **Open windows + when to do other tasks** — free-time gaps and “Try here” suggestions for snoozed / deferred / open tasks into those windows (co-primary with calendar)
3. **Weather / feeling** — may stay in the briefing but **must not dominate** layout (secondary; short line or light mention)
4. Quote / intention can remain if they support the conversational flow without stealing hierarchy from calendar + open time

**Unchanged (do not regress)**

- Morning **intention** stays (“one thing to do well”)
- Check-in **1–10 scales** unchanged (sleep hours, sleep quality, mood, energy, stress; tap-a-number)
- **No** interactive **Today’s Items** checklist on morning — tasks stay on Home
- Keep **ship-and-iterate** posture; thin layout/copy pass over a new architecture

## Out of scope / later

- LLM / generative briefing (still later; after this rules-based conversational pass)
- Reintroducing morning Items checklist / interactive task UI
- Changing check-in metrics, scales, or intention capture
- Evening ritual redesign
- Broad task/calendar product work (RB-014 / RB-026)

## Dependencies & risks

- **Parent ship:** [RB-027](./morning-day-start-briefing.md) Done — this is the first live iterate on the briefing surface
- **Calendar + gaps:** RB-023 Done; late-evening agenda extend may already be elsewhere — gap/Try-here logic should use real open windows
- **UX risk:** “conversational” without LLM can look like a wall of template paragraphs — bias to short, scannable prose with calendar/open-time hierarchy, not five equal labeled cards
- Eng may already be on a morning polish branch (`cursor/morning-scale-polish-d317` or similar) — include this scope there **or** land from this product branch; do not fork a second checklist

## Notes

- Intake / lock: **2026-09-11** founder follow-up on shipped RB-027 screenshot (labeled YOU / WEATHER / CALENDAR / TASKS / OPEN TIME / TRY HERE board).
- Why rank **5 / P0:** same elevated morning ritual as RB-027; replaces Done RB-027 in the active Now slot so the iterate ships before lower personal-tool work.
- Effort **S:** layout + copy priority rewrite on existing rules-based briefing; not a new morning system.
- Related: eng morning check-in polish (scales / preselect) is adjacent chrome — do not conflate with this briefing hierarchy change.
