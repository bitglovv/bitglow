import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { api, Friend } from "../../services/api";
import { navigateBack } from "../../utils/navigateBack";
import { unblockUserEverywhere } from "../../utils/socialActions";

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.settings.getBlockedUsers()
      .then(setBlockedUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const { userId, user, blocked } = (event as CustomEvent).detail || {};
      if (!userId) return;
      setBlockedUsers((prev) => {
        if (!blocked) return prev.filter((item) => item.id !== userId);
        if (prev.some((item) => item.id === userId)) return prev;
        return user ? [user, ...prev] : prev;
      });
    };
    window.addEventListener("bitglow:block-changed", onChanged);
    return () => window.removeEventListener("bitglow:block-changed", onChanged);
  }, []);

  const [confirmUnblockId, setConfirmUnblockId] = useState<string | null>(null);
  const [unblockLoadingId, setUnblockLoadingId] = useState<string | null>(null);

  const handleUnblock = (userId: string) => {
    setConfirmUnblockId(userId);
  };

  const performUnblock = async (userId: string) => {
    setUnblockLoadingId(userId);
    try {
      await unblockUserEverywhere(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setUnblockLoadingId(null);
      setConfirmUnblockId(null);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      <Header leftContent={<button type="button" onClick={() => navigateBack(navigate, "/settings")} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08]" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>} />
      <main className="mx-auto h-[calc(100dvh-64px)] w-full max-w-2xl overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 custom-scrollbar sm:px-6 md:pb-10">
        <h1 className="text-2xl font-black tracking-tight">Blocked Users</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Blocked accounts cannot follow, message, or interact with you.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading blocked users...</div>
          ) : blockedUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">No blocked users yet.</div>
          ) : blockedUsers.map((u) => (
            <div key={u.id} className="flex min-h-[72px] items-center gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0">
              <Avatar src={u.avatarUrl} alt={u.username} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15px] font-bold text-white">
                  <span className="truncate">{u.displayName || u.username}</span>
                  {u.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-400" />}
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-400">@{u.username}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => handleUnblock(u.id)}>{unblockLoadingId === u.id ? 'Working...' : 'Unblock'}</Button>
            </div>
          ))}
        </div>

        <ConfirmDialog
          open={!!confirmUnblockId}
          title="Unblock user"
          message="Unblocking will allow this user to follow and message you again. Are you sure you want to unblock?"
          confirmLabel="Unblock"
          cancelLabel="Cancel"
          loading={!!unblockLoadingId}
          onConfirm={() => performUnblock(confirmUnblockId as string)}
          onClose={() => setConfirmUnblockId(null)}
        />

      </main>
    </div>
  );
}
