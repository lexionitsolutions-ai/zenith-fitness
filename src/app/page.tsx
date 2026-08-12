import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.onboardingRequired) redirect("/onboarding");
  if (session.role === "ADMIN") redirect("/admin/import");
  if (session.role === "STAFF") redirect("/staff");
  redirect("/dashboard");
}
