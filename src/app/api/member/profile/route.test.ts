import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/database/prisma";
import { getSession } from "@/lib/auth/session";

vi.mock("@/lib/database/prisma", () => ({ prisma: { member: { update: vi.fn() } } }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));

const request = (body: object) => new Request("http://localhost/api/member/profile", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue({ userId: "user", memberId: "member", role: "MEMBER", onboardingRequired: false });
});

describe("profile saves", () => {
  it("saves the other member details when medical history is empty", async () => {
    expect((await POST(request({ fullName: "Updated Name", gender: "Female", birthDate: "1990-01-01", address: "Saved address", medicalHistory: "" }))).status).toBe(200);
    expect(prisma.member.update).toHaveBeenCalledWith({ where: { id: "member" }, data: {
      fullName: "Updated Name", gender: "Female", birthDate: new Date("1990-01-01T00:00:00Z"), address: "Saved address", medicalHistory: null,
    } });
  });

  it("updates only supplied fields when saving part of a profile", async () => {
    expect((await POST(request({ fullName: "Updated Name" }))).status).toBe(200);
    expect(prisma.member.update).toHaveBeenCalledWith({ where: { id: "member" }, data: {
      fullName: "Updated Name", gender: undefined, birthDate: undefined, address: undefined, medicalHistory: undefined,
    } });
  });

  it("allows optional fields to be cleared from the profile form", async () => {
    expect((await POST(request({ gender: "", birthDate: null, address: "   ", medicalHistory: "" }))).status).toBe(200);
    expect(prisma.member.update).toHaveBeenCalledWith({ where: { id: "member" }, data: {
      fullName: undefined, gender: null, birthDate: null, address: null, medicalHistory: null,
    } });
  });

  it("requires a logged-in member profile before writing", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    expect((await POST(request({ fullName: "Updated Name" }))).status).toBe(401);
    expect(prisma.member.update).not.toHaveBeenCalled();
  });
});
