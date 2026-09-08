# Task groups + colors & calendar M/D labels

| Field | Value |
| --- | --- |
| ID | RB-026 |
| Rank | 4 |
| Priority | P0 |
| Status | In Progress |
| Effort | M |
| Target due | TBD |
| Milestone | v1 |
| Owner | Product |

## Problem

Home calendar dates and task/event organization are under-specified for daily use: calendar chips need a clear M/D format, and tasks/events need fixed colored groups so Jeremy can scan by life area without inventing a tagging system. Completed work also needs a durable home on the Tasks page without cluttering Home.

## Outcome

One first ship: Home calendar shows **M/D** date labels; tasks and calendar events carry a **mandatory fixed group** with a left color bar; Home stays a flat open-only list; the Tasks (Open Tasks) page groups open items and keeps completed items forever under collapsed per-category chevrons.

## Scope (v1) — locked 2026-09-08

**Ship together (one first ship)**

- Calendar M/D labels (Home calendar only)
- Task / event groups + colors (left vertical bar)
- Tasks-page completed sections with collapsed chevrons

Do not split into separate releases.

### Calendar date labels (Home calendar only)

- Format **M/D** (e.g. `9/7`) — **no leading zeros**
- **Single-day view:** keep **Today** / **Tomorrow** text (do not replace with M/D)
- **Tasks day strip:** unchanged (counts only)
- **Calendar events:** same four groups/colors as tasks, but remain **one chronological list** (no group section headers); color via **left vertical bar** only

### Task groups (v1 fixed)

| Group | Color |
| --- | --- |
| Real estate | red |
| Family | yellow |
| Home | blue |
| Work | green |

- **One group per task**; group is **mandatory** (no Ungrouped)
- Group can be **changed later on edit**
- **New task** and **new calendar event:** mandatory group before save
- **Existing tasks:** founder assigns once when opening/editing them (assign-on-edit)
- **Left vertical color bar** on rows (Home, Tasks, calendar event rows)

### Home

- **Tasks card:** same **group headers** + color swatch as Tasks page (Real estate → Family → Home → Work); **hide empty groups**
- Within group: sort by due date; **No date** bucket for undated items
- **Start the day** and **Close the day** live under the **Home** group (when open)
- **Weekly supports suppressed** on Home for now (founder will add as recurrent tasks; would otherwise sit under Home)
- Day chips stay **counts-only** (no group breakdown)
- **Completed tasks NEVER on Home** — disappear from Home when done
- Left color bar still on personal task rows
- Contained entirely inside the Home Tasks card

### Tasks page (Open Tasks)

- **Open items:** group headers + sorted by due date within group; tasks with **no due date** sit in a **No date** bucket **within** that group
- **Group order:** Real estate → Family → Home → Work
- **Hide empty group headers**
- **Completed:** under each category header, **collapsed chevron**; expand shows items with done date **M/D/YY**; **retain forever**
- No completed on Home (same rule as Home section)

### Calendar → group (Settings)

- In **Settings**, each connected calendar feed (Apple / Work / Google / extra) can be **assigned a default group**
- Events from that calendar inherit the group color on the chronological Home agenda
- Imported events without an override: assign group on **first open/edit** (override), or inherit feed default from Settings

## Out of scope / later

- Adding / renaming / deleting groups (v2 later)
- Segmenting calendar into group sections (stay one chronological list in v1)
- Changing the four locked colors/names in v1
- Ungrouped / optional group
- Showing completed tasks on Home
- Weekly supports on Home Tasks card (suppressed; may return under Home later)

## Dependencies & risks

- Extends **RB-014** (to-do lists) data model + Home / Tasks UI; coordinate with todo create/edit flows
- Calendar event create/edit must require group before save (same four groups); Home agenda stays chronological
- Existing tasks need **assign-on-edit** path so nothing is silent-Ungrouped
- Types + persistence migration risk if tasks/events lack a group field today
- Passes [RB-013](./personal-os-north-star.md): founder-locked EA daily UX, not generic product polish

## Notes

- Intake **2026-09-08** founder lock: calendar M/D + fixed task/event groups/colors + Tasks completed chevrons; ship all together; Status **In Progress** (build started).
- Also locked: undated tasks under **No date** within group; Settings calendar→group defaults; assign imported event group on first open/edit.
- **2026-09-08 Home grouping:** Tasks card matches Tasks-page group headers; Start/Close under Home; supports suppressed; no completed on Home.
- Rank **4** (P0): founder asked for this now; sits immediately after RB-014 todos foundation; ahead of journal/email/puzzle queue for next build slice.
- Effort **M**: types + Home flat list color bars + Tasks grouped open/completed UX + calendar M/D + create flows mandating group + assign-on-edit for existing — invasive across surfaces but fixed groups (no group CRUD).
