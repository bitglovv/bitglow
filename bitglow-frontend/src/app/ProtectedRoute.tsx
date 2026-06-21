import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FullScreenLoader } from "../components/ui/FullScreenLoader";

export default function ProtectedRoute() {
    const { token, isAuthLoading, user } = useAuth();

    if (isAuthLoading) {
        return <FullScreenLoader />;
    }

    if (token && !user) {
        return <Navigate to="/login" replace />;
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
