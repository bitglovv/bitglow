import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FullScreenLoader } from "../components/ui/FullScreenLoader";

export default function MyProfileRedirect() {
    const { user, isAuthLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthLoading) return;
        if (user?.username) {
            navigate(`/profile/${user.username}`, { replace: true });
        } else {
            navigate("/live", { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    if (isAuthLoading) return <FullScreenLoader />;

    return null;
}
