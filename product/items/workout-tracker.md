# Workout tracker

| Field | Value |
| --- | --- |
| ID | RB-018 |
| Rank | 12 |
| Priority | P1 |
| Status | Backlog |
| Effort | M |
| Target due | TBD |
| Milestone | v1.x |
| Owner | Product |

## Problem

Jeremy wants a **workout tracker** in JeremyOS. There is no first-class personal training log — only recovery daily-loop surfaces that are not gym/workout oriented.

## Outcome

Jeremy can log workouts he cares about (what / when / light notes) and see recent history — a personal tool, not a generic fitness SaaS.

## Scope (v1)

- Simple workout log: date, type/label, optional duration or notes
- List recent workouts on a thin personal surface
- Fits JeremyOS build filter: founder asked for it

## Out of scope / later

- Wearable sync, Apple Health / Strava import (separate items if asked)
- Social sharing, coaching plans, AI form analysis
- Replacing external apps Jeremy already loves — start as a personal log

## Dependencies & risks

- Scope creep into full fitness product — keep v1 tiny
- Open: free-text types vs fixed list (default: free-text + a few presets)

## Notes

- Intake **2026-08-29** founder: wants a workout tracker alongside cameras, recipes, Gmail, recovery content.
- Rank **8** — next to [RB-017](./home-cameras-reolink.md) and [RB-019](./favorite-recipes.md) in the personal-OS tools cluster.
