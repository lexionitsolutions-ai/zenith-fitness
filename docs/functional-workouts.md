# Functional batches

`/workout` has a top switch between Weight Training and Functional Batch (`?mode=weight` / `?mode=functional`). Existing member level selection, daily exercises, and admin weight-training tools remain available. Staff can browse weight-training plans and use functional batches. The old admin workouts URL redirects to the unified workout page.

## Roles

All signed-in active members can view and play saved functional batches. Members have no creation controls, and the API rejects member writes with HTTP 403. Trainers use the existing `STAFF` role; staff and admins can view batches and create them. The server derives the creator from the verified session, not from request data.

The batch builder supports a name, notes, rounds, optional session date/time, ordered exercises, work/rest durations, and optional repetition targets. Reordering and prescriptions are stored with the batch in one database transaction. Saved batches are immediately visible in Functional Batch and survive reloads.

Playback supports individual exercise demos, an ordered circuit, pause/resume of the circuit timer, rest intervals, repeated rounds, next exercise, restart, and completion. Demo videos loop independently for practice. The native video controls can pause or unmute a demo. Closing the player stops its media and timer. Session times are displayed in India time.

## Imported source

The supplied `C:\Users\Raj\Functional Interface\functional-workout` project is an Expo prototype, not a standalone backend database. Its data file lists Jump Squats (`5xv0DKqe5XQ`) and Mountain Climbers (`kLh-uczlPLg`). Those IDs are preserved as provenance. Its card component reads a different field (`youtubeId` rather than `videoId`), so the prototype's embed binding is not copied into the web app.

`src/data/workouts/functional-exercises.json` records the two original entries and the fourteen named bundled MP4 demo files. The videos are copied without modification to `public/workouts/functional/`. The unnamed Clipchamp file is not an exercise entry and is not imported. Functional media is separate from weight-training videos; no weight-training video assignments are changed.

The import creates one `Functional Workout` starter batch with the original two exercises in their original order. The original has no prescribed circuit timing, so the starter uses one round and the builder defaults of 40 seconds work / 20 seconds rest. New trainer-created batches use the trainer's saved settings.

## Database migration

Migration `20261105010000_functional_batches` adds `FunctionalExercise`, `FunctionalBatch`, and `FunctionalBatchExercise` to the private `zenith_app` schema. No existing tables or member data are removed. The tables use UUID references, ordered batch entries, database checks for timing/round bounds, and the existing server-only runtime privilege model.

Run `node scripts/migrate-functional-batches.cjs` to inspect and `node scripts/migrate-functional-batches.cjs --apply` to install and import. The script uses the configured migration `DIRECT_URL`, applies schema creation and import atomically, records migration history when available, and can be rerun without duplicating exercises or overwriting trainer-created batches. Apply this migration before deploying this version to a new database. Prisma client generation is part of the existing production build.

## API

- `GET /api/workout/functional`: signed-in users receive active batches and the active exercise library, with private/no-store response headers.
- `POST /api/workout/functional`: staff/admin only. Validates title, round count, exercise references, timings, optional repetitions, and date/time. Stores the batch and ordered entries atomically.

## Verification

Unit tests cover role restrictions, reference validation, atomic batch creation and order, invalid settings, and timer progression through work/rest/rounds/completion. `node scripts/check-functional-workouts.cjs` runs local browser QA against port 3100 with newly created synthetic staff/admin/member accounts. It uses normal login, verifies trainer creation through the form, admin creation, member read/play access and denied writes, persistence, reordering, both workout tabs, mobile width, all imported media, and circuit completion. It removes only its captured test account IDs and their test-created batches. Reports and screenshots stay in ignored `output/functional-qa/`.

Pass `--origin=https://zenith-fitness-theta.vercel.app` to verify the same flow on the confirmed production app using the configured production database. Live QA also uses only newly created synthetic accounts, with normal login and cleanup of its own fixtures.
