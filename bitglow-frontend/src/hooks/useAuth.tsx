import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, User } from "../services/api";

type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user?: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [isLoading, setIsLoading] = useState(true);

    const clearSession = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        async function initAuth() {
            console.log("Starting auth initialization...");
            const storedToken = localStorage.getItem("token");
            console.log("Stored token:", storedToken ? "Exists" : "None");
            
            // Add timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                console.log("Auth timeout reached, setting isLoading to false");
                setIsLoading(false);
            }, 15000); // 15 second timeout
            
            if (storedToken) {
                try {
                    console.log("Validating token...");
                    // Validate token by fetching user data
                    const userData = await api.auth.me();
                    console.log("User data received:", userData);
                    setUser(userData);
                    setToken(storedToken);
                    localStorage.setItem("user", JSON.stringify(userData));
                    console.log("Auth initialization complete - user set");
                } catch (err) {
                    console.error("Auth init failed", err);
                    // Check if it's a network error vs auth error
                    if (err instanceof Error) {
                        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                            console.log("Network error, keeping user logged in with stored token");
                            // Try to get user data from localStorage as fallback
                            const storedUser = localStorage.getItem("user");
                            if (storedUser) {
                                try {
                                    const userObj = JSON.parse(storedUser);
                                    setUser(userObj);
                                    setToken(storedToken);
                                    console.log("Using stored user data as fallback");
                                } catch (parseErr) {
                                    console.log("Failed to parse stored user data");
                                    clearSession();
                                }
                            } else {
                                clearSession();
                            }
                        } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
                            console.log("Token invalid, logging out");
                            clearSession();
                        } else {
                            console.log("Other error, clearing broken session");
                            clearSession();
                        }
                    } else {
                        clearSession();
                    }
                }
            } else {
                console.log("No stored token, not logged in");
            }
            
            console.log("Setting isLoading to false");
            setIsLoading(false);
            clearTimeout(timeoutId);
        }
        initAuth();
    }, []);

    // Validate token when window regains focus
    useEffect(() => {
        const handleFocus = () => {
            if (token) {
                api.auth.me().catch((err) => {
                    console.error("Token validation failed on focus", err);
                    if (err instanceof Error && (err.message.includes("401") || err.message.includes("Unauthorized"))) {
                        clearSession();
                    }
                });
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [token]);

    const login = (newToken: string, userData?: User) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        if (userData) {
            setUser(userData);
            // Store user data as fallback
            localStorage.setItem("user", JSON.stringify(userData));
        } else {
            // Always fetch fresh user data after login
            api.auth.me().then((user) => {
                setUser(user);
                // Store user data as fallback
                localStorage.setItem("user", JSON.stringify(user));
            }).catch((err) => {
                console.error("Failed to fetch user data after login:", err);
                logout();
            });
        }
    };

    const logout = () => {
        clearSession();
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            const u = await api.auth.me();
            setUser(u);
        } catch (e) { console.error(e) }
    }

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
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
