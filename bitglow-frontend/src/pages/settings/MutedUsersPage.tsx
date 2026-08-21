import { useEffect, useState } from "react";
import { ArrowLeft, BellOff, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { Button } from "../../components/ui/Button";
import { UserListItem } from "../../components/user/UserListItem";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { api, Friend } from "../../services/api";
import { navigateBack } from "../../utils/navigateBack";
import { unmuteUserEverywhere } from "../../utils/socialActions";

export default function MutedUsersPage() {
  const [mutedUsers, setMutedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "BitGlow \u2022 Muted Users";
    api.settings.getMutedUsers()
      .then((users) => setMutedUsers(users || []))
      .catch(() => setMutedUsers([]))
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

  const [confirmUnmuteUser, setConfirmUnmuteUser] = useState<Friend | null>(null);
  const [unmuteLoading, setUnmuteLoading] = useState(false);

  const performUnmute = async () => {
    if (!confirmUnmuteUser) return;
    setUnmuteLoading(true);
    try {
      await unmuteUserEverywhere(confirmUnmuteUser.id);
      setMutedUsers((prev) => prev.filter((u) => u.id !== confirmUnmuteUser.id));
      setConfirmUnmuteUser(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unmute user");
    } finally {
      setUnmuteLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
      <Header
        leftContent={
          <button
            type="button"
            onClick={() => navigateBack(navigate, "/settings")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />
      <main className="mx-auto flex-1 w-full max-w-2xl overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 custom-scrollbar sm:px-6 md:pb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BellOff className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Muted Users</h1>
            <p className="text-sm leading-6 text-zinc-400">
              Muted accounts stay connected, but their notifications and live alerts are silenced.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-12 text-center text-sm text-zinc-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/60 mr-2" />
              Loading muted users...
            </div>
          ) : mutedUsers.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-zinc-500">
              No muted users.
            </div>
          ) : (
            mutedUsers.map((u) => (
              <UserListItem
                key={u.id}
                user={u}
                href={`/profile/${u.username}`}
                className="rounded-none border-b border-white/[0.06] bg-transparent px-4 py-3 text-white last:border-b-0"
                actionSlot={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmUnmuteUser(u);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    Unmute
                  </Button>
                }
              />
            ))
          )}
        </div>

        <ConfirmDialog
          open={Boolean(confirmUnmuteUser)}
          title={`Unmute @${confirmUnmuteUser?.username || "user"}?`}
          message="Unmuting will restore message notifications and live space alerts from this user. Are you sure you want to unmute?"
          confirmLabel="Unmute"
          cancelLabel="Cancel"
          loading={unmuteLoading}
          onConfirm={performUnmute}
          onClose={() => setConfirmUnmuteUser(null)}
        />
      </main>
    </div>
  );
}
