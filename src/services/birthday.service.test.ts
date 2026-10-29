import { describe, expect, it, vi } from "vitest";
import { getBirthdayAnnouncementMembers } from "./birthday.service";
import { prisma } from "@/lib/database/prisma";

vi.mock("@/lib/database/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe("birthday announcements", () => {
  it("shows members whose birthdays are yesterday, today, or tomorrow in India time", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: "1",
        fullName: "Yesterday Member",
        admissionId: "ZF-001",
        mobileNumber: "9000000001",
        birthDate: new Date("1990-09-29T00:00:00.000Z"),
      },
      {
        id: "2",
        fullName: "Today Member",
        admissionId: "ZF-002",
        mobileNumber: "9000000002",
        birthDate: new Date("1990-09-30T00:00:00.000Z"),
      },
      {
        id: "3",
        fullName: "Tomorrow Member",
        admissionId: "ZF-003",
        mobileNumber: null,
        birthDate: new Date("1990-10-01T00:00:00.000Z"),
      },
      {
        id: "4",
        fullName: "Outside Member",
        admissionId: "ZF-004",
        mobileNumber: "9000000004",
        birthDate: new Date("1990-10-02T00:00:00.000Z"),
      },
    ] as never);

    const members = await getBirthdayAnnouncementMembers(new Date("2026-09-30T08:00:00.000Z"));

    expect(members.map((member) => member.fullName)).toEqual([
      "Yesterday Member",
      "Today Member",
      "Tomorrow Member",
    ]);
    expect(members.map((member) => member.birthDate)).toEqual(["29 Sept", "30 Sept", "01 Oct"]);
  });
  it("handles the India-time year boundary", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: "dec", fullName: "December birthday", admissionId: "ZF-1", mobileNumber: null, birthDate: new Date("1990-12-31T00:00:00Z") },
      { id: "jan", fullName: "January birthday", admissionId: "ZF-2", mobileNumber: null, birthDate: new Date("1990-01-01T00:00:00Z") },
      { id: "outside", fullName: "Outside", admissionId: "ZF-3", mobileNumber: null, birthDate: new Date("1990-01-03T00:00:00Z") },
    ]);
    const members = await getBirthdayAnnouncementMembers(new Date("2026-12-31T20:00:00Z"));
    expect(members.map(member => member.id)).toEqual(["dec", "jan"]);
  });

});
