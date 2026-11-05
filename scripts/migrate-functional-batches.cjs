// Additive migration and idempotent import of the supplied functional app data.
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const { readFileSync, existsSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const statements = require('./sql-statements.cjs');
const exercises = require('../src/data/workouts/functional-exercises.json');
const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
const migration = '20261105010000_functional_batches';
async function main() {
  for (const item of exercises) {
    if (!existsSync(`public/workouts/functional/${item.file}`)) throw new Error(`Missing supplied media: ${item.file}`);
  }
  const [state] = await db.$queryRaw`SELECT current_schema() AS schema,
    to_regclass('"FunctionalExercise"') IS NOT NULL AS exercises,
    to_regclass('"FunctionalBatch"') IS NOT NULL AS batches,
    to_regclass('"FunctionalBatchExercise"') IS NOT NULL AS items`;
  if (state.schema !== 'zenith_app') throw new Error('Expected the app database schema zenith_app.');
  console.log(JSON.stringify({ schema: state.schema, installed: state.exercises && state.batches && state.items, importExercises: exercises.length }));
  if (!process.argv.includes('--apply')) return;
  await db.$transaction(async tx => {
    if (!(state.exercises && state.batches && state.items)) {
      if (state.exercises || state.batches || state.items) throw new Error('Partial functional schema found; reconcile before applying.');
      const sql = readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8');
      for (const statement of statements(sql)) await tx.$executeRawUnsafe(statement);
      const [history] = await tx.$queryRaw`SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS available`;
      if (history.available) await tx.$executeRaw`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count)
        VALUES (${randomUUID()},${createHash('sha256').update(sql).digest('hex')},now(),${migration},now(),1)`;
    }
    const imported = new Map();
    for (const item of exercises) {
      const data = { name: item.name, videoUrl: `/workouts/functional/${item.file}`, youtubeVideoId: item.youtubeVideoId };
      const exercise = await tx.functionalExercise.upsert({ where: { slug: item.slug }, create: { slug: item.slug, ...data }, update: {} });
      imported.set(item.slug, exercise.id);
    }
    // The source has two listed exercises, not an existing batch database. Preserve
    // that order in one starter batch. Timings are defaults trainers can set on new batches.
    await tx.functionalBatch.upsert({ where: { sourceKey: 'functional-interface-original' }, update: {}, create: {
      sourceKey: 'functional-interface-original', title: 'Functional Workout', rounds: 1,
      description: 'Jump Squats and Mountain Climbers from the original functional workout card. Follow your trainer for intensity and modifications.',
      exercises: { create: ['jump-squats', 'mountain-climbers'].map((slug, index) => ({
        exerciseId: imported.get(slug), sortOrder: index + 1, workSeconds: 40, restSeconds: 20,
      })) },
    } });
  }, { timeout: 60000, maxWait: 10000 });
  console.log(JSON.stringify({ exercises: await db.functionalExercise.count(), batches: await db.functionalBatch.count(),
    batchExercises: await db.functionalBatchExercise.count() }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
