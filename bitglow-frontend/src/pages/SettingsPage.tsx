import { Link, useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { Lock, Shield, LogOut, ChevronRight, Zap, Trash2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function SettingsPage() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden selection:bg-brand/30">
            <Header showTop={false} />

            <main className="flex-1 max-w-2xl mx-auto w-full p-6 pt-8 relative overflow-y-auto custom-scrollbar pb-[90px] md:pb-8">
                <div className="flex items-center gap-4 mb-8 -ml-2">
                    <Button 
                        variant="secondary" 
                        onClick={() => navigate(-1)} 
                        className="bg-transparent border-0 px-3 hover:bg-white/5"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                </div>

                <div className="relative z-10 flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter">System Settings</h1>
                        <p className="text-zinc-500 text-sm font-medium">Manage your digital identity and preferences.</p>
                    </div>
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
                            <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                        <Trash2 className="w-5 h-5 text-zinc-500 group-hover:text-rose-500" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-zinc-200">Delete Account</div>
                                        <div className="text-[11px] text-zinc-500 font-medium">Permanent removal</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-all" />
                            </button>
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
