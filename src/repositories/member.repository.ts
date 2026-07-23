import type {Prisma,PrismaClient} from "@prisma/client";
export const findMember=(db:PrismaClient|Prisma.TransactionClient,admissionId:string)=>db.member.findUnique({where:{admissionId}});
export const upsertMember=(db:PrismaClient|Prisma.TransactionClient,admissionId:string,data:Omit<Prisma.MemberUncheckedCreateInput,"id"|"admissionId"|"createdAt"|"updatedAt">)=>db.member.upsert({where:{admissionId},create:{admissionId,...data},update:Object.fromEntries(Object.entries(data).filter(([,v])=>v!==null&&v!==""))});
