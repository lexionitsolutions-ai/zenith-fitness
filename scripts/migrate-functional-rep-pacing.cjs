require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const statements = require('./sql-statements.cjs');
const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
const migration = '20261105020000_functional_rep_pacing';
async function main() {
  await db.$transaction(async tx => {
    const [state] = await tx.$queryRaw`SELECT current_schema() AS schema,
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='FunctionalBatchExercise' AND column_name='repsPerSecond') AS installed`;
    if (state.schema !== 'zenith_app') throw new Error('Expected private app schema.');
    console.log(JSON.stringify(state));
    if (!process.argv.includes('--apply')) return;
    if (!state.installed) {
      const sql = readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8');
      for (const statement of statements(sql)) await tx.$executeRawUnsafe(statement);
      const [history] = await tx.$queryRaw`SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS available`;
      if (history.available) await tx.$executeRaw`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count)
        VALUES (${randomUUID()},${createHash('sha256').update(sql).digest('hex')},now(),${migration},now(),1)`;
    }
    const video = await tx.functionalExercise.upsert({ where: { slug: 'lakhan-functional-video' }, update: {}, create: {
      slug: 'lakhan-functional-video', name: 'Lakhan Functional Video', youtubeVideoId: 'LBp7ez0VzaI',
      videoUrl: 'https://www.youtube-nocookie.com/embed/LBp7ez0VzaI', videoLayout: 'CENTER_CROP',
    } });
    await tx.functionalBatch.upsert({ where: { sourceKey: 'lakhan-functional-reference' }, update: {}, create: {
      sourceKey: 'lakhan-functional-reference', title: 'Lakhan Functional Session', rounds: 1,
      description: 'Follow the original Zenith trainer video. Reps are paced by your chosen speed; they do not detect body movements.',
      exercises: { create: [{ exerciseId: video.id, sortOrder: 1, workSeconds: 445, restSeconds: 0, repsPerSecond: 0.5 }] },
    } });
    console.log('Added rep pacing and the supplied Lakhan trainer video; existing batches preserved.');
  }, { timeout: 60000 });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
