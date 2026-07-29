import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useChatStore } from "../../store/chatStore";
import ConfirmDialog from "../common/ConfirmDialog";
import { ReportSheet } from "../common/ReportSheet";
import { blockUserEverywhere, muteUserEverywhere, reportUser } from "../../utils/socialActions";

export default function ParticipantMenu({ user }: { user: { id: string; username: string; displayName?: string; avatarUrl?: string } }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const chatStore = useChatStore();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleBlock = async () => {
    setLoading(true);
    try {
      await blockUserEverywhere(user);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to block user");
    } finally { setLoading(false); setOpen(false); setShowBlockConfirm(false); }
  };

  const handleMute = async () => {
    setLoading(true);
    try {
      await muteUserEverywhere(user);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to mute user");
    } finally { setLoading(false); setOpen(false); }
  };

  const handleReport = async (reason: string) => {
    try {
      await reportUser(user.id, reason);
      setShowReportSheet(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to submit report");
    }
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>•••</Button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-2xl z-50">
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/[0.02]" onClick={() => navigate(`/profile/${user.username}`)}>View Profile</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/[0.02]" onClick={() => { sessionStorage.setItem("bitglow:dmUserId", user.id); sessionStorage.setItem("bitglow:dmUsername", user.username); if (user.displayName) sessionStorage.setItem("bitglow:dmDisplayName", user.displayName); if (user.avatarUrl) sessionStorage.setItem("bitglow:dmAvatarUrl", user.avatarUrl); navigate('/messages'); chatStore.openFriendConversation({ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }); }}>Message</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-white/[0.02]" onClick={handleMute} disabled={loading}>Mute</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-rose-400 hover:bg-rose-500/10" onClick={() => { setOpen(false); setShowBlockConfirm(true); }} disabled={loading}>Block</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/[0.02]" onClick={() => { setOpen(false); setShowReportSheet(true); }}>Report</button>
        </div>
      )}
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
