import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import IndexPage from "../pages/IndexPage";
import PrivacyPage from "../pages/PrivacyPage";
import TermsPage from "../pages/TermsPage";
import ContactPage from "../pages/ContactPage";
import AboutPage from "../pages/AboutPage";
import HomePage from "../pages/HomePage";
import LiveChatPage from "../pages/LiveChatPage";
import MessagesPage from "../pages/MessagesPage";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import AboutAccountPage from "../pages/AboutAccountPage";
import SearchPage from "../pages/SearchPage";
import NotificationsPage from "../pages/NotificationsPage";
import PostPage from "../pages/PostPage";
import SettingsPage from "../pages/SettingsPage";
import BlockedUsersPage from "../pages/settings/BlockedUsersPage";
import SavedPostsPage from "../pages/settings/SavedPostsPage";
import MyProfileRedirect from "../pages/MyProfileRedirect";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks/useAuth";
import { FullScreenLoader } from "../components/ui/FullScreenLoader";

export default function Router() {
    const { token, user, isAuthLoading } = useAuth();

    if (isAuthLoading) return <FullScreenLoader />;

    return (
        <Routes>
            <Route path="/" element={token && user ? <Navigate to="/home" replace /> : <IndexPage />} />

            {/* Auth Routes - block if already logged in */}
            <Route path="/login" element={token && user ? <Navigate to="/home" replace /> : <LoginPage />} />
            <Route path="/signup" element={token && user ? <Navigate to="/home" replace /> : <SignupPage />} />

            {/* Public legal pages — also accessible from within the app */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about-app" element={<AboutPage />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/live" element={<LiveChatPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/posts/:postId" element={<PostPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/blocked-users" element={<BlockedUsersPage />} />
                    <Route path="/settings/saved-posts" element={<SavedPostsPage />} />
                    <Route path="/profile" element={<MyProfileRedirect />} />
                    <Route path="/profile/:username" element={<ProfilePage />} />
                    <Route path="/about/:username" element={<AboutAccountPage />} />
                    <Route path="/profile/edit" element={<EditProfilePage />} />
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}
