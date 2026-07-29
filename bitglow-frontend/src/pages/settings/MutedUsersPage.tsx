import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { api, Friend } from "../../services/api";
import { navigateBack } from "../../utils/navigateBack";
import { unmuteUserEverywhere } from "../../utils/socialActions";

export default function MutedUsersPage() {
  const [mutedUsers, setMutedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.settings.getMutedUsers()
      .then(setMutedUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const { userId, user, muted } = (event as CustomEvent).detail || {};
      if (!userId) return;
      setMutedUsers((prev) => {
        if (!muted) return prev.filter((item) => item.id !== userId);
        if (prev.some((item) => item.id === userId)) return prev;
        return user ? [user, ...prev] : prev;
      });
    };
    window.addEventListener("bitglow:mute-changed", onChanged);
    return () => window.removeEventListener("bitglow:mute-changed", onChanged);
  }, []);

  const handleUnmute = async (userId: string) => {
    try {
      await unmuteUserEverywhere(userId);
      setMutedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unmute user");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      <Header leftContent={<button type="button" onClick={() => navigateBack(navigate, "/settings")} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08]" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>} />
      <main className="mx-auto h-[calc(100dvh-64px)] w-full max-w-2xl overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 custom-scrollbar sm:px-6 md:pb-10">
        <h1 className="text-2xl font-black tracking-tight">Muted Users</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Muted accounts stay connected, but their notifications and live alerts are hidden.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading muted users...</div>
          ) : mutedUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">No muted users yet.</div>
          ) : mutedUsers.map((u) => (
            <div key={u.id} className="flex min-h-[72px] items-center gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0">
              <Avatar src={u.avatarUrl} alt={u.username} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15px] font-bold text-white">
                  <span className="truncate">{u.displayName || u.username}</span>
                  {u.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-400" />}
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-400">@{u.username}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => handleUnmute(u.id)}>Unmute</Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
