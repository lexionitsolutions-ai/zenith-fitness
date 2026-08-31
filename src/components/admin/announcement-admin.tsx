"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  title: string;
  message: string | null;
  imageData: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
};

export function AnnouncementAdmin({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [image, setImage] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);

  function choose(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) {
      setMessage("Image must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function refreshRows() {
    const response = await fetch("/api/admin/announcements", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setRows(result.data);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);
    setMessage("Publishing announcement...");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      title: form.get("title"),
      message: form.get("message") || undefined,
      imageData: image,
      startsAt: form.get("startsAt"),
      endsAt: form.get("endsAt") || null,
    };

    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error?.message ?? "Unable to publish announcement.");
        return;
      }

      const notifications = result.data.notifications;
      setMessage(`Announcement published. Queued ${notifications?.queued ?? 0} notifications. Sent ${notifications?.delivery?.sent ?? 0}, failed ${notifications?.delivery?.failed ?? 0}.`);
      formElement.reset();
      setImage(undefined);
      await refreshRows();
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      setRows((value) => value.map((row) => (row.id === id ? { ...row, isActive: false } : row)));
      router.refresh();
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN CONTENT</p>
      <h1 className="text-3xl font-black">Announcements</h1>

      <form onSubmit={submit} className="mt-7 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <input name="title" required placeholder="Announcement title" className="w-full rounded-xl bg-black/20 p-3" />
        <textarea name="message" placeholder="Message, WhatsApp group link, or any URL members should open" className="w-full rounded-xl bg-black/20 p-3" />
        <label className="block text-sm">
          Optional image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} className="mt-2 block w-full" />
        </label>
        {image && <img src={image} alt="Preview" className="max-h-60 rounded-xl object-cover" />}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Starts
            <input name="startsAt" type="datetime-local" required className="mt-2 w-full rounded-xl bg-black/20 p-3" />
          </label>
          <label className="text-sm">
            Ends (optional)
            <input name="endsAt" type="datetime-local" className="mt-2 w-full rounded-xl bg-black/20 p-3" />
          </label>
        </div>
        <button disabled={publishing} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zenith-500 px-6 font-bold text-slate-950 disabled:opacity-70">
          {publishing && <LoaderCircle className="animate-spin" size={18} />}
          Publish announcement
        </button>
      </form>

      {message && <p className="mt-4 rounded-xl bg-white/10 p-4">{message}</p>}

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-bold">Recent posts</h2>
        {rows.map((row) => (
          <article key={row.id} className="flex justify-between gap-4 rounded-2xl bg-white/5 p-4">
            <div>
              <b>{row.title}</b>
              <p className="text-sm text-white/50">{row.message}</p>
              <small className={row.isActive ? "text-zenith-400" : "text-white/30"}>{row.isActive ? "Active" : "Disabled"}</small>
            </div>
            {row.isActive && (
              <button onClick={() => remove(row.id)} className="rounded-xl bg-red-500/10 px-4 text-red-200">
                Disable
              </button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
