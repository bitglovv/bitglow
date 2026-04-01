const isLoopbackHost = (value?: string | null) => {
    if (!value) return false;
    try {
        const host = new URL(value).hostname;
        return host === "localhost" || host === "127.0.0.1";
    } catch {
        return value.includes("localhost") || value.includes("127.0.0.1");
    }
};

const getApiHost = () => {
    const envHost = (import.meta as any).env?.VITE_API_HOST as string | undefined;
    const hostname = window.location.hostname;
    const isRemoteDeviceHost = !!hostname && hostname !== "localhost" && hostname !== "127.0.0.1";

    if (isRemoteDeviceHost) {
        if (!envHost || isLoopbackHost(envHost)) {
            return `http://${hostname}:3003`;
        }
        return envHost;
    }

    if (envHost) return envHost;
    return "http://127.0.0.1:3003";
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
};

export type DMMessage = {
    id: string;
    senderId: string;
    text: string;
    createdAt: string;
};

export type Conversation = {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    lastMessage?: string;
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

export type Notification =
    | { type: "like"; user: User; postId: string; createdAt: string }
    | { type: "comment"; user: User; postId: string; content: string; createdAt: string }
    | { type: "follow_request"; user: User; createdAt: string };

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

    if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
    }

    return res;
}

export const api = {
    auth: {
        login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || json.message || text);
                } catch {
                    throw new Error(text || "Login failed");
                }
            }
            return res.json();
        },
        signup: async (data: any): Promise<{ token: string; user: User }> => {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || json.message || text);
                } catch {
                    throw new Error(text || "Signup failed");
                }
            }
            return res.json();
        },
        me: async (): Promise<User> => {
            console.log("API: Calling /api/me");
            const res = await fetchWithAuth("/api/me");
            console.log("API: Response status", res.status);
            if (!res.ok) {
                const errorText = await res.text();
                console.log("API: Error response", errorText);
                throw new Error(`Failed to fetch user: ${res.status} ${errorText}`);
            }
            const userData = await res.json();
            console.log("API: User data received", userData);
            return userData;
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
        acceptFollow: async (followerId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/follow/requests/${followerId}/accept`, { method: "POST" });
            return res.ok;
        },
    },
    profile: {
        get: async (username: string): Promise<User> => {
            const res = await fetchWithAuth(`/profile/${username}`);
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
        send: async (userId: string, text: string): Promise<DMMessage | null> => {
            const res = await fetchWithAuth(`/dms/${userId}`, {
                method: "POST",
                body: JSON.stringify({ text }),
            });
            if (!res.ok) return null;
            return res.json();
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
        comment: async (postId: string, content: string) => {
            const res = await fetchWithAuth(`/posts/${postId}/comment`, {
                method: "POST",
                body: JSON.stringify({ content }),
            });
            if (!res.ok) return null;
            return res.json();
        },
        comments: async (postId: string) => {
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
            if (!res.ok) return null;
            const data = await res.json();
            return data.post || null;
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
    }
};
