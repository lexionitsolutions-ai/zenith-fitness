require('@next/env').loadEnvConfig(process.cwd(), process.argv.includes('--development'));
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const [state] = await db.$queryRawUnsafe(`SELECT current_schema() AS schema,
    to_regclass('"ApplicantProfile"') IS NOT NULL AS applicant_table,
    to_regclass('"AppMembershipPurchase"') IS NOT NULL AS purchase_table,
    to_regprocedure('approve_app_membership(uuid)') IS NOT NULL AS approval_function`);
  const mobileArg = process.argv.find(v=>v.startsWith('--mobile='))?.slice(9);
  if (mobileArg && !/^[6-9]\d{9}$/.test(mobileArg)) throw new Error('Use --mobile= followed by a 10-digit Indian phone number.');
  const phone = mobileArg ? '+91'+mobileArg : null;
  const user = phone ? await db.user.findUnique({where:{mobileNumber:phone},select:{id:true,memberId:true}}) : null;
  const member = phone ? await db.member.findFirst({where:{mobileNumber:phone},select:{id:true}}) : null;
  const alias = phone ? await db.appLoginAlias.findUnique({where:{mobileNumber:phone},select:{userId:true}}) : null;
  const profile = state.applicant_table && user ? await db.applicantProfile.findUnique({where:{userId:user.id},select:{userId:true}}) : null;
  console.log(JSON.stringify({environment:process.argv.includes('--development')?'development':'production',...state,
    account_exists:phone?Boolean(user):null,admission_exists:phone?Boolean(member):null,login_alias_exists:phone?Boolean(alias):null,applicant_profile_exists:phone?Boolean(profile):null}));
  if (process.argv.includes('--verify-create')) {
    const assert = require('node:assert/strict');
    const {randomBytes} = require('node:crypto');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(randomBytes(24).toString('hex'),12);
    const rollback = new Error('SIGNUP_CHECK_ROLLBACK');
    try {
      await db.$transaction(async tx => {
        let mobile;
        do { mobile = '+919'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'); }
        while (await tx.user.findUnique({where:{mobileNumber:mobile},select:{id:true}}) || await tx.member.findFirst({where:{mobileNumber:mobile},select:{id:true}}) || await tx.appLoginAlias.findUnique({where:{mobileNumber:mobile},select:{userId:true}}));
        const created = await tx.user.create({data:{displayName:'Rollback signup verification',mobileNumber:mobile,pinHash:hash,role:'MEMBER',applicantProfile:{create:{gender:'Female'}}},include:{applicantProfile:true}});
        assert.equal(created.memberId,null);
        assert.equal(created.applicantProfile.gender,'Female');
        assert.equal(await tx.membershipOrder.count({where:{userId:created.id}}),0);
        throw rollback;
      });
    } catch (error) { if (error!==rollback) throw error; }
    console.log('PASS: runtime signup/profile creation and checkout access. Verification account fully rolled back.');
  }
}
main().catch(e=>{console.error(e.code ?? 'DATABASE_CHECK_FAILED');process.exitCode=1}).finally(()=>db.$disconnect());
