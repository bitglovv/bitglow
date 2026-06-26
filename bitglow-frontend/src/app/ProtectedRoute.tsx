import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
    const { token, isAuthLoading, user } = useAuth();

    if (isAuthLoading) {
        // Auth is restoring silently — render nothing rather than a
        // blocking fullscreen loader. Router.tsx also returns null during
        // this window, so nothing renders until the check resolves.
        return null;
    }

    if (token && !user) {
        return <Navigate to="/" replace />;
    }

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
