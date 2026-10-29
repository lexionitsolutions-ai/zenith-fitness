// Read-only startup checks. Never selects passwords, phone numbers or health data.
if (process.argv.includes('--concurrent')) process.env.NODE_ENV='production';
require('@next/env').loadEnvConfig(process.cwd());
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const names=process.argv.filter(arg=>arg.startsWith('--name=')).map(arg=>arg.slice(7));
  if(!names.length)throw new Error('Pass --name=FullName to run targeted read-only startup checks.');
  const members=await db.member.findMany({
    where:{OR:names.map(name=>({fullName:{equals:name,mode:'insensitive'}}))},
    select:{id:true,fullName:true,managementMemberId:true,birthDate:true,
      user:{select:{id:true,isActive:true,role:true,mustChangePassword:true,failedLoginCount:true,lockedUntil:true,lastLoginAt:true,_count:{select:{sessionAliases:true,loginAliases:true}}}},
      memberships:{select:{startDate:true,endDate:true,membershipStatus:true,managementMembershipId:true}},
    },
  });
  if(members.length!==names.length)throw new Error('Some names did not resolve uniquely. Check the spelling before continuing.');
  for(const member of members) {
    const user=member.user;
    const aliases=user ? await db.appSessionAlias.findMany({where:{userId:user.id},select:{previousMemberId:true}}) : [];
    const targets=await db.memberFitnessTarget.count({where:{memberId:member.id,status:'ACTIVE'}});
    require('tsx/cjs');
    const {getDashboard}=require('../src/services/dashboard.service.ts');
    const started=Date.now();
    let render;
    try { const dashboard=await getDashboard(member.id); render={ok:true,milliseconds:Date.now()-started,bmiReminderDue:Boolean(dashboard.fitnessTarget.target?.bmiDue),warnings:dashboard.dataWarnings.length}; }
    catch(error) {render={ok:false,code:error.code??error.name};}
    console.log(JSON.stringify({name:member.fullName,dashboard:render,linkedToManagement:Boolean(member.managementMemberId),hasBirthDate:Boolean(member.birthDate),hasAccount:Boolean(user),
      active:user?.isActive,role:user?.role,passwordChangeRequired:user?.mustChangePassword,locked:Boolean(user?.lockedUntil&&user.lockedUntil>new Date()),lastLogin:user?.lastLoginAt,
      previousSessionAliases:aliases.length,activeTargets:targets,membershipPeriods:member.memberships.length,
      canonicalPeriods:member.memberships.filter(p=>p.managementMembershipId).length,invalidDatePeriods:member.memberships.filter(p=>p.startDate&&p.endDate&&p.startDate>p.endDate).length}));
  }
  const [health]=await db.$queryRawUnsafe(`SELECT to_regclass('"AppSessionAlias"') IS NOT NULL AS session_alias_table,to_regclass('"ApplicantProfile"') IS NOT NULL AS signup_table`);
  console.log(JSON.stringify({databaseHealth:health}));
  if(process.argv.includes('--concurrent')) {
    require('tsx/cjs');
    const {getDashboard}=require('../src/services/dashboard.service.ts');
    const {getMemberPoints}=require('../src/services/points.service.ts');
    const started=Date.now();
    const results=await Promise.allSettled(members.flatMap(member=>[getDashboard(member.id),getMemberPoints(member.id)]));
    const failures=results.filter(result=>result.status==='rejected');
    console.log(JSON.stringify({concurrentStartupReads:results.length,successful:results.length-failures.length,milliseconds:Date.now()-started,errors:failures.map(result=>result.reason.code??result.reason.name)}));
    if(failures.length)process.exitCode=1;
    const {prisma}=require('../src/lib/database/prisma.ts');await prisma.$disconnect();
  }
}
main().catch(error=>{console.error(error.code??'STARTUP_CHECK_FAILED');process.exitCode=1}).finally(()=>db.$disconnect());
