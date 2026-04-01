import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function MyProfileRedirect() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.username) {
            navigate(`/profile/${user.username}`);
        } else {
            navigate('/live');
        }
    }, [user, navigate]);

    return null; // This component doesn't render anything
}