import { useEffect, useMemo, useState } from "react";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { InboxSidebar } from "../components/chat/InboxSidebar";
import { ChatWindow } from "../components/chat/ChatWindow";
import { EmptyChatState } from "../components/chat/EmptyChatState";
import { useChatStore } from "../store/chatStore";

export default function MessagesPage() {
  const { user } = useAuth();
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

  const handleSelectConversation = (userId: string) => {
    setActiveConversation(userId);
    setMobileView("chat");
  };

  const handleOpenFromFriend = (friend: any) => {
    openFriendConversation(friend);
    setSearchTerm("");
    setMobileView("chat");
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversationId || !user) return;
    await sendMessage(activeConversationId, text, user.id);
  };

  const showMobileInbox = mobileView === "inbox";

  return (
    <div className="h-[100dvh] bg-black flex flex-col text-white overflow-hidden">
      <Header showTop={false} hideBottomNav={mobileView === "chat"} />
      <div className="flex flex-1 min-h-0 overflow-hidden bg-black">
        {/* Inbox sidebar: shown on mobile inbox view or always on md+ */}
        <div
          className={
            showMobileInbox
              ? "flex flex-1 min-h-0 md:flex-none md:w-[360px] lg:w-[400px] xl:w-[420px] pb-[72px] md:pb-0 animate-chat-pane-in"
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
            showMobileInbox ? "hidden md:flex md:flex-1 md:min-h-0" : "flex flex-1 min-h-0 animate-chat-pane-in"
          }
        >
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              messages={activeMessages}
              currentUserId={user?.id || ""}
              isTyping={activeConversationId ? typingUsers.has(activeConversationId) : false}
              onBack={() => setMobileView("inbox")}
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
