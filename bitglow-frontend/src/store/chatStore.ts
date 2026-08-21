import { create } from 'zustand';
import { api, Conversation, DMMessage, Friend } from '../services/api';

interface ChatState {
  conversations: Conversation[];
  friends: Friend[];
  messages: Record<string, DMMessage[]>;
  activeConversationId: string | null;
  activeConversationUser: Friend | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingUsers: Set<string>;
  onlineUsers: Set<string>;

  // local restriction sets
  restrictedUsers: Set<string>;
  mutedUsers: Set<string>;

  // Actions
  fetchConversationsAndFriends: () => Promise<void>;
  fetchHistory: (userId: string) => Promise<void>;
  setActiveConversation: (userId: string | null) => void;
  openFriendConversation: (friend: Friend) => void;
  sendMessage: (userId: string, text: string, currentUserId: string) => Promise<void>;
  editMessage: (userId: string, messageId: string, text: string) => Promise<void>;
  deleteMessage: (userId: string, messageId: string) => Promise<void>;
  forwardMessage: (targetUserId: string, messageId: string) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, isOnline: boolean) => void;
  handleIncomingMessage: (msg: DMMessage & { receiverId: string }, currentUserId: string, clientMsgId?: string) => void;
  handleEditedMessage: (msg: DMMessage & { receiverId: string }, currentUserId: string) => void;
  handleDeletedMessage: (event: { messageId: string; senderId: string; receiverId: string; latestMessage: DMMessage | null }, currentUserId: string) => void;
  blockLocal: (userId: string) => void;
  unblockLocal: (userId: string) => void;
  muteLocal: (userId: string) => void;
  unmuteLocal: (userId: string) => void;
  maskLocal: (userId: string, masked: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  friends: [],
  messages: {},
  activeConversationId: null,
  activeConversationUser: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingUsers: new Set(),
  onlineUsers: new Set(),
  restrictedUsers: new Set(),
  mutedUsers: new Set(),

  fetchConversationsAndFriends: async () => {
    set({ isLoadingConversations: true });
    try {
      const [convs, friendList, serverBlocked, serverMuted] = await Promise.all([
        api.dms.list(),
        api.user.friends(),
        api.settings.getBlockedUsers().catch(() => []),
        api.settings.getMutedUsers().catch(() => []),
      ]);
      
      // Normalize avatar fields returned by different backend endpoints (avatar, avatar_url, avatarUrl)
      const normalizeAvatar = (obj: any) => {
        if (!obj) return undefined;
        return obj.avatarUrl ?? obj.avatar ?? obj.avatar_url ?? undefined;
      };

      const normalizedConversations = (convs || []).map((c: any) => ({
        ...c,
        avatarUrl: normalizeAvatar(c),
      }));

      const normalizedFriends = (friendList || []).map((f: any) => ({
        ...f,
        avatarUrl: normalizeAvatar(f),
      }));

      // Server is the authoritative source for blocked/muted users
      const restricted = new Set<string>((serverBlocked || []).map((u: any) => u?.id).filter(Boolean));
      try { localStorage.setItem("bitglow:restricted_users", JSON.stringify(Array.from(restricted))); } catch (e) {}

      const muted = new Set<string>((serverMuted || []).map((u: any) => u?.id).filter(Boolean));
      try { localStorage.setItem("bitglow:muted_users", JSON.stringify(Array.from(muted))); } catch (e) {}

      // Keep conversations intact even for users marked as restricted so DM history is preserved locally.
      // Server-side access rules still prevent blocked users from viewing profile/posts/messages as appropriate.
      // The UI components will react to restrictedUsers/mutedUsers via events and store reads.
      set({ conversations: normalizedConversations, friends: normalizedFriends, restrictedUsers: restricted, mutedUsers: muted });
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  fetchHistory: async (userId: string) => {
    const { messages } = get();
    if (messages[userId]) {
      await api.dms.markRead(userId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.userId === userId ? { ...c, unreadCount: 0 } : c
        )
      }));
      return;
    }

    set({ isLoadingMessages: true });
    try {
      const history = await api.dms.history(userId);
      set((state) => ({
        messages: { ...state.messages, [userId]: history },
        conversations: state.conversations.map((c) =>
          c.userId === userId ? { ...c, unreadCount: 0 } : c
        )
      }));
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  setActiveConversation: (userId: string | null) => {
    set({ activeConversationId: userId, activeConversationUser: null });
    if (userId) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.userId === userId ? { ...c, unreadCount: 0 } : c
        )
      }));
      get().fetchHistory(userId);
    }
  },

  openFriendConversation: (friend: Friend) => {
    const { conversations } = get();
    const existing = conversations.find((c) => c.userId === friend.id);

    if (!existing) {
      // Do not add empty conversations to the inbox until the first message is sent.
      set({ activeConversationId: friend.id, activeConversationUser: friend });
      get().fetchHistory(friend.id);
      return;
    }

    get().setActiveConversation(friend.id);
  },

  sendMessage: async (userId: string, text: string, currentUserId: string) => {
    const optimisticMsg: DMMessage = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      text,
      type: 'text',
      createdAt: new Date().toISOString(),
    };

    // Optimistic Update
    set((state) => {
      const prevMsgs = state.messages[userId] || [];
      const convs = [...state.conversations];
      const idx = convs.findIndex((c) => c.userId === userId);
      
      if (idx !== -1) {
        const copy = {
          ...convs[idx],
          lastMessage: text,
          lastMessageAt: optimisticMsg.createdAt,
          unreadCount: 0,
        };
        convs.splice(idx, 1);
        convs.unshift(copy);
      }

      return {
        messages: {
          ...state.messages,
          [userId]: [...prevMsgs, optimisticMsg]
        },
        conversations: convs
      };
    });

    // API Call
    try {
      const savedMsg = await api.dms.send(userId, text, 'text', undefined, undefined, optimisticMsg.id);
      if (savedMsg) {
        set((state) => {
          const convs = [...state.conversations];
          const idx = convs.findIndex((c) => c.userId === userId);

          if (idx !== -1) {
            const updated = {
              ...convs[idx],
              lastMessage: savedMsg.text,
              lastMessageAt: savedMsg.createdAt,
            };
            convs.splice(idx, 1);
            convs.unshift(updated);
          } else if (state.activeConversationUser) {
            convs.unshift({
              userId,
              username: state.activeConversationUser.username,
              displayName: state.activeConversationUser.displayName,
              avatarUrl: state.activeConversationUser.avatarUrl,
              lastMessage: savedMsg.text,
              lastMessageAt: savedMsg.createdAt,
              unreadCount: 0,
            });
          } else {
            convs.unshift({
              userId,
              username: "",
              displayName: "",
              lastMessage: savedMsg.text,
              lastMessageAt: savedMsg.createdAt,
              unreadCount: 0,
            });
          }

          return {
            messages: {
              ...state.messages,
              [userId]: (state.messages[userId] || []).map((m) =>
                m.id === optimisticMsg.id ? savedMsg : m
              )
            },
            conversations: convs,
            activeConversationUser: null,
          };
        });
      }
    } catch (err: any) {
      set((state) => ({
        messages: {
          ...state.messages,
          [userId]: (state.messages[userId] || []).filter((m) => m.id !== optimisticMsg.id),
        },
      }));
      window.alert(err instanceof Error ? err.message : "Failed to send message");
    }
  },

  editMessage: async (userId: string, messageId: string, text: string) => {
    const previousMessages = get().messages[userId] || [];
    const previousMessage = previousMessages.find((message) => message.id === messageId);
    if (!previousMessage) return;
    const isLatest = previousMessages[previousMessages.length - 1]?.id === messageId;
    const editedAt = new Date().toISOString();
    set((state) => ({
      messages: {
        ...state.messages,
        [userId]: (state.messages[userId] || []).map((message) =>
          message.id === messageId ? { ...message, text, editedAt } : message
        ),
      },
      conversations: isLatest
        ? state.conversations.map((conversation) =>
            conversation.userId === userId ? { ...conversation, lastMessage: text } : conversation
          )
        : state.conversations,
    }));
    try {
      await api.dms.edit(userId, messageId, text);
    } catch (error) {
      set((state) => ({
        messages: {
          ...state.messages,
          [userId]: (state.messages[userId] || []).map((message) =>
            message.id === messageId ? previousMessage : message
          ),
        },
        conversations: isLatest
          ? state.conversations.map((conversation) =>
              conversation.userId === userId ? { ...conversation, lastMessage: previousMessage.text } : conversation
            )
          : state.conversations,
      }));
      throw error;
    }
  },

  deleteMessage: async (userId: string, messageId: string) => {
    const previousMessages = get().messages[userId] || [];
    const previousConversations = get().conversations;
    const remaining = previousMessages.filter((message) => message.id !== messageId);
    const latest = remaining[remaining.length - 1];
    set((state) => ({
      messages: { ...state.messages, [userId]: remaining },
      conversations: state.conversations.map((conversation) =>
        conversation.userId === userId
          ? {
              ...conversation,
              lastMessage: latest ? (latest.isForwarded ? `Forwarded: ${latest.text}` : latest.text) : "",
              lastMessageSenderId: latest?.senderId || null,
              lastMessageAt: latest?.createdAt || null,
            }
          : conversation
      ),
    }));
    try {
      await api.dms.deleteMessage(userId, messageId);
    } catch (error) {
      set((state) => ({
        messages: { ...state.messages, [userId]: previousMessages },
        conversations: previousConversations,
      }));
      throw error;
    }
  },

  forwardMessage: async (targetUserId: string, messageId: string) => {
    await api.dms.forward(targetUserId, messageId);
  },

  setTyping: (userId: string, isTyping: boolean) => set((state) => {
    const next = new Set(state.typingUsers);
    if (isTyping) next.add(userId);
    else next.delete(userId);
    return { typingUsers: next };
  }),

  setOnline: (userId: string, isOnline: boolean) => set((state) => {
    const next = new Set(state.onlineUsers);
    if (isOnline) next.add(userId);
    else next.delete(userId);
    return { onlineUsers: next };
  }),

  handleIncomingMessage: (msg: DMMessage & { receiverId: string }, currentUserId: string, clientMsgId?: string) => {
    const { activeConversationId, restrictedUsers, mutedUsers } = get();
    const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    const isMe = msg.senderId === currentUserId;
    if (restrictedUsers.has(otherUserId)) return;

    set((state) => {
      const prevMsgs = state.messages[otherUserId] || [];
      let newMsgs = [...prevMsgs];
      let replaced = false;

      if (clientMsgId) {
        const tempIdx = newMsgs.findIndex((m) => m.id === clientMsgId);
        if (tempIdx !== -1) {
          newMsgs[tempIdx] = {
            id: msg.id,
            senderId: msg.senderId,
            text: msg.text,
            createdAt: msg.createdAt,
            type: msg.type,
            postId: msg.postId,
            profileId: msg.profileId,
          };
          replaced = true;
        }
      }

      if (!replaced) {
        if (newMsgs.some((m) => m.id === msg.id)) {
          return {}; // Message already exists, avoid duplicates
        }
        newMsgs.push(msg);
      }

      const convs = [...state.conversations];
      const idx = convs.findIndex((c) => c.userId === otherUserId);
      const isActive = activeConversationId === otherUserId;
      const unreadDelta = !isMe && !isActive && !mutedUsers.has(otherUserId) ? 1 : 0;

      if (idx !== -1) {
        const copy = {
          ...convs[idx],
          lastMessage: msg.isForwarded ? `Forwarded: ${msg.text}` : msg.text,
          lastMessageAt: msg.createdAt,
          lastMessageSenderId: msg.senderId,
          unreadCount: (convs[idx].unreadCount ?? 0) + unreadDelta,
        };
        convs.splice(idx, 1);
        convs.unshift(copy);
      } else {
        // Conversation not in sidebar yet, fetch full list and friends to populate
        setTimeout(() => {
          get().fetchConversationsAndFriends();
        }, 100);
      }

      return {
        messages: {
          ...state.messages,
          [otherUserId]: newMsgs,
        },
        conversations: convs,
      };
    });

    if (!isMe && activeConversationId === otherUserId) {
      void api.dms.markRead(otherUserId);
    }
  },

  handleEditedMessage: (msg, currentUserId) => {
    const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    set((state) => {
      const currentMessages = state.messages[otherUserId] || [];
      const conversation = state.conversations.find((item) => item.userId === otherUserId);
      const isLatest = currentMessages[currentMessages.length - 1]?.id === msg.id
        || conversation?.lastMessageAt === msg.createdAt;
      return {
        messages: {
          ...state.messages,
          [otherUserId]: currentMessages.map((item) => item.id === msg.id ? { ...item, ...msg } : item),
        },
        conversations: isLatest
          ? state.conversations.map((conversation) =>
              conversation.userId === otherUserId
                ? { ...conversation, lastMessage: msg.text }
                : conversation
            )
          : state.conversations,
      };
    });
  },

  handleDeletedMessage: (event, currentUserId) => {
    const otherUserId = event.senderId === currentUserId ? event.receiverId : event.senderId;
    set((state) => ({
      messages: {
        ...state.messages,
        [otherUserId]: (state.messages[otherUserId] || []).filter((message) => message.id !== event.messageId),
      },
      conversations: state.conversations.map((conversation) =>
        conversation.userId === otherUserId
          ? {
              ...conversation,
              lastMessage: event.latestMessage?.text || "",
              lastMessageSenderId: event.latestMessage?.senderId || null,
              lastMessageAt: event.latestMessage?.createdAt || null,
            }
          : conversation
      ),
    }));
  },

  blockLocal: (userId: string) => {
    set((state) => {
      const next = new Set(state.restrictedUsers);
      next.add(userId);
      try { localStorage.setItem("bitglow:restricted_users", JSON.stringify(Array.from(next))); } catch (e) {}

      // Preserve conversation history and messages for audit / UX reasons.
      // Only mark the user as restricted and remove them from friends list locally.
      // Active conversation is cleared if it was the blocked user.
      return {
        restrictedUsers: next,
        friends: state.friends.filter((f) => f.id !== userId),
        activeConversationId: state.activeConversationId === userId ? null : state.activeConversationId,
      } as any;
    });
  },


  unblockLocal: (userId: string) => {
    set((state) => {
      const next = new Set(state.restrictedUsers);
      next.delete(userId);
      try { localStorage.setItem("bitglow:restricted_users", JSON.stringify(Array.from(next))); } catch (e) {}
      return { restrictedUsers: next } as any;
    });
  },

  muteLocal: (userId: string) => {
    set((state) => {
      const next = new Set(state.mutedUsers);
      next.add(userId);
      try { localStorage.setItem("bitglow:muted_users", JSON.stringify(Array.from(next))); } catch (e) {}
      return { mutedUsers: next } as any;
    });
  },

  unmuteLocal: (userId: string) => {
    set((state) => {
      const next = new Set(state.mutedUsers);
      next.delete(userId);
      try { localStorage.setItem("bitglow:muted_users", JSON.stringify(Array.from(next))); } catch (e) {}
      return { mutedUsers: next } as any;
    });
  },

  maskLocal: (userId: string, masked: boolean) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.userId === userId
          ? {
              ...c,
              isMasked: masked,
              isBlockedByOther: masked,
              displayName: masked ? "BitGlow User" : (c.displayName === "BitGlow User" ? c.username : c.displayName),
              username: masked ? "bitglow_user" : c.username,
              avatarUrl: masked ? undefined : c.avatarUrl,
            }
          : c
      ),
    }));
  },
}));

// listen for global block/mute/masked events to keep multiple UI surfaces in sync
if (typeof window !== 'undefined') {
  window.addEventListener('bitglow:block-changed', (e: Event) => {
    const ev = e as CustomEvent;
    const { userId, blocked } = ev.detail || {};
    if (!userId) return;
    const state = useChatStore.getState();
    if (blocked) state.blockLocal(userId);
    else state.unblockLocal(userId);
  });

  window.addEventListener('bitglow:masked-changed', (e: Event) => {
    const ev = e as CustomEvent;
    const { userId, masked } = ev.detail || {};
    if (!userId) return;
    useChatStore.getState().maskLocal(userId, Boolean(masked));
  });

  window.addEventListener('bitglow:mute-changed', (e: Event) => {
    const ev = e as CustomEvent;
    const { userId, muted } = ev.detail || {};
    if (!userId) return;
    const state = useChatStore.getState();
    if (muted) state.muteLocal(userId);
    else state.unmuteLocal(userId);
  });
}
