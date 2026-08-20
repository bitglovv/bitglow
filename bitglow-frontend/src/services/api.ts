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

    // VITE_API_HOST not configured for production — fail loudly so misconfiguration
    // is caught at deploy time rather than silently routing to a hardcoded host.
    const msg =
        "[BitGlow] VITE_API_HOST is not set for a production build. " +
        "Add VITE_API_HOST=https://<your-backend>.onrender.com to your Vercel environment variables.";
    console.error(msg);
    throw new Error(msg)
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
    isVerified?: boolean;
};

export type DMMessage = {
    id: string;
    senderId: string;
    text: string;
    type: 'text' | 'post' | 'profile';
    postId?: string;
    profileId?: string;
    editedAt?: string | null;
    isForwarded?: boolean;
    createdAt: string;
};

export type Conversation = {
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    lastMessage?: string;
    lastMessageSenderId?: string | null;
    lastMessageAt?: string | null;
    unreadCount?: number;
    pinned?: boolean;
    conversationStatus?: 'pending' | 'accepted';
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
    isVerified?: boolean;
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

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        return null;
    }

    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });

            if (!res.ok) {
                // Refresh token is expired, invalid, or revoked
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("bitglow:auth-expired"));
                }
                return null;
            }

            const data = await res.json();
            if (data?.token) {
                localStorage.setItem("token", data.token);
                if (data?.refreshToken) {
                    localStorage.setItem("refreshToken", data.refreshToken);
                }
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("bitglow:auth-refreshed", { detail: { token: data.token } }));
                }
                return data.token as string;
            }
            return null;
        } catch (error) {
            console.error("Token refresh failed due to network error", error);
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let token = localStorage.getItem("token");
    const hasBody = options.body !== undefined && !(options.body instanceof FormData);
    const headers: Record<string, string> = {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
    } as Record<string, string>;
    if (token) headers.Authorization = `Bearer ${token}`;

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

    let res = await fetch(fullUrl, {
        ...options,
        headers,
    });

    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/signup");
    if (res.status === 401 && !isAuthEndpoint) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            const retryHeaders: Record<string, string> = {
                ...headers,
                Authorization: `Bearer ${newToken}`,
            };
            res = await fetch(fullUrl, {
                ...options,
                headers: retryHeaders,
            });
        }
    }

    return res;
}

export const ERROR_MAPPINGS: Record<string, string> = {
    INVALID_CREDENTIALS: "Invalid username/email or password.",
    EMAIL_NOT_VERIFIED: "Please verify your email before signing in.",
    ACCOUNT_SCHEDULED_FOR_DELETION: "Account is scheduled for deletion. Ownership verification is required to restore.",
    ACCOUNT_PURGED: "This account has been permanently deleted.",
    TOO_MANY_ATTEMPTS: "Too many attempts. Please try again in a few minutes.",
    INVALID_OTP: "Invalid or expired verification code.",
    EXPIRED_OTP: "Verification code has expired. Please request a new one.",
    INVALID_INPUT: "Please check your input and try again.",
    SERVER_ERROR: "An unexpected server error occurred. Please try again later.",
};

