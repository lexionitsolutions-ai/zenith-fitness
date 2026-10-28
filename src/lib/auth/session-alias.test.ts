import { describe, it, expect } from "vitest";
import { resolveSessionAlias } from "./session-alias";
describe("production identity compatibility", () => {
 const session={userId:"earlier-id",memberId:"earlier-member",role:"MEMBER" as const};
 const alias={previousMemberId:"earlier-member",user:{id:"preserved-live-id",memberId:"preserved-live-member",role:"MEMBER" as const,isActive:true}};
 it("keeps existing production sessions when no mapping is needed",()=>expect(resolveSessionAlias(session,null)).toEqual(session));
 it("maps an interim session without signing it out",()=>expect(resolveSessionAlias(session,alias)).toMatchObject({userId:"preserved-live-id",memberId:"preserved-live-member"}));
 it("rejects a mapping for another member",()=>expect(resolveSessionAlias({...session,memberId:"wrong"},alias)).toBeNull());
 it("does not bypass inactive accounts or role changes",()=>{
  expect(resolveSessionAlias(session,{...alias,user:{...alias.user,isActive:false}})).toBeNull();
  expect(resolveSessionAlias({...session,role:"ADMIN"},alias)).toBeNull();
 });
});
