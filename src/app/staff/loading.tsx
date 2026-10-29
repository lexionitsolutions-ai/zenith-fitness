export default function Loading() {
  return <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8" aria-busy="true" aria-label="Loading staff workspace">
    <p className="text-sm text-zenith-400">ZENITH STAFF</p>
    <h1 className="mt-1 text-2xl font-black">Staff workspace</h1>
    <div aria-hidden="true" className="mt-6 space-y-4 motion-safe:animate-pulse"><div className="h-48 rounded-3xl bg-white/5" /><div className="h-28 rounded-3xl bg-white/5" /></div>
  </main>;
}
