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
