import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import IndexPage from "../pages/IndexPage";
import HomePage from "../pages/HomePage";
import LiveChatPage from "../pages/LiveChatPage";
import MessagesPage from "../pages/MessagesPage";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import SearchPage from "../pages/SearchPage";
import NotificationsPage from "../pages/NotificationsPage";
import SettingsPage from "../pages/SettingsPage";
import MyProfileRedirect from "../pages/MyProfileRedirect";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks/useAuth";

export default function Router() {
    const { token, user, isLoading } = useAuth(); // Need isLoading to prevent premature redirect? 
    // Actually if isLoading is true, token might be null but we don't know yet.
    // So for public routes that redirect if logged in, we should also wait for loading.

    if (isLoading) return null; // Or a spinner, but App is usually loading

    return (
        <Routes>
            <Route path="/" element={<IndexPage />} />

            {/* Auth Routes - block if already logged in */}
            <Route path="/login" element={token && user ? <Navigate to="/home" /> : <LoginPage />} />
            <Route path="/signup" element={token && user ? <Navigate to="/home" /> : <SignupPage />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/live" element={<LiveChatPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<MyProfileRedirect />} />
                    <Route path="/profile/:username" element={<ProfilePage />} />
                    <Route path="/profile/edit" element={<EditProfilePage />} />
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}
