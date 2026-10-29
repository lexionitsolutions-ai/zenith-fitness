// Exercises the new migration and canonical admission/renewal bridge, then rolls
// back every table, function, counter, member, payment and sync job created here.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('fs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
function statements(sql) {
  const parts = []; let start = 0, single = false, double = false, dollar = false, comment = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], next = sql[i+1];
    if (comment) { if (c === '\n') comment = false; continue; }
    if (!single && !double && !dollar && c === '-' && next === '-') { comment = true; i++; continue; }
    if (!single && !double && c === '$' && next === '$') { dollar = !dollar; i++; continue; }
    if (dollar) continue;
    if (!double && c === "'") { if (single && next === "'") i++; else single = !single; continue; }
    if (!single && c === '"') { if (double && next === '"') i++; else double = !double; continue; }
    if (c === ';' && !single && !double) { parts.push(sql.slice(start, i+1)); start = i+1; }
  }
  if (sql.slice(start).trim()) parts.push(sql.slice(start));
  return parts;
}
async function main() {
  const rollback = new Error('ROLLBACK_SUCCESS');
  try {
    await db.$transaction(async tx => {
      const [state] = await tx.$queryRawUnsafe('SELECT current_schema() AS schema');
      assert.equal(state.schema, 'zenith_app', 'Use the private app schema for this smoke test.');
      const migration = fs.readFileSync('prisma/migrations/20261029010000_membership_checkout/migration.sql','utf8');
      for (const sql of statements(migration)) await tx.$executeRawUnsafe(sql);
      const phone = () => '+919' + String(Math.floor(Math.random()*1e9)).padStart(9,'0');
      const admin = await tx.user.create({data:{mobileNumber:phone(),pinHash:'rollback-only-test',role:'ADMIN',displayName:'Rollback checkout admin'}});
      const user = await tx.user.create({data:{mobileNumber:phone(),pinHash:'rollback-only-test',displayName:'Rollback checkout applicant',applicantProfile:{create:{gender:'Female',address:'Rollback-only test address',birthDate:new Date('1995-01-01')}}}});
      assert.equal(user.memberId, null);
      const order = await tx.membershipOrder.create({data:{userId:user.id,kind:'ADMISSION',planCode:'FEMALE_3',planName:'3 Months · Female',durationMonths:3,price:3999,pointsUsed:0,amountDue:3999,status:'PENDING_REVIEW',utr:String(Date.now()).slice(-12),reportedAmount:3999,reviewedById:admin.id}});
      const [result] = await tx.$queryRaw`SELECT approve_app_membership(${order.id}::uuid) AS id`;
      const approved = await tx.membership.findUniqueOrThrow({where:{id:result.id},include:{member:true}});
      assert.equal(Number(approved.amountPaid),3999);
      assert.equal(Number(approved.pendingAmount),0);
      assert.ok(approved.managementMembershipId);
      assert.ok(approved.member.qrToken);
      assert.match(approved.member.admissionId,/^ZF-\d+$/);
      assert.equal((await tx.user.findUniqueOrThrow({where:{id:user.id}})).memberId,approved.member.id);
      await tx.membershipOrder.update({where:{id:order.id},data:{status:'APPROVED',membershipId:approved.id}});
      const renewal = await tx.membershipOrder.create({data:{userId:user.id,kind:'RENEWAL',planCode:'FEMALE_6',planName:'6 Months · Female',durationMonths:6,price:5699,pointsUsed:500,amountDue:5199,status:'PENDING_REVIEW',utr:String(Number(order.utr)+1),reportedAmount:5199,reviewedById:admin.id}});
      await tx.pointTransaction.create({data:{memberId:approved.member.id,points:500,transactionType:'ADMIN_ADJUSTMENT',description:'Rollback QA balance',businessDate:new Date()}});
      await tx.pointTransaction.create({data:{memberId:approved.member.id,points:-500,transactionType:'ADMIN_ADJUSTMENT',description:'Rollback QA renewal discount',referenceKey:`membership-redemption:${renewal.id}`,businessDate:new Date()}});
      const [renewalResult] = await tx.$queryRaw`SELECT approve_app_membership(${renewal.id}::uuid) AS id`;
      const extended = await tx.membership.findUniqueOrThrow({where:{id:renewalResult.id}});
      assert.equal(Number(extended.discountAmount),500);
      assert.equal(Number(extended.finalAmount),5199);
      assert.equal(Number(extended.pendingAmount),0);
      assert.equal(extended.startDate.getTime(),approved.endDate.getTime()+86400000);
      assert.equal((await tx.pointTransaction.aggregate({where:{memberId:approved.member.id},_sum:{points:true}}))._sum.points,0);
      const [jobs] = await tx.$queryRaw`SELECT count(*)::int AS count FROM public.sync_jobs WHERE payload->>'membership_id'=${extended.managementMembershipId}`;
      assert.ok(jobs.count>=2);
      throw rollback;
    }, {timeout:60000, maxWait:10000});
  } catch (error) {
    if (error !== rollback) throw error;
    console.log('PASS: migration, admission ID/QR allocation, linked account, canonical payment, points discount, renewal dates and sync jobs. All changes rolled back.');
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
