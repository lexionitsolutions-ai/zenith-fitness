# Workout module

The workout module adds member workout assignments, plan cards, exercises, station mappings, and persistent exercise progress.

## Schema

New Prisma enums: `FitnessGoal`, `WorkoutLevel`, `ExerciseType`, and `AssignmentStatus`.
Video review uses `ExerciseVideoStatus`.

New tables:

- `GymStation` stores centralized station mappings.
- `Exercise` stores exercise metadata, video URLs, instructions, safety notes, equipment type, and optional station relation.
- `ExerciseVideoCandidate` stores possible videos for records that require owner confirmation. Candidate videos are not rendered to members.
- `WorkoutPlan`, `WorkoutPlanDay`, and `WorkoutPlanExercise` store the seeded beginner, intermediate, and advanced cards.
- `MemberWorkoutAssignment` stores the authenticated member user's active or historical plan assignment.
- `MemberExerciseProgress` stores idempotent per-exercise completion progress.

## Goal mapping

Members now choose from these seeded workout cards:

- Beginner: `zenith-beginner`
- Intermediate: `zenith-intermediate`
- Advance: `zenith-advanced`
- Cardiovascular Endurance: `zenith-cardio-endurance`
- BodyWeight Only Workout: `zenith-bodyweight-only`
- Core Variations: `zenith-core-variations`

The original goal mapping remains as a fallback for compatibility, but the member UI sends an explicit workout plan slug.

## Seed structure

Workout seed data lives in `src/lib/workouts/catalog.ts` and is applied by `prisma/seed.ts` using Prisma `upsert` for stations, exercises, plans, days, and day exercises. Exercise slugs are stable and generated from exercise names.

Exercise video data is seeded from `src/data/workouts/exercises.normalized.json`. The seed stores verified YouTube video IDs and derives privacy-enhanced embed and thumbnail URLs server-side. Admin updates must pass through the YouTube parser; arbitrary iframe HTML is not stored or rendered.

Owner-confirmation records keep `youtubeVideoId` empty and save candidates for admin review only:

- DB In-Out
- DB Soccer
- DB Military Jog
- DB Rotation
- Side-to-Side Step
- Stepper Touch Jack
- Floor Touch Jack
- Push-Up Position Toe Touch
- Military Jog
- Heel Touch Run
- Toe Touch Push-Up Position
- Side Knee Tuck
- Kick Out
- Kick Outs
- Kick-Out Compression

## Station mapping

Machine stations are centralized in `stationMapping` and seeded to `GymStation`. Bodyweight, dumbbell, barbell, core, stepper, TRX, and free-weight movements use zone labels rather than numbered stations.

Current physical machine labels:

- Station 01: Abductor/Adductor Machine
- Station 02: Incline Chest Press
- Station 03: Adjustable Bench Press
- Station 04: Assisted Pull Up
- Station 05: Pec Fly
- Station 07: Smith Machine
- Station 08: MFT Machine
- Station 09: Flat Chest Press
- Station 10: Leg Press Machine
- Station 11: Lat Pull Down
- Station 12: Leg Extension + Curl

Station 06 is intentionally unused until another machine is added or the floor numbering is changed.

## Member flow

`/workout` is protected by the existing session cookie. Members without an active assignment see workout cards. Selecting a card creates an active assignment for the authenticated user. Members with an assignment see dashboard stats, day cards, continue-workout links, card replacement, and history.

`/workout/day/[dayNumber]` shows ordered exercises. `/workout/exercise/[exerciseId]` shows video, instructions, station, sets, reps or hold duration, and sticky completion controls. Marking an exercise complete automatically opens the next exercise, or returns to the day page after the final exercise.

## Admin flow

`/admin/workouts` is protected by `requireActiveRole([ADMIN])`. Admins can inspect plans, stations, update exercise video/instruction fields, and assign or replace a member plan.

## API contract

- `GET /api/member/workout`: returns active assignment dashboard data for the authenticated member.
- `POST /api/member/workout`: selects first-time goal.
- `PUT /api/member/workout`: replaces active goal and plan after member confirmation.
- `POST /api/member/workout/progress`: marks or undoes one exercise completion.
- `PATCH /api/member/workout/progress`: updates the current workout day.
- `GET /api/admin/workouts`: returns admin workout console data.
- `POST /api/admin/workouts`: assigns or replaces a member plan.
- `PATCH /api/admin/workouts`: updates exercise metadata.

All writes validate payloads with Zod and derive member identity from the server session for member routes.

## Progress calculation

An exercise is complete only after explicit member action. Completion uses an idempotent `upsert`, so duplicate requests do not create duplicate progress rows. Day completion is calculated from required exercises and completed progress. The current implementation stores alternative groups in the plan data and seeds grouped alternatives; richer per-member alternative switching can be expanded from `MemberExerciseProgress.selected`.

## Production considerations

- Physically label machines using the station list above, or update `stationMapping` before reseeding if the floor layout changes.
- Add approved local or YouTube embed video URLs through admin tools.
- Consider stricter active-membership gating if workout access should differ from the existing dashboard policy.
- Keep advanced plans admin-assigned until a formal progression approval workflow exists.
