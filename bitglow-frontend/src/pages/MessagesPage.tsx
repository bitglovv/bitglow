import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { InboxSidebar } from "../components/chat/InboxSidebar";
import { ChatWindow } from "../components/chat/ChatWindow";
import { EmptyChatState } from "../components/chat/EmptyChatState";
import { useChatStore } from "../store/chatStore";
import { useVisualViewport } from "../hooks/useVisualViewport";
import { api } from "../services/api";

const STACKED_MAX_PX = 767;

function isStackedMessagesLayout() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${STACKED_MAX_PX}px)`).matches;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const dmChatPushedRef = useRef(false);
  const {
    conversations,
    friends,
    messages,
    activeConversationId,
    isLoadingConversations,
    isLoadingMessages,
    typingUsers,
    onlineUsers,
    fetchConversationsAndFriends,
    setActiveConversation,
    openFriendConversation,
    sendMessage,
  } = useChatStore();

  const [mobileView, setMobileView] = useState<"inbox" | "chat">("inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const [isStackedLayout, setIsStackedLayout] = useState(isStackedMessagesLayout);
  const [acceptedRequests, setAcceptedRequests] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("bitglow:accepted_requests") || "[]"));
    } catch (e) {
      return new Set();
    }
  });
  const viewport = useVisualViewport();

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${STACKED_MAX_PX}px)`);
    const apply = () => setIsStackedLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname !== "/messages") return;
      dmChatPushedRef.current = false;
      setMobileView("inbox");
      setActiveConversation(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.title = "BitGlow";
  }, []);

  useEffect(() => {
    fetchConversationsAndFriends();
  }, [fetchConversationsAndFriends]);

  const [hasProcessedInitialDm, setHasProcessedInitialDm] = useState(false);

  useEffect(() => {
    if (isLoadingConversations || hasProcessedInitialDm) return;

    const dmUserId = sessionStorage.getItem("bitglow:dmUserId");
    if (dmUserId) {
      setHasProcessedInitialDm(true);
      const dmUsername = sessionStorage.getItem("bitglow:dmUsername") || "";
      const dmDisplayName = sessionStorage.getItem("bitglow:dmDisplayName") || "";
      const dmAvatarUrl = sessionStorage.getItem("bitglow:dmAvatarUrl") || undefined;
      
      sessionStorage.removeItem("bitglow:dmUserId");
      sessionStorage.removeItem("bitglow:dmUsername");
      sessionStorage.removeItem("bitglow:dmDisplayName");
      sessionStorage.removeItem("bitglow:dmAvatarUrl");

      openFriendConversation({
        id: dmUserId,
        username: dmUsername,
        displayName: dmDisplayName,
        avatarUrl: dmAvatarUrl,
      });
      setMobileView("chat");
    }
  }, [isLoadingConversations, hasProcessedInitialDm, openFriendConversation]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.userId === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  const pushMobileDmHistory = () => {
    if (!isStackedMessagesLayout()) return;
    window.history.pushState({ bitglowDmChat: true }, "", window.location.pathname);
    dmChatPushedRef.current = true;
  };

  const handleSelectConversation = (userId: string) => {
    const fromInbox = mobileView === "inbox";
    setActiveConversation(userId);
    setMobileView("chat");
    if (fromInbox) pushMobileDmHistory();
  };

  const handleOpenFromFriend = (friend: any) => {
    const fromInbox = mobileView === "inbox";
    openFriendConversation(friend);
    setSearchTerm("");
    setMobileView("chat");
    if (fromInbox) pushMobileDmHistory();
  };

  const handleChatBack = () => {
    setMobileView("inbox");
    setActiveConversation(null);
    if (dmChatPushedRef.current) {
      dmChatPushedRef.current = false;
      window.history.back();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversationId || !user) return;
    await sendMessage(activeConversationId, text, user.id);
  };

  const showMobileInbox = mobileView === "inbox";

  return (
    <div
      className="fixed left-0 right-0 top-0 bg-black flex flex-col text-white overflow-hidden"
      style={{ height: `${viewport.height}px` }}
    >
      <Header hideBottomNav={mobileView === "chat"} />
      <div className="flex-1 min-h-0 flex overflow-hidden bg-black relative">
        {/* Inbox sidebar: shown on mobile inbox view or always on md+ */}
        <div
          className={
            showMobileInbox
              ? "flex flex-col w-full md:flex-none md:w-[360px] lg:w-[400px] xl:w-[420px] animate-chat-pane-in"
              : "hidden md:flex md:w-[360px] lg:w-[400px] xl:w-[420px]"
          }
        >
          <InboxSidebar
            conversations={conversations}
            friends={friends}
            activeConversationId={activeConversationId}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectConversation={handleSelectConversation}
            onSelectFriend={handleOpenFromFriend}
            isLoading={isLoadingConversations}
            onlineUsers={onlineUsers}
            currentUserId={user?.id || null}
          />
        </div>

        <div
          className={
            showMobileInbox ? "hidden md:flex md:flex-1 md:min-h-0" : "flex flex-1 min-h-0 animate-chat-pane-in"
          }
        >
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              messages={activeMessages}
              currentUserId={user?.id || ""}
              isTyping={activeConversationId ? typingUsers.has(activeConversationId) : false}
              onBack={handleChatBack}
              showHeaderBack={isStackedLayout && mobileView === "chat"}
              onSendMessage={handleSendMessage}
              onTyping={() => {}}
              isOnline={activeConversationId ? onlineUsers.has(activeConversationId) : false}
              isLoadingMessages={isLoadingMessages}
              isRequest={activeConversationId ? (
                !friends.some(f => f.id === activeConversationId) && 
                activeConversation?.lastMessageSenderId !== user?.id &&
                !!activeConversation?.lastMessageSenderId &&
                !acceptedRequests.has(activeConversationId)
              ) : false}
              onAcceptRequest={async () => {
                if (activeConversationId) {
                  try {
                    // 1. Follow back so it forms a path to mutual follow
                    await api.user.follow(activeConversationId, activeConversation.username);
                    // 2. Also try accepting their follow request in case they already tried following us
                    await api.user.acceptFollow(activeConversationId).catch(() => {});

                    // 3. Mark as accepted in localStorage to move out of requests instantly
                    const accepted = new Set(JSON.parse(localStorage.getItem("bitglow:accepted_requests") || "[]"));
                    accepted.add(activeConversationId);
                    localStorage.setItem("bitglow:accepted_requests", JSON.stringify([...accepted]));
                    setAcceptedRequests(accepted);

                    await fetchConversationsAndFriends();
                  } catch (e) {
                    console.error("Failed to accept request", e);
                  }
                }
              }}
              onRejectRequest={async () => {
                if (activeConversationId) {
                  try {
                    await api.dms.deleteConversation(activeConversationId);
                    // Add them to restricted local storage list so they can't message again (front-end hack)
                    const restricted = new Set(JSON.parse(localStorage.getItem("bitglow:restricted_users") || "[]"));
                    restricted.add(activeConversationId);
                    localStorage.setItem("bitglow:restricted_users", JSON.stringify([...restricted]));
                    
                    await fetchConversationsAndFriends();
                    handleChatBack();
                  } catch (e) {
                    console.error("Failed to reject request", e);
                  }
                }
              }}
            />
          ) : (
            <EmptyChatState />
          )}
        </div>
      </div>
    </div>
  );
}
