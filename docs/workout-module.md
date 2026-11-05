# Workout module

Members choose one of three updated Zenith Fitness cards:

- Level 1 — Foundation (`zenith-level-1-foundation`): two weeks, with mixed workouts A–F on alternating days, trainer-led cardio days, and a rest day each week.
- Level 2 — Strength Builder (`zenith-level-2-strength-builder`): seven-day schedule with single muscle groups, cardio, trainer-selected biceps/triceps emphasis, and nine abs options on days 3 and 6.
- Level 3 — Performance (`zenith-level-3-performance`): seven-day schedule with four paired-muscle sessions, recovery, optional cardio/mobility, and rest.

## Source and prescriptions

`src/data/workouts/zenith-cards.ts` preserves the supplied `Workout Cards Zenith/src/data.js` content. `src/lib/workouts/catalog.ts` converts it into ordered plans, schedule days, exercise libraries, variations, and trainer notes. Exercise names and variations follow the source. Sets, repetitions, weights, session duration, and cardio are trainer-guided; the app does not invent values. Intermediate and advanced exercises are available options; trainers select the exercises to perform. Completion controls record individual exercises explicitly marked by members.

## Updating the connected database

Run `node_modules/.bin/tsx scripts/sync-workout-cards.ts` to inspect the replacement and `node_modules/.bin/tsx scripts/sync-workout-cards.ts --apply` to apply it. The update is atomic and touches only workout records. A local reference copy of previous cards, assignments, and progress is saved under `output/workout-cards/` before applying.

The old six cards are archived (`active=false`) and removed from member selection, active workout views, workout history, and the admin card list. Their active assignments are marked `REPLACED`; stored assignments and progress are retained. Members choose a new level after replacement. Legacy exercise records are inactive when unused by an active plan.

`prisma/seed.ts` reuses the same workout sync alongside its existing account/membership seeding. Use the focused sync script for workout-only updates.

## Videos

New cards use separate exercise identities prefixed `zenith-cards-` with no video attached. The seed no longer imports the old video dataset, and the service no longer falls back to seeded videos. The member exercise view displays a player only when a verified video has been added. Admin video editing remains available for the owner to add videos later. Rerunning the sync preserves videos subsequently added by the owner.

## Stations and member flow

Existing station mappings remain centralized in `stationMapping`. Members can choose or replace a level, open schedule days, view ordered exercise options and trainer notes, and explicitly mark exercises complete. Cardio, recovery, and rest days display their supplied guidance without fabricated exercises or completion targets.

Admin workout tools manage exercises, video metadata, card exercise entries, and member assignments. Member API writes derive identity from the authenticated session and validate payloads with Zod.
