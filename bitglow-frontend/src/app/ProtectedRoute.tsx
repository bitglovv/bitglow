import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute() {
    const { token, isLoading, user } = useAuth();

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Loading your session...</p>
                </div>
            </div>
        );
    }

    // If we still have a token but no user after loading, the session is broken.
    if (token && !user) {
        console.log("Broken session detected, redirecting to login");
        return <Navigate to="/login" replace />;
    }

    // No token means not authenticated.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Authenticated
    return <Outlet />;
}
