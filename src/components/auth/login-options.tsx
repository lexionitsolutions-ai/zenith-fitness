"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Dumbbell, UserRound } from "lucide-react";
import { LoginForm } from "./login-form";

export function LoginOptions() {
  const [member, setMember] = useState(false);
  return <><div className="space-y-3"><button type="button" onClick={() => setMember(v => !v)} aria-expanded={member} className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left ${member ? "border-zenith-400 bg-zenith-500/10" : "border-white/10 bg-white/[.06]"}`}><UserRound className="shrink-0 text-zenith-300"/><span className="flex-1"><span className="block font-bold">I’m already a Zenith member</span><span className="mt-1 block text-xs text-white/60">Log in with your number and password</span></span><ArrowRight size={18}/></button><Link href="/explore" className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-5"><Dumbbell className="shrink-0 text-zenith-300"/><span className="flex-1"><span className="block font-bold">I’m new to Zenith Fitness</span><span className="mt-1 block text-xs text-white/60">Explore the gym, book a trial, or join</span></span><ArrowRight size={18}/></Link></div>{member && <div className="mt-5"><h2 className="mb-4 text-lg font-bold">Member login</h2><LoginForm/></div>}</>;
}
