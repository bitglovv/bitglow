const isLoopbackHost = (value?: string | null) => {
    if (!value) return false;
    try {
        const host = new URL(value).hostname;
        return host === "localhost" || host === "127.0.0.1";
    } catch {
        return value.includes("localhost") || value.includes("127.0.0.1");
    }
};

/** Returns true for private/LAN IPs (192.168.x, 10.x, 172.16-31.x, 169.254.x) */
const isPrivateNetworkHost = (hostname: string) =>
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname);

const getApiHost = () => {
    const envHost = (import.meta as any).env?.VITE_API_HOST as string | undefined;
    const hostname = window.location.hostname;

    // Case 1: localhost — straightforward local dev
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return envHost ?? "http://127.0.0.1:3003";
    }

    // Case 2: LAN / private network IP (phone/tablet on same WiFi as dev machine)
    // Backend is on the same machine — use same hostname but port 3003
    if (isPrivateNetworkHost(hostname)) {
        // If VITE_API_HOST is explicitly set to a non-loopback address, use it
        if (envHost && !isLoopbackHost(envHost)) return envHost;
        // Otherwise auto-derive: same IP, port 3003
        return `http://${hostname}:3003`;
    }

    // Case 3: Public domain (Vercel, etc.) — VITE_API_HOST MUST point to Render backend
    if (envHost && !isLoopbackHost(envHost)) {
        return envHost;
    }

    // VITE_API_HOST not configured for production — warn loudly
    console.error(
        "[BitGlow] VITE_API_HOST is not configured for production. " +
        "Add VITE_API_HOST=https://bitglow-backend-hh2h.onrender.com to your Vercel environment variables."
    );
    return "https://bitglow-backend-hh2h.onrender.com"; // safe fallback for this project
};

const API_HOST = getApiHost();
export const API_URL = `${API_HOST}/api`;

export type User = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    website?: string;
    location?: string;
    email?: string;
    followsCount?: number;
    followersCount?: number;
    activityCount?: number;
    friendsCount?: number;
    postsCount?: number;
    isPrivate?: boolean;
    onlineStatusVisible?: boolean;
};

export type DMMessage = {
    id: string;
    senderId: string;
    text: string;
    type: 'text' | 'post' | 'profile';
    postId?: string;
    profileId?: string;
    createdAt: string;
};

export type Conversation = {
    userId: string;
    username: string;
    avatarUrl?: string;
    lastMessage?: string;
    lastMessageSenderId?: string | null;
    lastMessageAt?: string | null;
    unreadCount?: number;
    pinned?: boolean;
};

export type LiveRoom = {
    id: string;
    ownerId: string;
    ownerUsername: string;
    ownerDisplayName?: string | null;
    ownerAvatarUrl?: string | null;
    isMine: boolean;
    createdAt: string;
    lastMessageAt?: string | null;
};

export type Friend = {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
};

export type FollowStatus = "pending" | "accepted";

export type Post = {
    id: string;
    title?: string;
    content: string;
    visibility: "public" | "friends";
    createdAt: string;
    author: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    likesCount?: number;
    commentsCount?: number;
    savesCount?: number;
    likedByMe?: boolean;
    savedByMe?: boolean;
};

export type Comment = {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    likesCount: number;
    likedByMe: boolean;
};

export type Notification =
    | { type: "like"; user: User; postId: string; createdAt: string }
    | { type: "comment"; user: User; postId: string; content: string; createdAt: string }
    | { type: "comment_like"; user: User; postId: string; content: string; createdAt: string }
    | { type: "follow_request"; user: User; createdAt: string }
    | { type: "follow"; user: User; createdAt: string }
    | { type: "follow_back"; user: User; createdAt: string }
    | { type: "mention"; user: User; postId?: string; createdAt: string }
    | { type: "dm"; user: User; content: string; createdAt: string };

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
    const hasBody = options.body !== undefined;
    const headers = {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    let fullUrl: string;
    if (url.startsWith("http")) {
        fullUrl = url;
    } else if (url.startsWith("/api")) {
        fullUrl = `${API_HOST}${url}`;
    } else if (url.startsWith("/")) {
        fullUrl = `${API_URL}${url}`;
    } else {
        fullUrl = `${API_URL}/${url}`;
    }

    const res = await fetch(fullUrl, {
        ...options,
        headers,
    });

    return res;
}

