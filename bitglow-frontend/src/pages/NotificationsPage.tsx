import { useEffect, useState, useMemo } from "react";
import Header from "../components/common/Header";
import { api, Notification } from "../services/api";
import { Bell, Heart, MessageCircle, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import clsx from "clsx";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const getNotificationId = (n: Notification): string => {
    const time = new Date(n.createdAt).getTime();
    return `${n.type}-${n.user.id}-${time}`;
  };

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      try {
        const res = await api.notifications.list();
        if (!cancel) {
          setItems(res || []);
          // Load seen IDs from localStorage
          const saved = localStorage.getItem("bitglow:seen_notifications");
          if (saved) {
            setSeenIds(new Set(JSON.parse(saved)));
          }
        }
      } catch (e) {
        console.error("Failed to load notifications", e);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => {
      cancel = true;
    };
  }, []);

  // Mark all as seen on mount after a small delay
  useEffect(() => {
    if (items.length > 0) {
      const timer = setTimeout(() => {
        const newSeen = new Set(seenIds);
        items.forEach(n => newSeen.add(getNotificationId(n)));
        
        // Keep only the last 100 to avoid giant localStorage
        const array = Array.from(newSeen).slice(-100);
        localStorage.setItem("bitglow:seen_notifications", JSON.stringify(array));
        setSeenIds(new Set(array));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [items.length]);

  const accept = async (id: string) => {
    const ok = await api.user.acceptFollow(id);
    if (ok) setItems((prev) => prev.filter((n) => !(n.type === "follow_request" && n.user.id === id)));
  };

  return (
    <div className="min-h-screen bg-black text-white relative selection:bg-brand/20 flex flex-col">
      <Header />
      
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-12 pb-24 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <Bell className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
              <p className="text-sm text-zinc-500 font-medium">Activity from your network</p>
            </div>
          </div>
          {items.length > 0 && (
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>All Caught Up</span>
             </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-zinc-500">
             <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
             <span className="text-sm font-medium">Loading activity...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
             <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center">
                <Bell className="w-10 h-10 text-white/10" />
             </div>
             <div>
                <h3 className="text-lg font-bold">No notifications yet</h3>
                <p className="text-zinc-500 text-sm">When people interact with you, it'll show up here.</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((n, idx) => {
              const id = getNotificationId(n);
              const isUnread = !seenIds.has(id);
              
              return (
                <Card 
                  key={`${n.type}-${(n as any).postId || n.user?.id || idx}`} 
                  padding="md" 
                  className={clsx(
                    "bg-white/[0.02] border-white/5 transition-all duration-300 hover:bg-white/[0.04] relative group",
                    isUnread && "border-l-2 border-l-brand bg-brand/[0.02]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 relative">
                        {n.type === "like" && (
                          <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                            <Heart className="w-4 h-4" />
                          </div>
                        )}
                        {n.type === "comment" && (
                          <div className="p-2.5 rounded-xl bg-brand/10 border border-brand/20 text-brand">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                        )}
                        {n.type === "follow_request" && (
                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <UserPlus className="w-4 h-4" />
                          </div>
                        )}
                        {isUnread && (
                           <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-black shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[14px] leading-snug">
                        <span className="font-bold text-white hover:underline cursor-pointer">
                           {n.user.displayName || n.user.username}
                        </span>
                        <span className="text-zinc-400 ml-1.5 font-medium">
                          {n.type === "follow_request" && "wants to follow you"}
                          {n.type === "like" && "liked your post"}
                          {n.type === "comment" && "commented on your post"}
                        </span>
                      </div>
                      
                      {n.type === "comment" && (
                        <p className="text-sm text-zinc-500 bg-white/5 px-3 py-2 rounded-lg border border-white/5 line-clamp-2 italic">
                          "{n.content}"
                        </p>
                      )}
                      
                      <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pt-1 flex items-center gap-2">
                        {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {n.type === "follow_request" && (
                      <Button 
                        size="sm" 
                        onClick={() => accept(n.user.id)}
                        className="bg-brand text-black font-bold rounded-full h-8 px-4"
                      >
                        Accept
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
