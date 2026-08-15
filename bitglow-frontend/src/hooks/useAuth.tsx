import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { api, User } from "../services/api";
import { useSettingsStore } from "../store/settingsStore";
import { socketService } from "../services/socket";
import { useChatStore } from "../store/chatStore";

type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthLoading: boolean;
    login: (token: string, user?: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadToken() {
    return localStorage.getItem("token");
}

function loadStoredUser() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;

    try {
        return JSON.parse(raw) as User;
    } catch {
        return null;
    }
}

function isInvalidTokenError(error: unknown) {
    return error instanceof Error && (
        error.message.includes("401")
        || error.message.includes("Unauthorized")
    );
}

function persistUser(user: User) {
    localStorage.setItem("user", JSON.stringify(user));
}

function hydrateStores(user: User | null) {
    if (!user) return;
    useSettingsStore.getState().hydrateFromUser(
        !!user.isPrivate,
        user.onlineStatusVisible ?? true
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => loadToken());
    const [user, setUser] = useState<User | null>(() => loadStoredUser());
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const clearSession = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        let cancelled = false;

        async function initAuth() {
            console.log("AUTH_START");

            const storedToken = loadToken();
            if (!storedToken) {
                if (!cancelled) {
                    setToken(null);
                    setIsAuthLoading(false);
                    console.log("AUTH_LOADING_COMPLETE");
                }
                return;
            }

            console.log("AUTH_TOKEN_FOUND");

            const cachedUser = loadStoredUser();
            if (cachedUser && !cancelled) {
                setUser(cachedUser);
                hydrateStores(cachedUser);
            }

            try {
                const restoredUser = await api.auth.me();
                if (cancelled) return;

                setToken(storedToken);
                setUser(restoredUser);
                persistUser(restoredUser);
                hydrateStores(restoredUser);
                console.log("AUTH_USER_RESTORED");
            } catch (error) {
                if (cancelled) return;

                if (isInvalidTokenError(error)) {
                    clearSession();
                } else if (cachedUser) {
                    setToken(storedToken);
                    setUser(cachedUser);
                    hydrateStores(cachedUser);
                    console.log("AUTH_USER_RESTORED");
                } else {
                    console.error("Auth hydration failed before user restore", error);
                }
            } finally {
                if (!cancelled) {
                    setIsAuthLoading(false);
                    console.log("AUTH_LOADING_COMPLETE");
                }
            }
        }

        void initAuth();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!token || !user?.id) return;

        socketService.connect();

        const unsubscribe = socketService.subscribe((data) => {
            if (data.type === "server:dm:message") {
                useChatStore.getState().handleIncomingMessage(data.message, user.id, data.clientMsgId);
            } else if (data.type === "server:dm:edited") {
                useChatStore.getState().handleEditedMessage(data.message, user.id);
            } else if (data.type === "server:dm:deleted") {
                useChatStore.getState().handleDeletedMessage(data, user.id);
            } else if (data.type === "server:user_relationship:update") {
                const otherId = data.actorId === user.id ? data.targetId : data.actorId;
                if (!otherId) return;
                if (data.kind === "block") {
                    useChatStore.getState().blockLocal(otherId);
                    window.dispatchEvent(new CustomEvent("bitglow:block-changed", { detail: { userId: otherId, blocked: true } }));
                } else if (data.kind === "unblock" && data.actorId === user.id) {
                    useChatStore.getState().unblockLocal(otherId);
                    window.dispatchEvent(new CustomEvent("bitglow:block-changed", { detail: { userId: otherId, blocked: false } }));
                } else if (data.kind === "mute" && data.actorId === user.id) {
                    useChatStore.getState().muteLocal(otherId);
                    window.dispatchEvent(new CustomEvent("bitglow:mute-changed", { detail: { userId: otherId, muted: true } }));
                } else if (data.kind === "unmute" && data.actorId === user.id) {
                    useChatStore.getState().unmuteLocal(otherId);
                    window.dispatchEvent(new CustomEvent("bitglow:mute-changed", { detail: { userId: otherId, muted: false } }));
                }
            } else if (data.type === "server:user_status") {
                // Update local presence store and notify interested components via a custom event.
                try {
                    const { userId: changedUserId, isOnline, visible } = data as any;
                    // Lazy import to avoid circular deps when building modules                    const { usePresenceStore } = require("../store/presenceStore");
                    // Update presence state
                    // Due to module system, use the store's setter via getState if available
                    const store = (usePresenceStore as any) as any;
                    if (store && store.setPresence) {
                        store.setPresence(changedUserId, !!isOnline, visible === undefined ? true : !!visible);
                    }
                    window.dispatchEvent(new CustomEvent("bitglow:user-status-changed", { detail: { userId: changedUserId, isOnline: !!isOnline, visible: visible === undefined ? true : !!visible } }));
                } catch (err) {
                    // Non-fatal; log for debugging
                    console.warn("Failed to process server:user_status message", err);
                }
            }
        });

        return () => {
            unsubscribe();
            socketService.disconnect();
        };
    }, [token, user?.id]);

    useEffect(() => {
        const handleFocus = () => {
            if (!token || isAuthLoading) return;

            api.auth.me()
                .then((freshUser) => {
                    setUser(freshUser);
                    persistUser(freshUser);
                    hydrateStores(freshUser);
                })
                .catch((error) => {
                    if (isInvalidTokenError(error)) {
                        clearSession();
                    }
                });
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [token, isAuthLoading]);

    useEffect(() => {
        const handlePrivacyUpdated = (event: Event) => {
            const isPrivate = (event as CustomEvent<{ isPrivate?: unknown }>).detail?.isPrivate;
            if (typeof isPrivate !== "boolean") return;

            setUser((currentUser) => {
                if (!currentUser) return currentUser;
                const updatedUser = { ...currentUser, isPrivate };
                persistUser(updatedUser);
                hydrateStores(updatedUser);
                return updatedUser;
            });
        };

        const handleUserUpdated = (event: Event) => {
            const updatedUser = (event as CustomEvent<unknown>).detail;
            if (!updatedUser || typeof updatedUser !== "object" || !("id" in updatedUser)) return;

            const userFromServer = updatedUser as User;
            setUser((currentUser) => {
                if (currentUser && currentUser.id !== userFromServer.id) return currentUser;
                persistUser(userFromServer);
                hydrateStores(userFromServer);
                return userFromServer;
            });
        };

        window.addEventListener("bitglow:privacy-updated", handlePrivacyUpdated);
        window.addEventListener("bitglow:user-updated", handleUserUpdated);
        return () => {
            window.removeEventListener("bitglow:privacy-updated", handlePrivacyUpdated);
            window.removeEventListener("bitglow:user-updated", handleUserUpdated);
        };
    }, []);

    const login = (newToken: string, userData?: User) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setIsAuthLoading(false);

        if (userData) {
            setUser(userData);
            persistUser(userData);
            hydrateStores(userData);
            return;
        }

        api.auth.me()
            .then((freshUser) => {
                setUser(freshUser);
                persistUser(freshUser);
                hydrateStores(freshUser);
            })
            .catch((error) => {
                if (isInvalidTokenError(error)) {
                    clearSession();
                } else {
                    console.error("Failed to fetch user data after login", error);
                }
            });
    };

    const logout = () => {
        clearSession();
        setIsAuthLoading(false);
    };

    const refreshUser = async () => {
        if (!token) return;
        const freshUser = await api.auth.me();
        setUser(freshUser);
        persistUser(freshUser);
        hydrateStores(freshUser);
    };

    const value = useMemo<AuthContextType>(() => ({
        user,
        token,
        isLoading: isAuthLoading,
        isAuthLoading,
        login,
        logout,
        refreshUser,
    }), [user, token, isAuthLoading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
