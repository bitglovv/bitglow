import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { api } from "../../services/api";
import { useChatStore } from "../../store/chatStore";

export default function ParticipantMenu({ user }: { user: { id: string; username: string; displayName?: string; avatarUrl?: string } }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const chatStore = useChatStore();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleBlock = async () => {
    if (!confirm(`Block @${user.username}? This will prevent messages and interactions.`)) return;
    setLoading(true);
    try {
      await api.settings.blockUser(user.id);
      // update chat store
      chatStore.fetchConversationsAndFriends();
      window.dispatchEvent(new CustomEvent('bitglow:block-changed', { detail: { userId: user.id, blocked: true } }));
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); setOpen(false); }
  };

  const handleMute = async () => {
    if (!confirm(`Mute @${user.username}? You will stop receiving notifications from them.`)) return;
    setLoading(true);
    try {
      await api.settings.muteUser(user.id);
      window.dispatchEvent(new CustomEvent('bitglow:mute-changed', { detail: { userId: user.id, muted: true } }));
    } catch (err) { console.error(err); } finally { setLoading(false); setOpen(false); }
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>•••</Button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-2xl z-50">
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/[0.02]" onClick={() => navigate(`/profile/${user.username}`)}>View Profile</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-white/[0.02]" onClick={() => { navigate('/messages'); chatStore.openFriendConversation({ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }); }}>Message</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-white/[0.02]" onClick={handleMute} disabled={loading}>Mute</button>
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-rose-400 hover:bg-rose-500/10" onClick={handleBlock} disabled={loading}>Block</button>
        </div>
      )}
    </div>
  );
}
