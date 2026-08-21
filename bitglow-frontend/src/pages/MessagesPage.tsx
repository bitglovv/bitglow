import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { InboxSidebar } from "../components/chat/InboxSidebar";
import { ChatWindow } from "../components/chat/ChatWindow";
import { EmptyChatState } from "../components/chat/EmptyChatState";
import { useChatStore } from "../store/chatStore";
import { useVisualViewport } from "../hooks/useVisualViewport";
import { api, Conversation } from "../services/api";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ReportSheet } from "../components/common/ReportSheet";
import { blockUserEverywhere, unblockUserEverywhere, muteUserEverywhere, unmuteUserEverywhere, reportUser } from "../utils/socialActions";

const STACKED_MAX_PX = 767;

function isStackedMessagesLayout() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${STACKED_MAX_PX}px)`).matches;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dmChatPushedRef = useRef(false);
  const handledTargetRef = useRef<string | null>(null);

  const {
    conversations,
    friends,
    messages,
    activeConversationId,
    activeConversationUser,
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
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
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
  }, [setActiveConversation]);

  useEffect(() => {
    document.title = "BitGlow";
  }, []);

  useEffect(() => {
    fetchConversationsAndFriends();
  }, [fetchConversationsAndFriends]);

  useEffect(() => {
    // Extract target user from location state, search params, or sessionStorage
    const stateUser = (location.state as any)?.directDmUser as { id: string; username?: string; displayName?: string; avatarUrl?: string } | undefined;
    const queryUserId = searchParams.get("userId") || undefined;
    const queryUsername = searchParams.get("username") || searchParams.get("user") || undefined;
    const sessionUserId = sessionStorage.getItem("bitglow:dmUserId") || undefined;
    const sessionUsername = sessionStorage.getItem("bitglow:dmUsername") || undefined;
    const sessionDisplayName = sessionStorage.getItem("bitglow:dmDisplayName") || undefined;
    const sessionAvatarUrl = sessionStorage.getItem("bitglow:dmAvatarUrl") || undefined;

    const targetId = stateUser?.id || queryUserId || sessionUserId;
    if (!targetId) return;

    // Clear session storage so it doesn't linger across unrelated navigations
    sessionStorage.removeItem("bitglow:dmUserId");
    sessionStorage.removeItem("bitglow:dmUsername");
    sessionStorage.removeItem("bitglow:dmDisplayName");
    sessionStorage.removeItem("bitglow:dmAvatarUrl");

    // Don't re-run if we already opened this exact user
    if (handledTargetRef.current === targetId) return;
    handledTargetRef.current = targetId;

    // Gather available metadata
    let targetUsername = stateUser?.username || queryUsername || sessionUsername || "";
    let targetDisplayName = stateUser?.displayName || sessionDisplayName || targetUsername;
    let targetAvatarUrl = stateUser?.avatarUrl || sessionAvatarUrl;

    // If metadata is incomplete, check current snapshot in chatStore
    const currentConversations = useChatStore.getState().conversations;
    const currentFriends = useChatStore.getState().friends;
    const existingConv = currentConversations.find((c) => c.userId === targetId);
    const existingFriend = currentFriends.find((f) => f.id === targetId);

    if (existingConv) {
      targetUsername = targetUsername || existingConv.username || "";
      targetDisplayName = targetDisplayName || existingConv.displayName || targetUsername;
      targetAvatarUrl = targetAvatarUrl || existingConv.avatarUrl;
    } else if (existingFriend) {
      targetUsername = targetUsername || existingFriend.username || "";
      targetDisplayName = targetDisplayName || existingFriend.displayName || targetUsername;
      targetAvatarUrl = targetAvatarUrl || existingFriend.avatarUrl;
    }

    const targetUserObj = {
      id: targetId,
      username: targetUsername,
      displayName: targetDisplayName,
      avatarUrl: targetAvatarUrl,
    };

    // Open target user conversation immediately
    openFriendConversation(targetUserObj);
    setMobileView("chat");

    // If target username is still empty, fetch user info asynchronously to populate chat header
    if (!targetUsername) {
      api.user.get(targetId)
        .then((fetchedUser) => {
          if (fetchedUser && handledTargetRef.current === targetId) {
            openFriendConversation({
              id: fetchedUser.id,
              username: fetchedUser.username || "",
              displayName: fetchedUser.displayName || fetchedUser.username || "",
              avatarUrl: fetchedUser.avatarUrl,
            });
          }
        })
        .catch(() => {});
    }
  }, [location.state, searchParams, openFriendConversation]);

  const activeConversation = useMemo<Conversation | null>(() => {
    if (!activeConversationId) return null;
    const found = conversations.find((c) => c.userId === activeConversationId);
    if (found) return found;

    if (activeConversationUser && activeConversationUser.id === activeConversationId) {
      return {
        id: activeConversationUser.id,
        userId: activeConversationUser.id,
        username: activeConversationUser.username || "",
        displayName: activeConversationUser.displayName || activeConversationUser.username || "",
        avatarUrl: activeConversationUser.avatarUrl,
        unreadCount: 0,
      };
    }

    return null;
  }, [conversations, activeConversationId, activeConversationUser]);

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
    handledTargetRef.current = userId;
    const fromInbox = mobileView === "inbox";
    setActiveConversation(userId);
    setMobileView("chat");
    if (fromInbox) pushMobileDmHistory();
  };

  const handleOpenFromFriend = (friend: any) => {
    const friendId = friend.id || friend.userId;
    handledTargetRef.current = friendId;
    const fromInbox = mobileView === "inbox";
    openFriendConversation({
      id: friendId,
      username: friend.username || "",
      displayName: friend.displayName || friend.username || "",
      avatarUrl: friend.avatarUrl,
    });
    setSearchTerm("");
    setMobileView("chat");
    if (fromInbox) pushMobileDmHistory();
  };

  const handleChatBack = () => {
    handledTargetRef.current = null;
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

  const handleUnblockActive = async () => {
    if (!activeTarget) return;
    setActionLoading(true);
    try {
      await unblockUserEverywhere(activeTarget.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setActionLoading(false);
      setShowUnblockConfirm(false);
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

  const handleUnmuteActive = async () => {
    if (!activeTarget || actionLoading) return;
    setActionLoading(true);
    try {
      await unmuteUserEverywhere(activeTarget.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unmute user");
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
      style={{ height: viewport.height ? `${viewport.height}px` : "100dvh" }}
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
                    setActiveTab("chats");
                  } catch (e) {
                    console.error("Failed to accept message request", e);
                    window.alert("Failed to accept message request");
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
              onUnmuteUser={() => void handleUnmuteActive()}
              onBlockUser={() => setShowBlockConfirm(true)}
              onUnblockUser={() => setShowUnblockConfirm(true)}
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
        message={<div>Block @{activeTarget?.username}? This closes the chat and prevents them from messaging or following you.</div>}
        confirmLabel="Block"
        cancelLabel="Cancel"
        loading={actionLoading}
        onConfirm={handleBlockActive}
        onClose={() => setShowBlockConfirm(false)}
      />
      <ConfirmDialog
        open={showUnblockConfirm}
        title="Unblock user"
        message={<div>Unblock @{activeTarget?.username}? This will allow you and this user to exchange messages again.</div>}
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        loading={actionLoading}
        onConfirm={handleUnblockActive}
        onClose={() => setShowUnblockConfirm(false)}
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
