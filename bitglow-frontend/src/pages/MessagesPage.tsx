import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/common/Header";
import { Avatar } from "../components/ui/Avatar";
import MessageInput from "../components/chat/MessageInput";
import { api, Conversation, DMMessage, Friend } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, MessageSquare, Search, MoreVertical, Edit3, ShieldAlert } from "lucide-react";
import clsx from "clsx";

export default function MessagesPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<DMMessage[]>([]);
    const [view, setView] = useState<"inbox" | "chat">("inbox");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendQuery, setFriendQuery] = useState("");
    const [inboxTab, setInboxTab] = useState<"chats"| "requests">("chats");

    useEffect(() => { document.title = "BitGlow \u2022 Messages"; }, []);

    useEffect(() => {
        api.dms.list().then(setConversations).catch(console.error);
        api.user.friends().then(setFriends).catch(() => setFriends([]));
    }, []);

    useEffect(() => {
        const pendingId = sessionStorage.getItem("bitglow:dmUserId");
        if (pendingId) {
            setSelectedId(pendingId);
            sessionStorage.removeItem("bitglow:dmUserId");
        }
    }, []);

    useEffect(() => {
        if (selectedId) {
            api.dms.history(selectedId).then(setMessages).catch((err) => {
                console.error(err);
                setMessages([]);
            });
            setView("chat");
        } else {
            setView("inbox");
        }
    }, [selectedId]);

    const handleSelect = (id: string) => {
        setFriendQuery(""); // Clear search when selecting friend to chat
        setSelectedId(id);
    };

    const handleBack = () => {
        setSelectedId(null);
    };

    const handleSend = async (text: string) => {
        if (!selectedId) return;
        const sent = await api.dms.send(selectedId, text);
        if (!sent) return;

        setMessages((prev) => [...prev, sent]);

        setConversations((prev) => {
            const exists = prev.find((c) => c.userId === selectedId);
            if (exists) {
                return prev.map((c) =>
                    c.userId === selectedId
                        ? { ...c, lastMessage: sent.text }
                        : c
                );
            }
            return prev;
        });

        const alreadyInList = conversations.some((c) => c.userId === selectedId);
        if (!alreadyInList) {
            try {
                const u = await api.user.get(selectedId);
                setConversations((prev) => [
                    {
                        userId: u.id,
                        username: u.username,
                        displayName: u.displayName || u.username,
                        avatarUrl: u.avatarUrl,
                        lastMessage: sent.text,
                        unreadCount: 0
                    },
                    ...prev
                ]);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const currentConv = conversations.find(c => c.userId === selectedId);
    
    // If not in conversations, maybe it's a new friend chat
    const activeChatUser = currentConv || friends.find(f => f.id === selectedId);

    const filteredFriends = friends.filter((f) => {
        if (!friendQuery.trim()) return true;
        const q = friendQuery.toLowerCase();
        return f.username?.toLowerCase().includes(q);
    });

    return (
        <div className="h-screen bg-black flex flex-col text-white selection:bg-brand/30 overflow-hidden">
            {/* Header with Top Bar hidden for pure messaging app feel, keeping bottom nav intact */}
            <Header showTop={false} />

            <main className="flex-1 w-full flex overflow-hidden">

                {/* Inbox List Area */}
                <div className={clsx(
                    "w-full md:w-[400px] flex-shrink-0 flex flex-col border-r border-white/5 transition-all duration-300",
                    view === "chat" ? "hidden md:flex" : "flex"
                )}>
                    {/* Top Bar Flush */}
                    <div className="pt-6 md:pt-8 px-6 pb-2 space-y-4 border-b border-white/5 bg-zinc-950/50">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black tracking-tight">Messages</h2>
                            <button className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                                <Edit3 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-brand transition-colors" />
                            <input
                                className="w-full bg-white/[0.04] border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:bg-white/[0.06] transition-all"
                                placeholder="Search friends..."
                                value={friendQuery}
                                onChange={(e) => setFriendQuery(e.target.value)}
                            />
                        </div>

                        {/* Tabs */}
                        {!friendQuery.trim() && (
                            <div className="flex items-center gap-6 text-[15px] font-semibold pt-1">
                                <button 
                                    onClick={() => setInboxTab("chats")}
                                    className={clsx("pb-2.5 border-b-2 transition-all duration-300", inboxTab === "chats" ? "border-brand text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                                >
                                    Chats
                                </button>
                                <button 
                                    onClick={() => setInboxTab("requests")}
                                    className={clsx("pb-2.5 border-b-2 transition-all duration-300 flex items-center gap-1.5", inboxTab === "requests" ? "border-brand text-white" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                                >
                                    Requests
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-[90px] md:pb-0">
                        {friendQuery.trim() ? (
                            // Search Mode
                            <div className="py-2">
                                <div className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Friends</div>
                                {filteredFriends.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-600 text-sm font-medium">No friends found</div>
                                ) : (
                                    filteredFriends.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => handleSelect(f.id)}
                                            className="w-full flex items-center gap-4 px-6 py-3 transition-all text-left hover:bg-white/[0.03]"
                                        >
                                            <Avatar src={f.avatarUrl} alt={f.username} size="md" />
                                            <span className="font-semibold text-sm text-white flex-1">{f.username}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : inboxTab === "chats" ? (
                            // Chats Mode
                            <>
                                {conversations.map(conv => (
                                    <button
                                        key={conv.userId}
                                        onClick={() => handleSelect(conv.userId)}
                                        className={clsx(
                                            "w-full flex items-center gap-4 px-6 py-4 transition-all text-left relative",
                                            selectedId === conv.userId
                                                ? "bg-white/[0.05]"
                                                : "hover:bg-white/[0.02]"
                                        )}
                                    >
                                        {selectedId === conv.userId && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
                                        )}
                                        <div className="shrink-0 pointer-events-none">
                                            <Avatar src={conv.avatarUrl} alt={conv.username} size="md" status="online" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="font-semibold text-[15px] text-white truncate">
                                                        {conv.username}
                                                    </span>
                                                    {(conv.unreadCount ?? 0) > 0 && selectedId !== conv.userId && (
                                                        <div className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0 ml-2">2m ago</span>
                                            </div>
                                            <p className={clsx(
                                                "text-sm truncate",
                                                (conv.unreadCount ?? 0) > 0 && selectedId !== conv.userId ? "text-white font-semibold" : "text-zinc-500"
                                            )}>
                                                {conv.lastMessage || "Start a conversation"}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                                {conversations.length === 0 && (
                                    <div className="p-12 text-center text-zinc-600">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        <p className="text-[15px] font-medium text-white/40">No active chats.</p>
                                        <p className="text-sm mt-1">Search friends to start one.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Requests Mode
                            <div className="p-12 text-center text-zinc-600">
                                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                <p className="text-[15px] font-medium text-white/40">No message requests.</p>
                                <p className="text-sm mt-1">Messages from non-friends will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={clsx(
                    "flex-1 flex flex-col relative",
                    view === "inbox" ? "hidden md:flex" : "flex"
                )}>
                    {selectedId ? (
                        <>
                            {/* Chat Header Flush Top */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl z-10 md:pt-6">
                                <div className="flex items-center gap-4">
                                    <button onClick={handleBack} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <Link to={`/profile/${activeChatUser?.username ?? ""}`} className="shrink-0 group">
                                        <Avatar src={activeChatUser?.avatarUrl} alt={activeChatUser?.username} size="sm" status="online" />
                                    </Link>
                                    <div className="flex flex-col">
                                        <Link to={`/profile/${activeChatUser?.username ?? ""}`} className="font-bold text-[15px] leading-tight hover:underline">
                                            {activeChatUser?.username || "Unknown File"}
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Message Feed */}
                            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 custom-scrollbar">
                                {messages.map(m => (
                                    <div key={m.id} className={clsx(
                                        "flex group animate-in slide-in-from-bottom-2 duration-300",
                                        m.senderId === user?.id ? "justify-end" : "justify-start"
                                    )}>
                                        <div className={clsx(
                                            "max-w-[75%] md:max-w-[60%] space-y-1.5",
                                            m.senderId === user?.id ? "items-end" : "items-start"
                                        )}>
                                            <div className={clsx(
                                                "px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                                                m.senderId === user?.id
                                                    ? "bg-brand text-black font-semibold rounded-br-sm"
                                                    : "bg-zinc-900 border border-white/5 text-white rounded-bl-sm"
                                            )}>
                                                {m.text}
                                            </div>
                                            <span className={clsx("text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 opacity-0 group-hover:opacity-100 transition-opacity", m.senderId === user?.id ? "block text-right" : "block text-left")}>
                                                Delivered
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-white/5 bg-black/80 backdrop-blur-xl pb-[90px] md:pb-4">
                                <MessageInput onSend={handleSend} />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-zinc-950/20">
                            <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
                                <MessageSquare className="w-10 h-10 text-white/20" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-white">Your Messages</h3>
                            <p className="text-zinc-500 text-[15px] max-w-sm">Chat securely with friends or check your direct requests from other users.</p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
