import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/Button";
import { useChatStore } from "../../store/chatStore";
import ConfirmDialog from "../common/ConfirmDialog";
import { ReportSheet } from "../common/ReportSheet";
import ActionSheet from "../common/ActionSheet";
import { blockUserEverywhere, muteUserEverywhere, reportUser } from "../../utils/socialActions";

type Participant = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

export default function ParticipantMenu({ user }: { user: Participant }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const navigate = useNavigate();
  const chatStore = useChatStore();

  const handleBlock = async () => {
    setLoading(true);
    try {
      await blockUserEverywhere(user);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setLoading(false);
      setShowBlockConfirm(false);
    }
  };

  const handleMute = async () => {
    setLoading(true);
    try {
      await muteUserEverywhere(user);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to mute user");
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await reportUser(user.id, reason);
      setShowReportSheet(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to submit report");
    }
  };

  const handleMessage = () => {
    sessionStorage.setItem("bitglow:dmUserId", user.id);
    sessionStorage.setItem("bitglow:dmUsername", user.username);
    if (user.displayName) sessionStorage.setItem("bitglow:dmDisplayName", user.displayName);
    if (user.avatarUrl) sessionStorage.setItem("bitglow:dmAvatarUrl", user.avatarUrl);
    navigate("/messages");
    chatStore.openFriendConversation({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });
  };

  return (
    <div className="relative inline-block">
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} aria-label={`Actions for @${user.username}`}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      <ActionSheet
        open={open}
        title={`@${user.username}`}
        onClose={() => setOpen(false)}
        items={[
          { label: "View Profile", onClick: () => navigate(`/profile/${user.username}`) },
          { label: "Message", onClick: handleMessage },
          { label: "Report User", onClick: () => setShowReportSheet(true) },
          { type: "separator" },
          { label: "Mute User", onClick: () => void handleMute(), disabled: loading },
          { label: "Block User", onClick: () => setShowBlockConfirm(true), danger: true, disabled: loading },
          { type: "separator" },
        ]}
      />

      <ConfirmDialog
        open={showBlockConfirm}
        title="Block user"
        message={<div>Block @{user.username}? This prevents future messages and live chat access.</div>}
        confirmLabel="Block"
        cancelLabel="Cancel"
        loading={loading}
        onConfirm={handleBlock}
        onClose={() => setShowBlockConfirm(false)}
      />
      <ReportSheet
        isOpen={showReportSheet}
        title="Report User"
        prompt={`Why are you reporting @${user.username}?`}
        options={["Harassment or bullying", "Spam or scams", "Hate speech", "Impersonation", "Inappropriate content"]}
        onClose={() => setShowReportSheet(false)}
        onSubmit={handleReport}
      />
    </div>
  );
}
