require('@next/env').loadEnvConfig(process.cwd(), process.argv.includes('--development'));
const fs = require('node:fs');
const {createHash,randomUUID} = require('node:crypto');
const {PrismaClient} = require('@prisma/client');
const statements = require('./sql-statements.cjs');
const db = new PrismaClient({datasources:{db:{url:process.env.DIRECT_URL || process.env.DATABASE_URL}}});
async function main() {
  if (!process.argv.includes('--apply')) throw new Error('Pass --apply to install the tested additive checkout migration.');
  await db.$transaction(async tx => {
    const [state] = await tx.$queryRawUnsafe(`SELECT current_schema() AS schema,
      to_regclass('"ApplicantProfile"') IS NOT NULL AS applicant,
      to_regclass('"AppMembershipPurchase"') IS NOT NULL AS purchases,
      to_regprocedure('approve_app_membership(uuid)') IS NOT NULL AS approval`);
    if (state.schema !== 'zenith_app') throw new Error('Expected the private zenith_app schema.');
    if (state.applicant && state.purchases && state.approval) { console.log('Checkout migration already installed.'); return; }
    if (state.applicant || state.purchases || state.approval) throw new Error('Partial checkout schema found. Reconcile it before installing.');
    const name = '20261029010000_membership_checkout';
    const sql = fs.readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8');
    for (const statement of statements(sql)) await tx.$executeRawUnsafe(statement);
    const [history] = await tx.$queryRawUnsafe(`SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS available`);
    if (history.available) {
      const checksum = createHash('sha256').update(sql).digest('hex');
      await tx.$executeRaw`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count)
        SELECT ${randomUUID()},${checksum},now(),${name},now(),1
        WHERE NOT EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name=${name} AND finished_at IS NOT NULL AND rolled_back_at IS NULL)`;
    }
    console.log('Installed checkout tables, approval bridge and runtime grants atomically.');
  },{timeout:60000,maxWait:10000});
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
