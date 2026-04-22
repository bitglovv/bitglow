import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { Lock, Shield, LogOut, ChevronRight, Trash2, Mail, ArrowLeft } from "lucide-react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";

export default function SettingsPage() {
    useEffect(() => { document.title = "BitGlow \u2022 Settings"; }, []);
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteIdentifier, setDeleteIdentifier] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleDeleteAccount = async () => {
        if (!deleteIdentifier.trim() || !deletePassword) {
            setDeleteError("Enter your email or username and password.");
            return;
        }

        setDeleteLoading(true);
        setDeleteError("");

        try {
            await api.user.deleteAccount(deleteIdentifier, deletePassword);
            logout();
            navigate("/");
        } catch (err: any) {
            setDeleteError(err.message || "Failed to delete account.");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden selection:bg-brand/30">
            <Header showTop={false} />

            <main className="flex-1 max-w-2xl mx-auto w-full p-6 pt-8 relative overflow-y-auto custom-scrollbar pb-[90px] md:pb-8">
                <div className="relative z-10 mb-8 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/profile")}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-white transition duration-200 hover:-translate-y-[1px] hover:bg-white/[0.04] active:translate-y-[1px]"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">Settings</h1>
                </div>

                <div className="space-y-10 relative z-10">
                    <section>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4 ml-1">Account</h2>
                        <div className="glass-dark border-white/5 rounded-[24px] overflow-hidden">
                            <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                                        <Lock className="w-5 h-5 text-zinc-500 group-hover:text-brand" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-zinc-200">Change Password</div>
                                        <div className="text-[11px] text-zinc-500 font-medium">Update password</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                                        <Mail className="w-5 h-5 text-zinc-500 group-hover:text-brand" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-zinc-200">Change Email</div>
                                        <div className="text-[11px] text-zinc-500 font-medium">Primary email</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                                        <Shield className="w-5 h-5 text-zinc-500 group-hover:text-brand" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-zinc-200">Privacy</div>
                                        <div className="text-[11px] text-zinc-500 font-medium">Visibility & blocked users</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm((prev) => !prev)}
                                className="w-full flex items-center justify-between p-5 hover:bg-rose-500/6 transition-all group border-b border-white/5"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/12 flex items-center justify-center group-hover:bg-rose-500/18 transition-colors">
                                        <Trash2 className="w-5 h-5 text-rose-400 group-hover:text-rose-300" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-rose-300">Delete Account</div>
                                        <div className="text-[11px] text-rose-200/55 font-medium">Permanent removal</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-all" />
                            </button>
                            {showDeleteConfirm && (
                                <div className="border-b border-white/5 bg-rose-500/[0.04] px-5 py-5">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-rose-300">Confirm account deletion</h3>
                                        <p className="mt-1 text-xs leading-5 text-rose-100/55">
                                            This permanently deletes @{user?.username || "your account"} and removes your data from BitGlow.
                                            Enter your email or username and password to continue.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <Input
                                            label="Email or Username"
                                            type="text"
                                            value={deleteIdentifier}
                                            onChange={(e) => setDeleteIdentifier(e.target.value)}
                                            placeholder="name@example.com or bitglow"
                                        />
                                        <Input
                                            label="Password"
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder="Enter your password"
                                        />
                                    </div>

                                    {deleteError ? (
                                        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
                                            {deleteError}
                                        </div>
                                    ) : null}

                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="danger"
                                            isLoading={deleteLoading}
                                            disabled={deleteLoading}
                                            onClick={handleDeleteAccount}
                                            className="sm:min-w-[11rem]"
                                        >
                                            Delete account
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                setDeleteError("");
                                                setDeleteIdentifier("");
                                                setDeletePassword("");
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-rose-500/10 transition-colors">
                                        <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-rose-500" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-zinc-200">Logout</div>
                                        <div className="text-[11px] text-zinc-500 font-medium">Sign out of BitGlow</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
