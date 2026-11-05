# Functional batches

`/workout` has a top switch between Weight Training and Functional Batch (`?mode=weight` / `?mode=functional`). Existing member level selection, daily exercises, and admin weight-training tools remain available. Staff can browse weight-training plans and use functional batches. The old admin workouts URL redirects to the unified workout page.

## Roles

All signed-in active members can view and play saved functional batches. Members have no creation controls, and the API rejects member writes with HTTP 403. Trainers use the existing `STAFF` role; staff and admins can view batches and create them. The server derives the creator from the verified session, not from request data.

The batch builder supports a name, notes, rounds, optional session date/time, ordered exercises, work/rest durations, optional repetition targets, and reps per second per exercise (0.1–5, default 0.5). Reordering and prescriptions are stored with the batch in one database transaction. Saved batches are immediately visible in Functional Batch and survive reloads.

The mobile view follows the supplied prototype's vertically stacked video cards, with inline videos and a portrait workout player. The player shows the supplied footage, round, remaining time, and a large paced rep counter. Playback supports an ordered circuit, pause/resume of both media and timer, rest intervals, repeated rounds, next exercise, restart, and completion. Closing the player stops its media and timer. Session times are displayed in India time.

Rep counts advance from real elapsed time at the selected reps per second; this is a pace guide, not camera-based body-movement detection. A saved rep target determines exercise duration (`repetitions / repsPerSecond`); without a rep target, the saved work duration determines completion. Reps do not advance during rest or pause. Session pace can be adjusted without losing counted reps or changing the trainer's saved batch. The counter resets for each exercise and round.

Work time and reps also wait for the video's actual playback state: loading/buffering never consumes reps. Native `playing`/`waiting` events and the YouTube IFrame player's playback events control readiness. Rest intervals continue while the video is paused. A video-save confirmation appears as soon as creation succeeds; a later library-refresh problem shows a refresh instruction without claiming the save failed.

Staff/admins can use **Add video** to save a YouTube link or hosted HTTPS MP4 link, optionally with start/end times to create an exercise clip. Portrait footage embedded with black sidebars can be center-cropped. Saved video entries appear in the batch builder's exercise library. This saves playable links and clip settings; it does not re-encode or export new MP4 files. The supplied Expo folder has no batch-creation, video-generation, or export implementation.

## Imported source

The supplied `C:\Users\Raj\Functional Interface\functional-workout` project is an Expo prototype, not a standalone backend database. Its data file lists Jump Squats (`5xv0DKqe5XQ`) and Mountain Climbers (`kLh-uczlPLg`). Those IDs are preserved as provenance. Its card component reads a different field (`youtubeId` rather than `videoId`), so the prototype's embed binding is not copied into the web app.

`src/data/workouts/functional-exercises.json` records the two original entries and the fourteen named bundled MP4 demo files. The videos are copied without modification to `public/workouts/functional/`. The unnamed Clipchamp file is not an exercise entry and is not imported. Functional media is separate from weight-training videos; no weight-training video assignments are changed.

The import creates one `Functional Workout` starter batch with the original two exercises in their original order. The original has no prescribed circuit timing, so the starter uses one round and the builder defaults of 40 seconds work / 20 seconds rest. New trainer-created batches use the trainer's saved settings.

The user-approved YouTube reference `LBp7ez0VzaI` is also available as **Lakhan Functional Video** in the library and **Lakhan Functional Session** in batches. Its trainer footage uses portrait framing inside the original landscape encoding; center-cropping removes the embedded black sidebars. It is embedded from YouTube, without downloading or modifying its source media.

## Database migration

Migration `20261105010000_functional_batches` adds `FunctionalExercise`, `FunctionalBatch`, and `FunctionalBatchExercise` to the private `zenith_app` schema. No existing tables or member data are removed. The tables use UUID references, ordered batch entries, database checks for timing/round bounds, and the existing server-only runtime privilege model.

Run `node scripts/migrate-functional-batches.cjs` to inspect and `node scripts/migrate-functional-batches.cjs --apply` to install and import. The script uses the configured migration `DIRECT_URL`, applies schema creation and import atomically, records migration history when available, and can be rerun without duplicating exercises or overwriting trainer-created batches. Apply this migration before deploying this version to a new database. Prisma client generation is part of the existing production build.

Then run `node scripts/migrate-functional-rep-pacing.cjs --apply` for migration `20261105020000_functional_rep_pacing`. It adds saved rep speed and video clip/framing fields and imports the Lakhan reference once. Existing videos and batch settings are preserved, with rep speed defaulting to 0.5.

## API

- `GET /api/workout/functional`: signed-in users receive active batches and the active exercise library, with private/no-store response headers.
- `POST /api/workout/functional`: staff/admin only. Validates title, round count, exercise references, timings, optional repetitions, and date/time. Stores the batch and ordered entries atomically.
- `POST /api/workout/functional/videos`: staff/admin only. Validates video names, YouTube/MP4 sources, clip boundaries, and framing. Saves a playable exercise video entry.

## Verification

Unit tests cover role restrictions, reference validation, atomic batch creation and order, invalid settings, and timer progression through work/rest/rounds/completion. `node scripts/check-functional-workouts.cjs` runs local browser QA against port 3100 with newly created synthetic staff/admin/member accounts. It uses normal login, verifies trainer creation through the form, admin creation, member read/play access and denied writes, persistence, reordering, both workout tabs, mobile width, all imported media, and circuit completion. It removes only its captured test account IDs and their test-created batches. Reports and screenshots stay in ignored `output/functional-qa/`.

Rep tests cover fractional elapsed time, saved speeds, target completion, pause, pace changes without count loss, and rest without counting. Browser QA also creates a trainer video clip, verifies its persisted range/framing, confirms member video creation is denied, verifies portrait video playback and changing the live pace, and actually plays/pauses the linked Lakhan video. Its temporary video entries are removed by exact captured IDs after fixture batches are removed.

Pass `--origin=https://zenith-fitness-theta.vercel.app` to verify the same flow on the confirmed production app using the configured production database. Live QA also uses only newly created synthetic accounts, with normal login and cleanup of its own fixtures.
