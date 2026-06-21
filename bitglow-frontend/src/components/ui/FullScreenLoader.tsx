import { Loader2 } from "lucide-react";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-400">Loading your session...</p>
      </div>
    </div>
  );
}
