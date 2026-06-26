import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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

    // Auth restores silently — render nothing while the check is in flight.
    return null;
}
