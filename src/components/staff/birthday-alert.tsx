import { Cake } from "lucide-react";
import { getTodaysBirthdays } from "@/services/birthday.service";

export async function BirthdayAlert() {
  const members = await getTodaysBirthdays();
  if (!members.length) return null;

  return (
    <aside className="mx-auto mt-4 max-w-5xl px-5" aria-label="Today's member birthdays">
      <div className="rounded-2xl border border-zenith-400/25 bg-zenith-500/10 p-4">
        <div className="flex gap-3">
          <Cake className="shrink-0 text-zenith-400" />
          <div>
            <p className="font-bold">
              {members.length === 1 ? "Member birthday today" : `${members.length} member birthdays today`}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              {members.map((member) => (
                <li key={member.id}>
                  <strong className="text-white">{member.fullName}</strong>
                  {" · "}{member.admissionId}
                  {member.mobileNumber ? ` · ${member.mobileNumber}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
