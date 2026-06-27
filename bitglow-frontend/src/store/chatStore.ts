import { create } from 'zustand';
import { api, Conversation, DMMessage, Friend } from '../services/api';

interface ChatState {
  conversations: Conversation[];
  friends: Friend[];
  messages: Record<string, DMMessage[]>;
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingUsers: Set<string>;
  onlineUsers: Set<string>;

  // Actions
  fetchConversationsAndFriends: () => Promise<void>;
  fetchHistory: (userId: string) => Promise<void>;
  setActiveConversation: (userId: string | null) => void;
  openFriendConversation: (friend: Friend) => void;
  sendMessage: (userId: string, text: string, currentUserId: string) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, isOnline: boolean) => void;
  handleIncomingMessage: (msg: DMMessage & { receiverId: string }, currentUserId: string, clientMsgId?: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  friends: [],
  messages: {},
  activeConversationId: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingUsers: new Set(),
  onlineUsers: new Set(),

  fetchConversationsAndFriends: async () => {
    set({ isLoadingConversations: true });
    try {
      const [convs, friendList] = await Promise.all([api.dms.list(), api.user.friends()]);
      
      const restrictedStr = localStorage.getItem("bitglow:restricted_users") || "[]";
      let restricted = new Set<string>();
      try {
          restricted = new Set(JSON.parse(restrictedStr));
      } catch (e) {}

      const filteredConvs = convs.filter(c => !restricted.has(c.userId));

      set({ conversations: filteredConvs, friends: friendList });
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
    set({ activeConversationId: userId });
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
      set({
        conversations: [
          {
            userId: friend.id,
            username: friend.username,
            displayName: friend.displayName || friend.username,
            avatarUrl: friend.avatarUrl,
            lastMessage: "",
            unreadCount: 0,
          },
          ...conversations,
        ]
      });
    }
    get().setActiveConversation(friend.id);
  },

  sendMessage: async (userId: string, text: string, currentUserId: string) => {
    const optimisticMsg: DMMessage = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      text,
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
    const savedMsg = await api.dms.send(userId, text, 'text', undefined, undefined, optimisticMsg.id);
    if (savedMsg) {
      // Replace optimistic message
      set((state) => ({
        messages: {
          ...state.messages,
          [userId]: (state.messages[userId] || []).map((m) =>
            m.id === optimisticMsg.id ? savedMsg : m
          )
        },
        conversations: state.conversations.map((c) =>
          c.userId === userId ? { ...c, lastMessage: savedMsg.text, lastMessageAt: savedMsg.createdAt } : c
        )
      }));
    }
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
    const { activeConversationId } = get();
    const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    const isMe = msg.senderId === currentUserId;

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
      const unreadDelta = !isMe && !isActive ? 1 : 0;

      if (idx !== -1) {
        const copy = {
          ...convs[idx],
          lastMessage: msg.text,
          lastMessageAt: msg.createdAt,
          lastMessageSenderId: msg.senderId,
          unreadCount: convs[idx].unreadCount + unreadDelta,
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
}));
