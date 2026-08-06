import { Play, ShieldAlert } from "lucide-react";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/youtube";

type Props = {
  exerciseName: string;
  youtubeVideoId: string | null;
  status: string | null;
};

export function ExerciseVideo({ exerciseName, youtubeVideoId, status }: Props) {
  if (status === "NEEDS_OWNER_CONFIRMATION") {
    return <div className="flex aspect-video items-center justify-center bg-black p-6 text-center text-white/65"><div><ShieldAlert className="mx-auto mb-3 text-amber-300" /><b>Trainer confirmation needed</b><p className="mt-1 text-sm">Candidate videos are saved for admin review.</p></div></div>;
  }
  if (!youtubeVideoId || status !== "VERIFIED") {
    return <div className="flex aspect-video items-center justify-center bg-black p-6 text-center text-white/65"><div><Play className="mx-auto mb-3 text-white/45" /><b>Video coming soon</b><p className="mt-1 text-sm">A verified exercise demo has not been approved yet.</p></div></div>;
  }
  const watchUrl = youtubeWatchUrl(youtubeVideoId);
  return <div className="relative aspect-video overflow-hidden bg-black">
    <iframe src={youtubeEmbedUrl(youtubeVideoId)} title={`${exerciseName} demonstration`} className="absolute inset-0 h-full w-full" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
    <a href={watchUrl} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-xs font-bold text-white/85 backdrop-blur transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-zenith-400">Open video</a>
  </div>;
}
