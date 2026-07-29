import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { InboxSidebar } from "../components/chat/InboxSidebar";
import { ChatWindow } from "../components/chat/ChatWindow";
import { EmptyChatState } from "../components/chat/EmptyChatState";
import { useChatStore } from "../store/chatStore";
import { useVisualViewport } from "../hooks/useVisualViewport";
import { api } from "../services/api";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ReportSheet } from "../components/common/ReportSheet";
import { blockUserEverywhere, muteUserEverywhere, reportUser } from "../utils/socialActions";

const STACKED_MAX_PX = 767;

function isStackedMessagesLayout() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${STACKED_MAX_PX}px)`).matches;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    editMessage,
    deleteMessage,
    forwardMessage,
  } = useChatStore();

  const [mobileView, setMobileView] = useState<"inbox" | "chat">("inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const [isStackedLayout, setIsStackedLayout] = useState(isStackedMessagesLayout);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
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

  const forwardTargets = useMemo(() => {
    const targets = new Map<string, { userId: string; username: string; displayName?: string; avatarUrl?: string }>();
    conversations.forEach((item) => {
      if (item.userId !== activeConversationId && item.userId !== user?.id) {
        targets.set(item.userId, item);
      }
    });
    friends.forEach((item) => {
      if (item.id !== activeConversationId && item.id !== user?.id && !targets.has(item.id)) {
        targets.set(item.id, {
          userId: item.id,
          username: item.username,
          displayName: item.displayName,
          avatarUrl: item.avatarUrl,
        });
      }
    });
    return [...targets.values()];
  }, [activeConversationId, conversations, friends, user?.id]);

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

  const activeTarget = activeConversation ? {
    id: activeConversation.userId,
    username: activeConversation.username,
    displayName: activeConversation.displayName,
    avatarUrl: activeConversation.avatarUrl,
  } : null;

  const handleBlockActive = async () => {
    if (!activeTarget) return;
    setActionLoading(true);
    try {
      await blockUserEverywhere(activeTarget);
      setActiveConversation(null);
      setMobileView("inbox");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setActionLoading(false);
      setShowBlockConfirm(false);
    }
  };

  const handleMuteActive = async () => {
    if (!activeTarget || actionLoading) return;
    setActionLoading(true);
    try {
      await muteUserEverywhere(activeTarget);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to mute user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportActive = async (reason: string) => {
    if (!activeTarget) return;
    try {
      await reportUser(activeTarget.id, reason);
      setShowReportSheet(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to submit report");
    }
  };

  const showMobileInbox = mobileView === "inbox";

  return (
    <div
      className="fixed left-0 right-0 top-0 bg-black flex flex-col text-white overflow-hidden"
      style={{ height: `${viewport.height}px` }}
    >
      <Header hideBottomNav={mobileView === "chat"} />
      <div className="flex-1 min-h-0 flex overflow-hidden bg-black relative w-full max-w-5xl mx-auto px-4 md:px-6">
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
              onEditMessage={(messageId, text) => editMessage(activeConversation.userId, messageId, text)}
              onDeleteMessage={(messageId) => deleteMessage(activeConversation.userId, messageId)}
              forwardTargets={forwardTargets}
              onForwardMessage={(messageId, targetUserId) => forwardMessage(targetUserId, messageId)}
              onTyping={() => {}}
              isOnline={activeConversationId ? onlineUsers.has(activeConversationId) : false}
              isLoadingMessages={isLoadingMessages}
              isRequest={activeConversation?.conversationStatus === 'pending'}
              onAcceptRequest={async () => {
                if (activeConversationId) {
                  try {
                    await api.settings.acceptDMRequest(activeConversationId);
                    await fetchConversationsAndFriends();
                  } catch (e) {
                    console.error("Failed to accept message request", e);
                  }
                }
              }}
              onRejectRequest={async () => {
                if (activeConversationId) {
                  try {
                    await api.settings.rejectDMRequest(activeConversationId);
                    await fetchConversationsAndFriends();
                    handleChatBack();
                  } catch (e) {
                    console.error("Failed to reject message request", e);
                  }
                }
              }}
              onViewProfile={() => navigate(`/profile/${activeConversation.username}`)}
              onMuteUser={() => void handleMuteActive()}
              onBlockUser={() => setShowBlockConfirm(true)}
              onReportUser={() => setShowReportSheet(true)}
            />
          ) : (
            <EmptyChatState />
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showBlockConfirm}
        title="Block user"
        message={<div>Block @{activeTarget?.username}? This closes the chat and prevents future messages.</div>}
        confirmLabel="Block"
        cancelLabel="Cancel"
        loading={actionLoading}
        onConfirm={handleBlockActive}
        onClose={() => setShowBlockConfirm(false)}
      />
      <ReportSheet
        isOpen={showReportSheet}
        title="Report User"
        prompt={`Why are you reporting @${activeTarget?.username || "this user"}?`}
        options={["Harassment or bullying", "Spam or scams", "Hate speech", "Impersonation", "Inappropriate content"]}
        onClose={() => setShowReportSheet(false)}
        onSubmit={handleReportActive}
      />
    </div>
  );
}
