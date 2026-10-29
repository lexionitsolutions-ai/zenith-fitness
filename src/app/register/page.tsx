import Link from "next/link";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { RegisterForm } from "@/components/auth/register-form";
export default function Page() {
  return <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#332b10,#07110e_48%)] px-5 py-10"><section className="w-full max-w-md">
    <ZenithLogo className="mx-auto max-w-[200px]"/>
    <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-zenith-300">Your fitness journey starts here</p>
    <h1 className="mt-2 text-center text-3xl font-black">Become a Member</h1>
    <RegisterForm/><p className="mt-5 text-center text-sm text-white/60">Already registered? <Link href="/login" className="font-bold text-zenith-300">Sign in</Link></p>
  </section></main>;
}
