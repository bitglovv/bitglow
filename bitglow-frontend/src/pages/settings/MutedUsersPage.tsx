import { useEffect, useState } from "react";
import SettingsSubPage from "./SettingsSubPage";
import { api, Friend } from "../../services/api";
import { Button } from "../../components/ui/Button";

export default function MutedUsersPage() {
  const [mutedUsers, setMutedUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings.getMutedUsers()
      .then(setMutedUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUnmute = async (userId: string) => {
    try {
      await api.settings.unmuteUser(userId);
      setMutedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error("Failed to unmute user", err);
    }
  };

  const items = loading
    ? [{ title: "Loading...", subtitle: "Fetching muted users..." }]
    : mutedUsers.length === 0
      ? [{ title: "Muted Users", subtitle: "No muted users yet." }]
      : mutedUsers.map((u) => ({
          title: u.displayName || u.username,
          subtitle: `@${u.username}`,
          action: (
            <Button size="sm" variant="secondary" onClick={() => handleUnmute(u.id)}>
              Unmute
            </Button>
          ),
        }));

  return (
    <SettingsSubPage
      title="Muted Users"
      description="Users you mute won't appear in your feed. They can still follow you and see your posts."
      items={items}
    />
  );
}