async function readErrorMessage(res: Response, fallback: string) {
    const text = await res.text();
    if (!text) return fallback;

    try {
        const json = JSON.parse(text);
        return json.error || json.message || fallback;
    } catch {
        return text || fallback;
    }
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

async function performLoginRequest(payload: Record<string, string>) {
    return fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

async function readAuthResponse(res: Response): Promise<{ token: string; user: User }> {
    const data = await res.json();
    const token = data?.token;
    const user = data?.user;

    if (!token || !user) {
        throw new Error("Login response missing token or user");
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    return { token, user };
}

async function resolveEmailFromUsername(username: string): Promise<string | null> {
    const res = await fetch(`${API_URL}/profile/${encodeURIComponent(username)}`);
    if (!res.ok) return null;

    const profile = await parseJsonSafe<{ email?: string }>(res);
    return profile?.email?.trim() || null;
}

export const api = {
    auth: {
        login: async (identifier: string, password: string): Promise<{ token: string; user: User }> => {
            const normalizedIdentifier = identifier.trim();

            let res = await performLoginRequest({
                identifier: normalizedIdentifier,
                email: normalizedIdentifier,
                username: normalizedIdentifier,
                password,
            });

            if (res.ok) {
                return readAuthResponse(res);
            }

            const primaryError = await readErrorMessage(res, "Login failed");

            res = await performLoginRequest({
                email: normalizedIdentifier,
                password,
            });

            if (res.ok) {
                return readAuthResponse(res);
            }

            if (!normalizedIdentifier.includes("@")) {
                const resolvedEmail = await resolveEmailFromUsername(normalizedIdentifier);
                if (resolvedEmail) {
                    res = await performLoginRequest({
                        email: resolvedEmail,
                        password,
                    });

                    if (res.ok) {
                        return readAuthResponse(res);
                    }
                }
            }

            throw new Error(primaryError);
        },
        signup: async (data: any): Promise<{ token: string; user: User }> => {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Signup failed"));
            }
            return readAuthResponse(res);
        },
        me: async (): Promise<User> => {
            const res = await fetchWithAuth("/api/me");
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to fetch user: ${res.status} ${errorText}`);
            }
            return res.json();
        },
    },
    user: {
        list: async (): Promise<User[]> => {
            const res = await fetchWithAuth("/users");
            if (!res.ok) return [];
            return res.json();
        },
        checkUsername: async (username: string): Promise<{ available: boolean }> => {
            const res = await fetchWithAuth(`/api/username/check?u=${encodeURIComponent(username)}`);
            if (!res.ok) {
                // If the backend is an older build without this route, allow save and rely on PUT /api/me (409) to reject duplicates.
                return { available: res.status === 404 };
            }
            return res.json();
        },
        get: async (id: string): Promise<User> => {
            const res = await fetchWithAuth(`/users/${id}`);
            if (!res.ok) throw new Error("User not found");
            return res.json();
        },
        update: async (data: Partial<User>): Promise<User> => {
            const res = await fetchWithAuth("/api/me", {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        deleteAccount: async (identifier: string, password: string): Promise<boolean> => {
            const res = await fetchWithAuth("/api/me", {
                method: "DELETE",
                body: JSON.stringify({ identifier, password }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to delete account"));
            }
            return true;
        },
        follow: async (userId: string, username?: string): Promise<FollowStatus | null> => {
            const res = await fetchWithAuth(`/users/${userId}/follow`, {
                method: "POST",
                body: JSON.stringify(username ? { username } : {}),
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.status || null;
        },
        unfollow: async (userId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/users/${userId}/follow`, {
                method: "DELETE",
            });
            return res.ok;
        },
        friends: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/friends");
            if (!res.ok) return [];
            const data = await res.json();
            return data.friends || [];
        },
        followers: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/followers");
            if (!res.ok) return [];
            const data = await res.json();
            return data.followers || [];
        },
        following: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/following");
            if (!res.ok) return [];
            const data = await res.json();
            return data.following || [];
        },
        followRequests: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/follow/requests");
            if (!res.ok) return [];
            const data = await res.json();
            return data.requests || [];
        },
        pendingFollows: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/follow/pending");
            if (!res.ok) return [];
            const data = await res.json();
            return data.pending || [];
        },
        acceptFollow: async (followerId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/follow/requests/${followerId}/accept`, { method: "POST" });
            return res.ok;
        },
    },
    profile: {
        get: async (username: string): Promise<User> => {
            const res = await fetchWithAuth(`/api/profile/${username}`);
            if (!res.ok) throw new Error("Profile not found");
            return res.json();
        },
        me: async (): Promise<User> => {
            const res = await fetchWithAuth("/api/me");
            if (!res.ok) throw new Error("Failed to fetch my profile");
            return res.json();
        }
    },
    live: {
        rooms: async (): Promise<LiveRoom[]> => {
            const res = await fetchWithAuth("/live/rooms");
            if (!res.ok) return [];
            const data = await res.json();
            return data.rooms || [];
        },
        openRoom: async (ownerId?: string): Promise<LiveRoom | null> => {
            const res = await fetchWithAuth("/live/rooms", {
                method: "POST",
                body: JSON.stringify(ownerId ? { ownerId } : {}),
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.room || null;
        }
    },
    dms: {
        list: async (): Promise<Conversation[]> => {
            const res = await fetchWithAuth("/dms");
            if (!res.ok) return [];
            return res.json();
        },
        history: async (userId: string): Promise<DMMessage[]> => {
            const res = await fetchWithAuth(`/dms/${userId}`);
            if (!res.ok) return [];
            return res.json();
        },
        send: async (userId: string, text: string, type: 'text' | 'post' | 'profile' = 'text', postId?: string, profileId?: string, clientMsgId?: string): Promise<DMMessage | null> => {
            const res = await fetchWithAuth(`/dms/${userId}`, {
                method: "POST",
                body: JSON.stringify({ text, type, postId, profileId, clientMsgId }),
            });
            if (!res.ok) return null;
            return res.json();
        },
        markRead: async (userId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/dms/${userId}/read`, {
                method: "POST",
            });
            return res.ok;
        },
        deleteConversation: async (userId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/dms/${userId}`, {
                method: "DELETE",
            });
            return res.ok;
        }
    },
    posts: {
        feed: async (): Promise<Post[]> => {
            const res = await fetchWithAuth("/posts/feed");
            if (!res.ok) return [];
            const data = await res.json();
            return (data.posts || []).map((p: any) => {
                const likes = Number(p.likesCount ?? p.likes_count ?? p.likes ?? p.count ?? 0) || 0;
                const comments = Number(p.commentsCount ?? p.comments_count ?? 0) || 0;
                const saves = Number(p.savesCount ?? p.saves_count ?? 0) || 0;
                return {
                    ...p,
                    likesCount: likes,
                    commentsCount: comments,
                    savesCount: saves,
                    likedByMe: p.likedByMe ?? !!p.liked_by_me,
                    savedByMe: p.savedByMe ?? !!p.saved_by_me,
                };
            });
        },
        get: async (postId: string): Promise<Post | null> => {
            console.log(`API: fetching /posts/${postId}`);
            const res = await fetchWithAuth(`/posts/${postId}`);
            if (!res.ok) {
                const error = await readErrorMessage(res, "Post not found");
                throw new Error(error);
            }
            const data = await res.json();
            const p = data.post;
            if (!p) return null;
            return {
                ...p,
                likesCount: Number(p.likesCount ?? p.likes_count ?? 0),
                commentsCount: Number(p.commentsCount ?? p.comments_count ?? 0),
                savesCount: Number(p.savesCount ?? p.saves_count ?? 0),
                likedByMe: p.likedByMe ?? !!p.liked_by_me,
                savedByMe: p.savedByMe ?? !!p.saved_by_me,
            };
        },
        create: async (payload: { title?: string; content: string; visibility?: "public" | "friends" }): Promise<Post | null> => {
            const res = await fetchWithAuth("/posts", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.post || null;
        },
        like: async (postId: string): Promise<{ liked: boolean; likesCount: number } | null> => {
            const res = await fetchWithAuth(`/posts/${postId}/like`, { method: "POST" });
            if (!res.ok) return null;
            const json = await res.json();
            return { liked: !!json.liked, likesCount: Number(json.likesCount ?? json.likes_count ?? json.count ?? 0) || 0 };
        },
        save: async (postId: string): Promise<{ saved: boolean; savesCount: number } | null> => {
            const res = await fetchWithAuth(`/posts/${postId}/save`, { method: "POST" });
            if (!res.ok) return null;
            return res.json();
        },
        comment: async (postId: string, content: string): Promise<{ comment: Comment } | null> => {
            const res = await fetchWithAuth(`/posts/${postId}/comment`, {
                method: "POST",
                body: JSON.stringify({ content }),
            });
            if (!res.ok) return null;
            return res.json();
        },
        likeComment: async (commentId: string): Promise<{ liked: boolean; likesCount: number } | null> => {
            const res = await fetchWithAuth(`/comments/${commentId}/like`, { method: "POST" });
            if (!res.ok) return null;
            return res.json();
        },
        deleteComment: async (commentId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/comments/${commentId}`, { method: "DELETE" });
            return res.ok;
        },
        comments: async (postId: string): Promise<Comment[]> => {
            const res = await fetchWithAuth(`/posts/${postId}/comments`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.comments || [];
        },
        update: async (postId: string, payload: { title?: string; content: string }) => {
            const res = await fetchWithAuth(`/posts/${postId}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const error = await readErrorMessage(res, "Failed to update post");
                throw new Error(error);
            }
            const data = await res.json();
            const p = data.post;
            if (!p) return null;
            return {
                ...p,
                likesCount: Number(p.likesCount ?? p.likes_count ?? 0),
                commentsCount: Number(p.commentsCount ?? p.comments_count ?? 0),
                savesCount: Number(p.savesCount ?? p.saves_count ?? 0),
                likedByMe: p.likedByMe ?? !!p.liked_by_me,
                savedByMe: p.savedByMe ?? !!p.saved_by_me,
                createdAt: p.createdAt || p.created_at,
                updatedAt: p.updatedAt || p.updated_at,
            };
        },
        delete: async (postId: string) => {
            const res = await fetchWithAuth(`/posts/${postId}`, { method: "DELETE" });
            return res.ok;
        },
    },
    notifications: {
        list: async (): Promise<Notification[]> => {
            const res = await fetchWithAuth("/notifications");
            if (!res.ok) return [];
            const data = await res.json();
            return data.notifications || [];
        }
    },
    settings: {
        changeEmail: async (currentPassword: string, newEmail: string) => {
            const res = await fetchWithAuth("/settings/email", {
                method: "PUT",
                body: JSON.stringify({ currentPassword, newEmail }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to change email"));
            return res.json();
        },
        changePassword: async (currentPassword: string, newPassword: string) => {
            const res = await fetchWithAuth("/settings/password", {
                method: "PUT",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to change password"));
            return res.json();
        },
        updatePrivacy: async (isPrivate: boolean) => {
            const res = await fetchWithAuth("/settings/privacy", {
                method: "PUT",
                body: JSON.stringify({ isPrivate }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to update privacy"));
            return res.json();
        },
        updateOnlineStatus: async (isVisible: boolean) => {
            const res = await fetchWithAuth("/settings/online-status", {
                method: "PUT",
                body: JSON.stringify({ isVisible }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to update online status"));
            return res.json();
        },
        getBlockedUsers: async () => {
            const res = await fetchWithAuth("/settings/blocked");
            if (!res.ok) return [];
            const data = await res.json();
            return data.blockedUsers || [];
        },
        blockUser: async (userId: string) => {
            const res = await fetchWithAuth(`/settings/blocked/${userId}`, { method: "POST" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to block user"));
            return res.json();
        },
        unblockUser: async (userId: string) => {
            const res = await fetchWithAuth(`/settings/blocked/${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to unblock user"));
            return res.json();
        },
        getSavedPosts: async () => {
            const res = await fetchWithAuth("/settings/saved");
            if (!res.ok) return [];
            const data = await res.json();
            return data.savedPosts || [];
        },
        reportProblem: async (type: string, reason: string, reportedUserId?: string, postId?: string) => {
            const res = await fetchWithAuth("/settings/reports", {
                method: "POST",
                body: JSON.stringify({ type, reason, reportedUserId, postId }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to submit report"));
            return res.json();
        }
    }
};
