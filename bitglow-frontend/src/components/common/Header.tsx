import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Avatar } from "../ui/Avatar";
import { Send, Bell, User, House, Search } from "lucide-react";
import clsx from "clsx";
import LiveChatIcon from "../../assets/icons/live-chat.svg";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function Header({ showTop = true, hideActions = false, hideBottomNav = false }: { showTop?: boolean; hideActions?: boolean; hideBottomNav?: boolean }) {
    const { user } = useAuth();
    const location = useLocation();
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

    useEffect(() => {
        if (!user) return;

        const checkStatus = async () => {
            try {
                // Check messages
                const convs = await api.dms.list();
                setHasUnreadMessages(convs.some(c => (c.unreadCount ?? 0) > 0));

                // Check notifications
                const notes = await api.notifications.list();
                const seenStr = localStorage.getItem("bitglow:seen_notifications");
                const seenIds = new Set(seenStr ? JSON.parse(seenStr) : []);

                const hasUnseen = notes.some(n => {
                    const id = `${n.type}-${n.user.id}-${new Date(n.createdAt).getTime()}`;
                    return !seenIds.has(id);
                });
                setHasUnreadNotifications(hasUnseen);
            } catch (e) {
                console.error("Failed to check status", e);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [user?.id, location.pathname]);

    if (!user) return null;

    const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    const isHome = isActive("/home");

    return (
        <>
            {showTop && (
                <header className="bg-black/95 backdrop-blur-xl sticky top-0 z-[100] w-full">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5">
                        <Link to="/home" className="flex items-center gap-2.5 group">
                            {isHome && (
                                <span
                                    className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity"
                                    style={{ fontFamily: "'Billabong','Pacifico','Brush Script MT',cursive" }}
                                >
                                    BitGlow
                                </span>
                            )}
                        </Link>

                        <nav className="hidden md:flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                            <Link to="/home" className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                                isActive('/home') ? "bg-brand text-black shadow-lg shadow-brand/20" : "text-zinc-500"
                            )}>
                                <House className="w-3 h-3" />
                                <span>Home</span>
                            </Link>
                            <Link to="/search" className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all group hover:text-white",
                                isActive('/search') ? "bg-brand text-black shadow-lg shadow-brand/20" : "text-zinc-500"
                            )}>
                                <Search className="w-3 h-3" />
                                <span>Search</span>
                            </Link>
                            <Link to="/live" className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all group hover:text-white",
                                isActive('/live') ? "bg-brand text-black shadow-lg shadow-brand/20" : "text-zinc-500"
                            )}>
                                <img src={LiveChatIcon} alt="Live" className={clsx("live-icon transition-all", isActive('/live') ? "brightness-0" : "opacity-50 group-hover:opacity-100")} />
                                <span>Live</span>
                            </Link>
                            <Link to="/messages" className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all group hover:text-white",
                                isActive('/messages') ? "bg-brand text-black shadow-lg shadow-brand/20" : "text-zinc-500"
                            )}>
                                <div className="relative">
                                    <Send className="w-3 h-3" />
                                    {hasUnreadMessages && !isActive('/messages') && (
                                        <div className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-brand rounded-full border border-black" />
                                    )}
                                </div>
                                <span>Messages</span>
                            </Link>
                            <Link to={`/profile/${user.username}`} className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-all group",
                                isActive('/profile') ? "bg-brand text-black shadow-lg shadow-brand/20" : "text-zinc-100 hover:text-white"
                            )}>
                                <div className={clsx(
                                    "relative shrink-0 rounded-full transition-all",
                                    isActive('/profile') ? "ring-1 ring-black ring-offset-1 ring-offset-brand" : "ring-1 ring-white/5"
                                )}>
                                    <Avatar src={user.avatarUrl} alt={user.username} size="xs" className="block mx-auto" />
                                </div>
                                <span className={isActive('/profile') ? "font-bold" : ""}>Profile</span>
                            </Link>
                        </nav>

                        {location.pathname === "/search" || hideActions || !isHome ? null : (
                            <div className="flex items-center gap-2">
                                {location.pathname === "/live" && (
                                    <Link
                                        to="/live"
                                        className="p-2.5 rounded-xl transition-all text-zinc-500 hover:text-white hover:bg-white/5 flex items-center gap-2"
                                        aria-label="Live Chat"
                                    >
                                        <img src={LiveChatIcon} alt="Live" className="live-icon-lg" />
                                        <span className="hidden md:inline text-sm font-semibold">Live Chat</span>
                                    </Link>
                                )}
                                <Link
                                    to="/notifications"
                                    className="p-2.5 rounded-xl transition-all text-zinc-500 hover:text-white hover:bg-white/5 relative"
                                    aria-label="Notifications"
                                >
                                    <Bell className="w-6 h-6" />
                                    {hasUnreadNotifications && !isActive('/notifications') && (
                                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand rounded-full border-2 border-zinc-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    )}
                                </Link>
                            </div>
                        )}

                    </div>
                </header>
            )}
            {!hideBottomNav && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-black pb-[env(safe-area-inset-bottom)]">
                    <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center justify-around">
                        <Link to="/home" className={clsx("p-2 transition-all", isActive('/home') ? "text-white" : "text-zinc-500")}>
                            <House className="w-6 h-6" />
                        </Link>
                        <Link to="/search" className={clsx("p-2 transition-all", isActive('/search') ? "text-white" : "text-zinc-500")}>
                            <Search className="w-6 h-6" />
                        </Link>
                        <Link to="/live" className={clsx("p-2 transition-all", isActive('/live') ? "text-white" : "text-zinc-500")}>
                            <img
                                src={LiveChatIcon}
                                alt="Live"
                                className={clsx("w-10 h-10 transition-all", isActive('/live') ? "brightness-100" : "opacity-50 grayscale brightness-75")}
                            />
                        </Link>
                        <Link to="/messages" className={clsx("p-2 transition-all relative", isActive('/messages') ? "text-white" : "text-zinc-500")}>
                            <Send className="w-6 h-6" />
                            {hasUnreadMessages && !isActive('/messages') && (
                                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand rounded-full border-0 border-black shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            )}
                        </Link>
                        <Link to={`/profile/${user.username}`} className="flex items-center justify-center">
                            <div className={clsx(
                                "relative shrink-0 w-6 h-6 rounded-full transition-all duration-100 flex items-center justify-center",
                                isActive('/profile') ? "ring-[1.5px] ring-white ring-offset-2 ring-offset-zinc-950 scale-90" : "ring-0"
                            )}>
                                <Avatar
                                    src={user.avatarUrl}
                                    alt={user.username}
                                    size="xs"
                                    className="!w-full !h-6"
                                />
                            </div>
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
