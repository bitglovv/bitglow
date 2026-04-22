import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, Notification } from "../services/api";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { useAuth } from "../hooks/useAuth";
import clsx from "clsx";

const BITGLOW_NOTIFICATIONS = [
  {
    id: "sys-1",
    type: "system" as const,
    user: {
      id: "bitglow",
      username: "bitglow",
      displayName: "BitGlow",
      avatarUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=bitglow"
    },
    content: "You're now part of the next generation of real-time chat. Start following people and joining the conversation.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "sys-2",
    type: "system" as const,
    user: {
      id: "bitglow",
      username: "bitglow",
      displayName: "BitGlow",
      avatarUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=bitglow"
    },
    content: "Jump into the global live chat room and connect with people in real time.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

function getNotifId(n: Notification | any) {
  return n.id || `${n.type}-${n.user?.id ?? "sys"}-${new Date(n.createdAt).getTime()}`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => { document.title = "BitGlow \u2022 Notifications"; }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.notifications.list();
        if (!cancelled) {
          setItems(res || []);
          const saved = localStorage.getItem("bitglow:seen_notifications");
          setSeenIds(new Set(saved ? JSON.parse(saved) : []));
        }
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Mark all as seen after 2s
  useEffect(() => {
    if (items.length === 0) return;
    const t = setTimeout(() => {
      const next = new Set(seenIds);
      items.forEach(n => next.add(getNotifId(n)));
      const arr = Array.from(next).slice(-100);
      localStorage.setItem("bitglow:seen_notifications", JSON.stringify(arr));
      setSeenIds(new Set(arr));
    }, 2000);
    return () => clearTimeout(t);
  }, [items.length]);

  const accept = async (userId: string) => {
    const ok = await api.user.acceptFollow(userId);
    if (ok) setItems(prev => prev.filter(n => !(n.type === "follow_request" && n.user?.id === userId)));
  };

  const combinedNotifs = useMemo(() => {
    const all = [...items, ...BITGLOW_NOTIFICATIONS];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  const groupedNotifs = useMemo(() => {
    const groups: { [key: string]: any[] } = {
      "Today": [],
      "Yesterday": [],
      "Last 7 days": [],
      "Last 30 days": [],
      "Older": []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    combinedNotifs.forEach(n => {
      const d = new Date(n.createdAt);
      if (d >= today) groups["Today"].push(n);
      else if (d >= yesterday) groups["Yesterday"].push(n);
      else if (d >= sevenDaysAgo) groups["Last 7 days"].push(n);
      else if (d >= thirtyDaysAgo) groups["Last 30 days"].push(n);
      else groups["Older"].push(n);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [combinedNotifs]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-brand/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md">
        <div className="flex items-center gap-6 px-4 py-6 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:opacity-70 transition-all active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        </div>
      </div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 space-y-10">
        
        {/* All caught up status */}
        {!loading && (
          <div className="flex items-center gap-4 py-2 px-1">
            <div className="w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white leading-none">You're all caught up</p>
              <button className="text-blue-500 text-[15px] font-medium hover:text-blue-400 transition-colors mt-2">
                See new activity for {currentUser?.username}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        ) : groupedNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-zinc-500 font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedNotifs.map(([label, notifs]) => (
              <div key={label} className="space-y-6">
                <h2 className="text-white font-bold text-xl px-1">{label}</h2>
                <div className="space-y-8">
                  {notifs.map((n) => (
                    <NotificationRow 
                      key={getNotifId(n)} 
                      n={n} 
                      isUnread={!seenIds.has(getNotifId(n))}
                      onAccept={() => accept(n.user.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NotificationRow({ n, isUnread, onAccept }: { n: any, isUnread: boolean, onAccept: () => void }) {
  const getContent = () => {
    switch (n.type) {
      case "like":
        return "liked your post";
      case "comment":
        return `commented: ${n.content}`;
      case "follow_request":
        return "wants to follow you";
      case "follow":
        return "started following you";
      case "follow_back":
        return "followed you back. You're now friends.";
      case "dm":
        return `sent you a message: ${n.content}`;
      case "system":
        return n.content;
      default:
        return "interacted with you";
    }
  };

  return (
    <div className="flex items-start gap-4 relative">
      <div className="relative shrink-0">
        <Avatar src={n.user?.avatarUrl} alt={n.user?.username} size="sm" className="w-12 h-12" />
        {isUnread && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand rounded-full border-2 border-black" />
        )}
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <p className="text-[15px] leading-snug text-zinc-100">
          <span className="font-bold text-white mr-1.5">{n.user?.username}</span>
          <span className="line-clamp-2 inline">
            {getContent()}
          </span>
          <span className="text-zinc-500 ml-2 font-medium whitespace-nowrap">{timeAgo(n.createdAt)}</span>
        </p>
        
        {n.type === "follow_request" && (
          <div className="mt-4 flex gap-2">
            <Button 
              size="sm" 
              onClick={onAccept}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 px-6 rounded-xl border-none"
            >
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              className="h-9 px-6 rounded-xl border-zinc-800 bg-zinc-900 text-white font-bold"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Action Button */}
      {(n.type === "like" || n.type === "comment" || n.type === "follow" || n.type === "follow_back" || n.type === "dm") && (
        <button className="shrink-0 bg-zinc-900 hover:bg-zinc-800 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 border border-zinc-800/50 mt-1">
          {n.type === "follow" ? "Follow back" : "Message"}
        </button>
      )}
    </div>
  );
}
