import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import IndexPage from "../pages/IndexPage";
import PrivacyPage from "../pages/PrivacyPage";
import TermsPage from "../pages/TermsPage";
import ContactPage from "../pages/ContactPage";
import AboutPage from "../pages/AboutPage";
import ReportProblemPage from "../pages/ReportProblemPage";
import HelpCenterPage from "../pages/HelpCenterPage";
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
import MutedUsersPage from "../pages/settings/MutedUsersPage";
import SavedPostsPage from "../pages/settings/SavedPostsPage";
import ChangeEmailPage from "../pages/settings/ChangeEmailPage";
import ChangeEmailVerifyPage from "../pages/settings/ChangeEmailVerifyPage";
import ChangePasswordPage from "../pages/settings/ChangePasswordPage";
import DeleteAccountPage from "../pages/settings/DeleteAccountPage";
import RestoreAccountPage from "../pages/RestoreAccountPage";
import MyProfileRedirect from "../pages/MyProfileRedirect";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import { useAuth } from "../hooks/useAuth";

export default function Router() {
    const { token, user, isAuthLoading } = useAuth();

    // Auth restores silently — render nothing while the check is in flight.
    // The SplashScreen in App.tsx covers the very first load visually.
    if (isAuthLoading) return null;

    return (
        <Routes>
            <Route path="/" element={token && user ? <Navigate to="/home" replace /> : <IndexPage />} />

            {/* Auth Routes - block if already logged in */}
            <Route path="/login" element={token && user ? <Navigate to="/home" replace /> : <LoginPage />} />
            <Route path="/signup" element={token && user ? <Navigate to="/home" replace /> : <SignupPage />} />
            <Route path="/forgot-password" element={token && user ? <Navigate to="/home" replace /> : <ForgotPasswordPage />} />
            <Route path="/reset-password" element={token && user ? <Navigate to="/home" replace /> : <ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/restore-account" element={<RestoreAccountPage />} />

            {/* Public legal & support center pages — accessible from anywhere */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about-app" element={<AboutPage />} />
            <Route path="/about" element={<Navigate to="/about-app" replace />} />
            <Route path="/report" element={<ReportProblemPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/help-center" element={<Navigate to="/help" replace />} />

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
                    <Route path="/settings/change-email" element={<ChangeEmailPage />} />
                    <Route path="/settings/change-email/verify" element={<ChangeEmailVerifyPage />} />
                    <Route path="/settings/change-password" element={<ChangePasswordPage />} />
                    <Route path="/settings/blocked-users" element={<BlockedUsersPage />} />
                    <Route path="/settings/muted-users" element={<MutedUsersPage />} />
                    <Route path="/settings/saved-posts" element={<SavedPostsPage />} />
                    <Route path="/settings/delete-account" element={<DeleteAccountPage />} />
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
