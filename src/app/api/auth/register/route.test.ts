import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ appLoginAlias:{findUnique:vi.fn()}, member:{findFirst:vi.fn()}, user:{create:vi.fn()} }));
const transaction = vi.hoisted(() => vi.fn());
const hashPassword = vi.hoisted(() => vi.fn());
vi.mock("@/lib/database/prisma", () => ({prisma:{$transaction:transaction}}));
vi.mock("bcryptjs", () => ({default:{hash:hashPassword}}));
vi.mock("@/lib/auth/session", () => ({createSession:vi.fn()}));
import { createSession } from "@/lib/auth/session";
import { POST } from "./route";
import { Prisma } from "@prisma/client";
const body = {name:"New Applicant",mobile:"9876500001",gender:"Female",password:"ExamplePass123",confirmPassword:"ExamplePass123"};
const req = (value: object) => new Request("http://localhost/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(value)});
beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
  hashPassword.mockResolvedValue("hashed-password");
  db.appLoginAlias.findUnique.mockResolvedValue(null); db.member.findFirst.mockResolvedValue(null);
  db.user.create.mockResolvedValue({id:"user",memberId:null,role:"MEMBER"});
});
describe("public member registration", () => {
  it("rejects mismatched passwords before touching the database", async () => {
    expect((await POST(req({...body,confirmPassword:"different"}))).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("creates an app account and applicant profile without creating a gym member", async () => {
    expect((await POST(req(body))).status).toBe(201);
    expect(db.user.create).toHaveBeenCalledWith({data:expect.objectContaining({displayName:"New Applicant",mobileNumber:"+919876500001",pinHash:"hashed-password",applicantProfile:{create:{gender:"Female"}}})});
    const data = db.user.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("member"); expect(data).not.toHaveProperty("memberId");
    expect(createSession).toHaveBeenCalledWith({userId:"user",memberId:null,role:"MEMBER",onboardingRequired:false});
  });
  it("does not let a new signup claim an existing admission phone", async () => {
    db.member.findFirst.mockResolvedValue({id:"existing-member"});
    expect((await POST(req(body))).status).toBe(409);
    expect(db.user.create).not.toHaveBeenCalled(); expect(createSession).not.toHaveBeenCalled();
  });
  it("returns a useful availability message if required signup tables are missing", async () => {
    transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Missing table",{code:"P2021",clientVersion:"6"}));
    const response = await POST(req(body));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({error:{code:"REGISTRATION_UNAVAILABLE"}});
  });
});
