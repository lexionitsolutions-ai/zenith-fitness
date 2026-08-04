"use client";

import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";

type Data = Awaited<ReturnType<typeof import("@/services/points.service").getMemberPoints>>;

export function PointsView({ data }: { data: Data }) {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60">
        <ArrowLeft size={18} /> Dashboard
      </Link>
      <header className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-sm text-zenith-400">ZENITH REWARDS</p>
          <h1 className="text-3xl font-black">{data.pointsBalance.toLocaleString("en-IN")} points</h1>
        </div>
        <Trophy className="text-amber-300" size={40} />
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl bg-white p-6 text-center text-black">
          <QRCodeSVG value={data.member.qrToken} size={210} className="mx-auto max-w-full" />
          <p className="mt-4 font-bold">{data.member.fullName}</p>
          <p className="text-sm text-black/50">{data.member.admissionId} · Show this to staff</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 font-bold"><Target className="text-zenith-400" /> My targets</h2>
          <div className="mt-4 space-y-3">
            {data.targets.length ? data.targets.map((target) => (
              <div key={target.id} className="rounded-xl bg-black/20 p-3">
                <div className="flex justify-between"><b>{target.title}</b><span className="text-xs text-zenith-400">{target.status}</span></div>
                <p className="mt-1 text-xs text-white/50">Due {new Date(target.dueDate).toLocaleDateString("en-IN")} · +{target.rewardPoints} points</p>
              </div>
            )) : <p className="text-sm text-white/40">No targets assigned yet.</p>}
          </div>
        </article>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 font-bold"><Trophy className="text-amber-300" /> Leaderboard</h2>
          <ol className="mt-4 space-y-2">
            {data.leaderboard.map((member) => (
              <li key={member.rank} className={`flex justify-between rounded-xl p-3 ${member.isCurrentMember ? "bg-zenith-500/20" : "bg-black/20"}`}>
                <span><b className="mr-3">#{member.rank}</b>{member.name} <small className="text-white/35">{member.admissionId}</small></span>
                <b>{member.points}</b>
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 font-bold"><Star className="text-zenith-400" /> Point history</h2>
          <div className="mt-4 space-y-2">
            {data.transactions.length ? data.transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between border-b border-white/5 py-3 text-sm">
                <div><b>{transaction.description}</b><p className="text-xs text-white/40">{new Date(transaction.createdAt).toLocaleDateString("en-IN")}</p></div>
                <b className={transaction.points >= 0 ? "text-zenith-400" : "text-red-300"}>{transaction.points > 0 ? "+" : ""}{transaction.points}</b>
              </div>
            )) : <p className="text-sm text-white/40">Your point history will appear here.</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
