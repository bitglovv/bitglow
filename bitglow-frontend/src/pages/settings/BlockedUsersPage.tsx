import { useEffect, useState } from "react";
import { ArrowLeft, ShieldX, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { Button } from "../../components/ui/Button";
import { UserListItem } from "../../components/user/UserListItem";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { api, Friend } from "../../services/api";
import { navigateBack } from "../../utils/navigateBack";
import { unblockUserEverywhere } from "../../utils/socialActions";

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "BitGlow \u2022 Blocked Users";
    api.settings.getBlockedUsers()
      .then((users) => setBlockedUsers(users || []))
      .catch(() => setBlockedUsers([]))
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

  const [confirmUnblockUser, setConfirmUnblockUser] = useState<Friend | null>(null);
  const [unblockLoading, setUnblockLoading] = useState(false);

  const performUnblock = async () => {
    if (!confirmUnblockUser) return;
    setUnblockLoading(true);
    try {
      await unblockUserEverywhere(confirmUnblockUser.id);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== confirmUnblockUser.id));
      setConfirmUnblockUser(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setUnblockLoading(false);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldX className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Blocked Users</h1>
            <p className="text-sm leading-6 text-zinc-400">
              Blocked accounts cannot follow, message, or view your posts.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-12 text-center text-sm text-zinc-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/60 mr-2" />
              Loading blocked users...
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-zinc-500">
              No blocked users.
            </div>
          ) : (
            blockedUsers.map((u) => (
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
                      setConfirmUnblockUser(u);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Unblock
                  </Button>
                }
              />
            ))
          )}
        </div>

        <ConfirmDialog
          open={Boolean(confirmUnblockUser)}
          title={`Unblock @${confirmUnblockUser?.username || "user"}?`}
          message="Unblocking will allow this user to view your profile, follow you, and message you again. Are you sure you want to unblock?"
          confirmLabel="Unblock"
          cancelLabel="Cancel"
          loading={unblockLoading}
          onConfirm={performUnblock}
          onClose={() => setConfirmUnblockUser(null)}
        />
      </main>
    </div>
  );
}
