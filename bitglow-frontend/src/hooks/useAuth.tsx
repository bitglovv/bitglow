import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, User } from "../services/api";
import { socketService } from "../services/socket";
import { useChatStore } from "../store/chatStore";
import { usePresenceStore } from "../store/presenceStore";

type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthLoading: boolean;
    login: (token: string, user?: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    updatePrivacy: (isPrivate: boolean) => Promise<boolean>;
    updateOnlineStatusVisible: (isVisible: boolean) => Promise<boolean>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => loadToken());
    const [user, setUser] = useState<User | null>(() => loadStoredUser());
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const userSyncVersion = useRef(0);
    const privacyMutationInFlight = useRef(false);
    const onlineStatusMutationInFlight = useRef(false);

    const applyUser = (nextUser: User, version: number) => {
        if (version !== userSyncVersion.current) return false;
        setUser(nextUser);
        persistUser(nextUser);
        return true;
    };

    const refreshAuthenticatedUser = async () => {
        const version = ++userSyncVersion.current;
        const freshUser = await api.auth.me();
        applyUser(freshUser, version);
        return freshUser;
    };

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
            }

            try {
                const version = ++userSyncVersion.current;
                const restoredUser = await api.auth.me();
                if (cancelled) return;

                setToken(storedToken);
                applyUser(restoredUser, version);
                console.log("AUTH_USER_RESTORED");
            } catch (error) {
                if (cancelled) return;

                if (isInvalidTokenError(error)) {
                    clearSession();
                } else if (cachedUser) {
                    setToken(storedToken);
                    setUser(cachedUser);
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
                    if (changedUserId) {
                        usePresenceStore.getState().setPresence(
                            changedUserId,
                            Boolean(isOnline),
                            visible === undefined ? true : Boolean(visible)
                        );
                    }
                    window.dispatchEvent(
                        new CustomEvent("bitglow:user-status-changed", {
                            detail: {
                                userId: changedUserId,
                                isOnline: Boolean(isOnline),
                                visible: visible === undefined ? true : Boolean(visible),
                            },
                        })
                    );
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
            if (!token || isAuthLoading || privacyMutationInFlight.current || onlineStatusMutationInFlight.current) return;

            refreshAuthenticatedUser()
                .catch((error) => {
                    if (isInvalidTokenError(error)) {
                        clearSession();
                    }
                });
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [token, isAuthLoading]);

    const login = (newToken: string, userData?: User) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setIsAuthLoading(false);

        if (userData) {
            setUser(userData);
            persistUser(userData);
            return;
        }

        refreshAuthenticatedUser()
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
        if (!token || privacyMutationInFlight.current || onlineStatusMutationInFlight.current) return;
        await refreshAuthenticatedUser();
    };

    const updatePrivacy = async (isPrivate: boolean) => {
        if (privacyMutationInFlight.current) {
            throw new Error("Privacy update already in progress");
        }

        privacyMutationInFlight.current = true;
        // Invalidate any earlier /api/me response before sending the mutation.
        const mutationVersion = ++userSyncVersion.current;
        try {
            const response = await api.settings.updatePrivacy(isPrivate) as { ok: boolean; isPrivate: boolean };
            if (!response.ok || typeof response.isPrivate !== "boolean") {
                throw new Error("Invalid privacy update response");
            }
            if (mutationVersion !== userSyncVersion.current) {
                return response.isPrivate;
            }

            setUser((currentUser) => {
                if (!currentUser || mutationVersion !== userSyncVersion.current) return currentUser;
                const updatedUser = { ...currentUser, isPrivate: response.isPrivate };
                persistUser(updatedUser);
                return updatedUser;
            });

            return response.isPrivate;
        } finally {
            privacyMutationInFlight.current = false;
        }
    };

    const updateOnlineStatusVisible = async (isVisible: boolean) => {
        if (onlineStatusMutationInFlight.current) {
            throw new Error("Online status update already in progress");
        }

        onlineStatusMutationInFlight.current = true;
        const mutationVersion = ++userSyncVersion.current;
        try {
            const response = await api.settings.updateOnlineStatus(isVisible) as { ok: boolean; isVisible: boolean };
            if (!response.ok || typeof response.isVisible !== "boolean") {
                throw new Error("Invalid online status update response");
            }
            if (mutationVersion !== userSyncVersion.current) {
                return response.isVisible;
            }

            setUser((currentUser) => {
                if (!currentUser || mutationVersion !== userSyncVersion.current) return currentUser;
                const updatedUser = { ...currentUser, onlineStatusVisible: response.isVisible };
                persistUser(updatedUser);
                return updatedUser;
            });

            return response.isVisible;
        } finally {
            onlineStatusMutationInFlight.current = false;
        }
    };

    const value = useMemo<AuthContextType>(() => ({
        user,
        token,
        isLoading: isAuthLoading,
        isAuthLoading,
        login,
        logout,
        refreshUser,
        updatePrivacy,
        updateOnlineStatusVisible,
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
