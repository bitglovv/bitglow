import { useEffect, useState } from "react";
import SettingsSubPage from "./SettingsSubPage";
import { api, Friend } from "../../services/api";
import { Button } from "../../components/ui/Button";

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings.getBlockedUsers()
      .then(setBlockedUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (userId: string) => {
    try {
      await api.settings.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error("Failed to unblock user", err);
    }
  };

  const items = loading
    ? [{ title: "Loading...", subtitle: "Fetching blocked users..." }]
    : blockedUsers.length === 0
      ? [{ title: "Blocked Users", subtitle: "No blocked users yet." }]
      : blockedUsers.map((u) => ({
          title: u.displayName || u.username,
          subtitle: `@${u.username}`,
          action: (
            <Button size="sm" variant="secondary" onClick={() => handleUnblock(u.id)}>
              Unblock
            </Button>
          ),
        }));

  return (
    <SettingsSubPage
      title="Blocked Users"
      description="Review accounts you have blocked or muted."
      items={items}
    />
  );
}
