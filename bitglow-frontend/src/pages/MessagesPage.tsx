import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { InboxSidebar } from "../components/chat/InboxSidebar";
import { ChatWindow } from "../components/chat/ChatWindow";
import { EmptyChatState } from "../components/chat/EmptyChatState";
import { useChatStore } from "../store/chatStore";

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
    document.title = "BitGlow - Messages";
  }, []);

  useEffect(() => {
    fetchConversationsAndFriends();
  }, [fetchConversationsAndFriends]);

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
    <div className="h-[100dvh] bg-black flex flex-col text-white overflow-hidden pt-[env(safe-area-inset-top,0px)]">
      <Header showTop={false} hideBottomNav={mobileView === "chat"} />
      <div className="flex flex-1 min-h-0 overflow-hidden bg-black relative">
        {/* Inbox sidebar: shown on mobile inbox view or always on md+ */}
        <div
          className={
            showMobileInbox
              ? "flex flex-1 min-h-0 md:flex-none md:w-[360px] lg:w-[400px] xl:w-[420px] pb-[84px] md:pb-0 animate-chat-pane-in"
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
          />
        </div>

        <div
          className={
            showMobileInbox ? "hidden md:flex md:flex-1 md:min-h-0" : "flex flex-1 min-h-0 animate-chat-pane-in pt-[env(safe-area-inset-top,0px)]"
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
            />
          ) : (
            <EmptyChatState />
          )}
        </div>
      </div>
    </div>
  );
}
