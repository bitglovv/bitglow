import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Notification, type User } from "../services/api";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { navigateBack } from "../utils/navigateBack";
import clsx from "clsx";
import {
    dispatchNotificationsUpdated,
    isActivityNotification,
    notificationStableId,
    type ActivityNotification,
} from "../utils/notificationFeed";

function timeLabel(dateStr: string) {
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

type GroupedItem = {
    id: string;
    type: ActivityNotification["type"];
    users: User[];
    postId?: string;
    content?: string;
    createdAt: string;
    isUnread: boolean;
    count: number;
};

function getSection(dateStr: string, isUnread: boolean): string {
    if (isUnread) return "New";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days < 1) return "Today";
    if (days < 7) return "Last 7 days";
    if (days < 30) return "This month";
    return "Earlier";
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
    
    const [seenIds, setSeenIds] = useState<Set<string>>(() => {
        try {
            const raw = localStorage.getItem("bitglow:seen_notifications");
            return new Set(raw ? (JSON.parse(raw) as string[]) : []);
        } catch {
            return new Set();
        }
    });

    useEffect(() => {
        document.title = "BitGlow";
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [notifs, following] = await Promise.all([
                    api.notifications.list(),
                    api.user.following()
                ]);
                if (!cancelled) {
                    setItems(notifs || []);
                    setFollowingIds(new Set(following.map(f => f.id)));
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Mark as seen after viewing
    useEffect(() => {
        if (items.length === 0) return;
        const t = window.setTimeout(() => {
            setSeenIds((prev) => {
                const next = new Set(prev);
                items.filter(isActivityNotification).forEach((n) => next.add(notificationStableId(n)));
                const arr = Array.from(next).slice(-150);
                localStorage.setItem("bitglow:seen_notifications", JSON.stringify(arr));
                dispatchNotificationsUpdated();
                return new Set(arr);
            });
        }, 3000);
        return () => window.clearTimeout(t);
    }, [items]);

    const groupedSections = useMemo(() => {
        const activity = items.filter(isActivityNotification)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const sections: Record<string, GroupedItem[]> = {
            "New": [],
            "Today": [],
            "Last 7 days": [],
            "This month": [],
            "Earlier": []
        };

        const processed = new Set<string>();

        activity.forEach((n, idx) => {
            const id = notificationStableId(n);
            if (processed.has(id)) return;

            const isUnread = !seenIds.has(id);
            const section = getSection(n.createdAt, isUnread);
            
            // Simple grouping for likes: if multiple likes for same postId in same section
            if (n.type === "like" && n.postId) {
                const samePost = activity.filter(other => 
                    other.type === "like" && 
                    other.postId === n.postId && 
                    getSection(other.createdAt, !seenIds.has(notificationStableId(other))) === section
                );
                
                if (samePost.length > 1) {
                    sections[section].push({
                        id: `group-like-${n.postId}-${section}`,
                        type: "like",
                        users: samePost.map(p => p.user),
                        postId: n.postId,
                        createdAt: n.createdAt,
                        isUnread,
                        count: samePost.length
                    });
                    samePost.forEach(p => processed.add(notificationStableId(p)));
                    return;
                }
            }

            // Default: individual notification
            sections[section].push({
                id,
                type: n.type,
                users: [n.user],
                postId: (n as any).postId,
                content: (n as any).content,
                createdAt: n.createdAt,
                isUnread,
                count: 1
            });
            processed.add(id);
        });

        return sections;
    }, [items, seenIds]);

    const handleFollow = async (userId: string, username: string) => {
        if (followLoading.has(userId)) return;
        setFollowLoading(prev => new Set(prev).add(userId));
        try {
            const status = await api.user.follow(userId, username);
            if (status) {
                setFollowingIds(prev => new Set(prev).add(userId));
            }
        } catch (err) {
            console.error("Follow failed", err);
        } finally {
            setFollowLoading(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const handleUnfollow = async (userId: string) => {
        if (followLoading.has(userId)) return;
        setFollowLoading(prev => new Set(prev).add(userId));
        try {
            const success = await api.user.unfollow(userId);
            if (success) {
                setFollowingIds(prev => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            }
        } catch (err) {
            console.error("Unfollow failed", err);
        } finally {
            setFollowLoading(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const renderAction = (item: GroupedItem) => {
        if (item.type === "follow" || item.type === "follow_request" || item.type === "follow_back") {
            const user = item.users[0];
            const isFollowing = followingIds.has(user.id);
            const isLoading = followLoading.has(user.id);

            if (isFollowing) {
                return (
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 px-4 rounded-lg bg-zinc-900 border-none text-zinc-300 font-semibold text-xs"
                        onClick={(e) => { e.preventDefault(); handleUnfollow(user.id); }}
                        disabled={isLoading}
                    >
                        Following
                    </Button>
                );
            }

            return (
                <Button 
                    size="sm" 
                    className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 border-none text-white font-semibold text-xs"
                    onClick={(e) => { e.preventDefault(); handleFollow(user.id, user.username); }}
                    disabled={isLoading}
                >
                    {item.type === "follow_back" ? "Follow back" : "Follow"}
                </Button>
            );
        }

        return null;
    };

    const renderNotificationText = (item: GroupedItem) => {
        const primaryUser = item.users[0];
        const othersCount = item.count - 1;

        const UserLink = ({ user }: { user: User }) => (
            <span 
                className="font-semibold text-white hover:underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.username}`); }}
            >
                {user.username}
            </span>
        );

        const PostText = ({ text }: { text: string }) => (
            <span className="font-semibold text-white">
                {text}
            </span>
        );

        let content = null;
        switch (item.type) {
            case "like":
                content = (
                    <>
                        <UserLink user={primaryUser} />
                        {othersCount > 0 && (
                            <>
                                {othersCount === 1 ? " and 1 other" : `, others and ${othersCount} others`}
                            </>
                        )}
                        {" "}liked your <PostText text="post" />.
                    </>
                );
                break;
            case "comment":
                content = (
                    <>
                        <UserLink user={primaryUser} /> commented on your <PostText text="post" />: <PostText text={item.content || "comment"} />
                    </>
                );
                break;
            case "follow":
                content = <><UserLink user={primaryUser} /> started following you.</>;
                break;
            case "follow_back":
                content = <><UserLink user={primaryUser} /> followed you back.</>;
                break;
            case "follow_request":
                content = <><UserLink user={primaryUser} /> requested to follow you.</>;
                break;
            case "comment_like":
                content = (
                    <>
                        <UserLink user={primaryUser} />
                        {" "}liked your <PostText text="comment" />: <span className="text-zinc-400 text-[13px]">&ldquo;{(item.content || "").slice(0, 60)}{(item.content?.length ?? 0) > 60 ? "…" : ""}&rdquo;</span>
                    </>
                );
                break;
            case "mention":
                content = <><UserLink user={primaryUser} /> mentioned you in a <PostText text="post" />.</>;
                break;
        }

        return (
            <div className="text-[14px] leading-tight text-zinc-300">
                {content}
                <span className="ml-1 text-zinc-500">{timeLabel(item.createdAt)}</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
            <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl transition-all">
                <div className="mx-auto flex max-w-lg items-center gap-2 px-2 py-3">
                    <button
                        type="button"
                        onClick={() => navigateBack(navigate, "/home")}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:bg-white/10 active:scale-95"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
                </div>
            </header>

            <main className="mx-auto max-w-lg pb-[calc(80px+env(safe-area-inset-bottom))]">
                {loading ? (
                    <div className="flex justify-center py-32">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-white/80" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-10 py-40 text-center text-zinc-500">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800/50 bg-zinc-900/20">
                            <UserPlus className="h-8 w-8 opacity-40" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-300">Activity on your posts</h3>
                        <p className="mt-1 text-sm text-zinc-500">When someone likes or comments on one of your posts, you'll see it here.</p>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        {Object.entries(groupedSections).map(([section, sectionItems]) => {
                            if (sectionItems.length === 0) return null;
                            return (
                                <section key={section} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <h2 className="px-4 py-2 text-[15px] font-bold text-white">
                                        {section}
                                    </h2>
                                    <div className="mt-1">
                                        {sectionItems.map((item) => {
                                            const isPostAction = item.type === "like" || item.type === "comment" || item.type === "comment_like" || (item.type === "mention" && item.postId);
                                            const targetUrl = isPostAction && item.postId 
                                                ? `/posts/${item.postId}` 
                                                : `/profile/${item.users[0].username}`;

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => navigate(targetUrl)}
                                                    className="group flex items-center justify-between gap-3 px-4 py-3 transition-all hover:bg-zinc-900/30 active:bg-zinc-900/60 cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="relative shrink-0">
                                                            {item.users.length > 1 ? (
                                                                <div className="relative h-11 w-11">
                                                                    <Avatar
                                                                        src={item.users[0].avatarUrl}
                                                                        size="xs"
                                                                        className="absolute top-0 left-0 h-8 w-8 border-2 border-black"
                                                                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.users[0].username}`); }}
                                                                    />
                                                                    <Avatar
                                                                        src={item.users[1].avatarUrl}
                                                                        size="xs"
                                                                        className="absolute bottom-0 right-0 h-8 w-8 border-2 border-black"
                                                                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.users[1].username}`); }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <Avatar
                                                                    src={item.users[0].avatarUrl}
                                                                    size="md"
                                                                    className="h-11 w-11"
                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.users[0].username}`); }}
                                                                />
                                                            )}
                                                            {item.isUnread && (
                                                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            {renderNotificationText(item)}
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                                        {renderAction(item)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