export async function readErrorMessage(res: Response, fallback: string) {
    const text = await res.text();
    if (!text) return fallback;

    try {
        const json = JSON.parse(text);
        if (json.code && ERROR_MAPPINGS[json.code]) {
            return ERROR_MAPPINGS[json.code];
        }
        return json.message || json.error || fallback;
    } catch {
        return fallback;
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

function normalizeAvatarUrl(obj: any): string | undefined {
    return obj?.avatarUrl ?? obj?.avatar ?? obj?.avatar_url ?? undefined;
}

function normalizeDisplayName(obj: any): string | undefined {
    const rawDisplayName = obj?.displayName ?? obj?.name ?? obj?.display_name;
    if (typeof rawDisplayName === "string" && rawDisplayName.trim()) {
        return rawDisplayName.trim();
    }
    return typeof obj?.username === "string" ? obj.username.trim() : undefined;
}

function normalizeUser<T extends Record<string, any>>(user: T): T & { avatarUrl?: string; displayName?: string } {
    return {
        ...user,
        avatarUrl: normalizeAvatarUrl(user),
        displayName: normalizeDisplayName(user) || user?.username || "",
    };
}

function normalizeUsers<T extends Record<string, any>>(items: T[] = []): Array<T & { avatarUrl?: string; displayName?: string }> {
    return items.map(normalizeUser);
}

function normalizeConversation(obj: any): Conversation {
    return {
        ...obj,
        avatarUrl: normalizeAvatarUrl(obj),
        displayName: normalizeDisplayName(obj) || obj?.username || "",
    };
}

function normalizePostObject(obj: any): Post {
    return {
        ...obj,
        author: normalizeUser(obj.author || {}),
        likesCount: Number(obj.likesCount ?? obj.likes_count ?? obj.likes ?? obj.count ?? 0) || 0,
        commentsCount: Number(obj.commentsCount ?? obj.comments_count ?? obj.comments ?? 0) || 0,
        savesCount: Number(obj.savesCount ?? obj.saves_count ?? obj.saves ?? 0) || 0,
        likedByMe: obj.likedByMe ?? !!obj.liked_by_me,
        savedByMe: obj.savedByMe ?? !!obj.saved_by_me,
    };
}

function normalizeCommentObject(obj: any): Comment {
    return {
        ...obj,
        author: normalizeUser(obj.author || {}),
        likesCount: Number(obj.likesCount ?? obj.likes_count ?? obj.count ?? 0) || 0,
        likedByMe: obj.likedByMe ?? !!obj.liked_by_me,
    };
}

function normalizeNotificationObject(obj: any): Notification {
    return {
        ...obj,
        user: normalizeUser(obj.user || {}),
    } as Notification;
}

async function checkRestorationResponse(res: Response) {
    try {
        const cloned = res.clone();
        const json = await cloned.json();
        if (json && (json.code === "ACCOUNT_SCHEDULED_FOR_DELETION" || json.requiresRestoration)) {
            return {
                requiresRestoration: true,
                scheduledDeletionAt: json.scheduledDeletionAt,
                username: json.username,
                email: json.email,
                message: json.message,
            };
        }
    } catch {
        // ignore
    }
    return null;
}

async function readAuthResponse(res: Response): Promise<{ token: string; refreshToken?: string; user: User }> {
    const data = await res.json();
    const token = data?.token;
    const refreshToken = data?.refreshToken;
    const user = data?.user;

    if (!token || !user) {
        throw new Error("Login response missing token or user");
    }

    const normalizedUser = normalizeUser(user);
    localStorage.setItem("token", token);
    if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(normalizedUser));

    return { token, refreshToken, user: normalizedUser as User };
}

async function resolveEmailFromUsername(username: string): Promise<string | null> {
    const res = await fetch(`${API_URL}/profile/${encodeURIComponent(username)}`);
    if (!res.ok) return null;

    const profile = await parseJsonSafe<{ email?: string }>(res);
    return profile?.email?.trim() || null;
}

export const api = {
    auth: {
        login: async (identifier: string, password: string): Promise<any> => {
            const normalizedIdentifier = identifier.trim();

            let res = await performLoginRequest({
                identifier: normalizedIdentifier,
                email: normalizedIdentifier,
                username: normalizedIdentifier,
                password,
            });

            const restoration = await checkRestorationResponse(res);
            if (restoration) return restoration;

            if (res.ok) {
                return readAuthResponse(res);
            }

            const primaryError = await readErrorMessage(res, "Login failed");

            res = await performLoginRequest({
                email: normalizedIdentifier,
                password,
            });

            const restoration2 = await checkRestorationResponse(res);
            if (restoration2) return restoration2;

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

                    const restoration3 = await checkRestorationResponse(res);
                    if (restoration3) return restoration3;

                    if (res.ok) {
                        return readAuthResponse(res);
                    }
                }
            }

            throw new Error(primaryError);
        },
        signup: async (data: any): Promise<{ message: string }> => {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Signup failed"));
            }
            return res.json();
        },
        resendVerification: async (email: string): Promise<{ message: string }> => {
            const res = await fetch(`${API_URL}/auth/resend-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to resend verification email"));
            }
            return res.json();
        },
        verifySignupEmail: async (token: string): Promise<{ message: string }> => {
            const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
                method: "GET"
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to verify email"));
            }
            return res.json();
        },
        forgotPassword: async (email: string): Promise<{ message: string }> => {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to request password reset"));
            }
            return res.json();
        },
        resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to reset password"));
            }
            return res.json();
        },
        sendRestorationOtp: async (identifier: string, password: string): Promise<{ ok: boolean; message: string }> => {
            const res = await fetch(`${API_URL}/auth/send-restoration-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to send verification code"));
            }
            return res.json();
        },
        restoreAccount: async (
            identifier: string,
            password: string,
            otpCode: string
        ): Promise<{ token: string; refreshToken?: string; user: User }> => {
            const res = await fetch(`${API_URL}/auth/restore-account`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password, otpCode }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to restore account"));
            }
            return readAuthResponse(res);
        },
        refresh: async (): Promise<{ token: string; refreshToken: string } | null> => {
            const newToken = await refreshAccessToken();
            if (!newToken) return null;
            const refreshToken = localStorage.getItem("refreshToken") || "";
            return { token: newToken, refreshToken };
        },
        logout: async (): Promise<void> => {
            try {
                await fetchWithAuth("/auth/logout", { method: "POST" });
            } catch {
                // Ignore network errors during logout
            } finally {
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("bitglow:auth-expired"));
                }
            }
        },
        me: async (): Promise<User> => {
            const res = await fetchWithAuth("/api/me", { cache: "no-store" });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to fetch user: ${res.status} ${errorText}`);
            }
            return normalizeUser(await res.json()) as User;
        },
    },
    user: {
        list: async (): Promise<User[]> => {
            const res = await fetchWithAuth("/users");
            if (!res.ok) return [];
            return normalizeUsers(await res.json()) as User[];
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
            return normalizeUser(await res.json()) as User;
        },
        update: async (data: Partial<User>): Promise<User> => {
            if (data.website) {
                let url = data.website.trim();
                if (url && !/^https?:\/\//i.test(url)) {
                    url = `https://${url}`;
                }
                data.website = url;
            }

            const res = await fetchWithAuth("/api/me", {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to update profile"));
            return res.json();
        },
        requestDeletionOtp: async (password: string): Promise<{ ok: boolean; message: string }> => {
            const res = await fetchWithAuth("/api/me/request-deletion-otp", {
                method: "POST",
                body: JSON.stringify({ password }),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to request verification code"));
            }
            return res.json();
        },
        scheduleAccountDeletion: async (payload: {
            password: string;
            otpCode: string;
            confirmText: string;
            reason?: string;
        }): Promise<{ ok: boolean; scheduledDeletionAt: string; message: string }> => {
            const res = await fetchWithAuth("/api/me", {
                method: "DELETE",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, "Failed to schedule account deletion"));
            }
            return res.json();
        },
        sendRestorationOtp: (identifier: string, password: string) => api.auth.sendRestorationOtp(identifier, password),
        restoreAccount: (identifier: string, password: string, otpCode: string) => api.auth.restoreAccount(identifier, password, otpCode),
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
            return normalizeUsers(data.friends || []) as Friend[];
        },
        followers: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/followers");
            if (!res.ok) return [];
            const data = await res.json();
            return normalizeUsers(data.followers || []) as Friend[];
        },
        following: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/following");
            if (!res.ok) return [];
            const data = await res.json();
            return normalizeUsers(data.following || []) as Friend[];
        },
        followRequests: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/follow/requests");
            if (!res.ok) return [];
            const data = await res.json();
            return normalizeUsers(data.requests || []) as Friend[];
        },
        pendingFollows: async (): Promise<Friend[]> => {
            const res = await fetchWithAuth("/follow/pending");
            if (!res.ok) return [];
            const data = await res.json();
            return normalizeUsers(data.pending || []) as Friend[];
        },
        acceptFollow: async (followerId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/follow/requests/${followerId}/accept`, { method: "POST" });
            return res.ok;
        },
        rejectFollow: async (followerId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/follow/requests/${followerId}/reject`, { method: "POST" });
            return res.ok;
        },
        removeFollower: async (followerId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/followers/${followerId}`, { method: "DELETE" });
            return res.ok;
        },
    },
    profile: {
        get: async (username: string): Promise<User> => {
            const res = await fetchWithAuth(`/api/profile/${username}`);
            if (!res.ok) throw new Error("Profile not found");
            return normalizeUser(await res.json()) as User;
        },
        me: async (): Promise<User> => {
            const res = await fetchWithAuth("/api/me");
            if (!res.ok) throw new Error("Failed to fetch my profile");
            return normalizeUser(await res.json()) as User;
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
        edit: async (userId: string, messageId: string, text: string): Promise<DMMessage> => {
            const res = await fetchWithAuth(`/dms/${userId}/messages/${messageId}`, {
                method: "PUT",
                body: JSON.stringify({ text }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to edit message"));
            return res.json();
        },
        deleteMessage: async (userId: string, messageId: string): Promise<boolean> => {
            const res = await fetchWithAuth(`/dms/${userId}/messages/${messageId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to delete message"));
            return true;
        },
        forward: async (userId: string, messageId: string): Promise<DMMessage> => {
            const res = await fetchWithAuth(`/dms/${userId}/forward/${messageId}`, {
                method: "POST",
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to forward message"));
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
        verifyEmail: async (token: string) => {
            const res = await fetchWithAuth(`/settings/verify-email?token=${encodeURIComponent(token)}`, {
                method: "GET"
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to verify email"));
            return res.json();
        },
        confirmEmailChange: async (otpCode: string) => {
            const res = await fetchWithAuth("/settings/email/verify", {
                method: "POST",
                body: JSON.stringify({ otpCode }),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to confirm email change"));
            return res.json();
        },
        resendChangeEmailOtp: async () => {
            const res = await fetchWithAuth("/settings/email/resend", {
                method: "POST",
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to resend email verification code"));
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
        },
        getMutedUsers: async () => {
            const res = await fetchWithAuth("/settings/muted");
            if (!res.ok) return [];
            const data = await res.json();
            return data.mutedUsers || [];
        },
        muteUser: async (userId: string) => {
            const res = await fetchWithAuth(`/settings/muted/${userId}`, { method: "POST" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to mute user"));
            return res.json();
        },
        unmuteUser: async (userId: string) => {
            const res = await fetchWithAuth(`/settings/muted/${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to unmute user"));
            return res.json();
        },
        getFollowRequests: async () => {
            const res = await fetchWithAuth("/follow/requests");
            if (!res.ok) return [];
            const data = await res.json();
            return data.requests || [];
        },
        acceptFollowRequest: async (userId: string) => {
            const res = await fetchWithAuth(`/follow/requests/${userId}/accept`, { method: "POST" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to accept request"));
            return res.json();
        },
        rejectFollowRequest: async (userId: string) => {
            const res = await fetchWithAuth(`/follow/requests/${userId}/reject`, { method: "POST" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to reject request"));
            return res.json();
        },
        acceptDMRequest: async (userId: string) => {
            const res = await fetchWithAuth(`/dms/${userId}/accept`, { method: "POST" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to accept message request"));
            return res.json();
        },
        rejectDMRequest: async (userId: string) => {
            const res = await fetchWithAuth(`/dms/${userId}/reject`, { method: "POST" });
            if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to reject message request"));
            return res.json();
        },
    }
};
