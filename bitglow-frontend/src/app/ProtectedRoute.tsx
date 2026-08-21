import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
    const { token, isAuthLoading, user } = useAuth();

    if (isAuthLoading && !token) {
        // Auth is restoring silently — render nothing only if there is no cached session.
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
