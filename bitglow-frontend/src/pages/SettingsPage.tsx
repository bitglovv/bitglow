import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  CircleUserRound,
  Eye,
  FileText,
  Flag,
  Lock,
  Mail,
  MessageCircle,
  Moon,
  Shield,
  Trash2,
  UserRoundCog,
  UserX,
  Zap,
} from "lucide-react";
import Header from "../components/common/Header";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { navigateBack } from "../utils/navigateBack";
import { AppTheme, useSettingsStore } from "../store/settingsStore";

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
        {children}
      </div>
    </section>
  );
}

function IconWrap({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className={
        danger
          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-zinc-200"
      }
    >
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors active:scale-95 ${
        checked ? "bg-emerald-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

type SettingsItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  to?: string;
  danger?: boolean;
  value?: string;
  toggle?: {
    checked: boolean;
    onChange: (next: boolean) => void;
  };
  onClick?: () => void;
};

function SettingsItem({
  icon,
  title,
  subtitle,
  to,
  danger,
  value,
  toggle,
  onClick,
}: SettingsItemProps) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <IconWrap danger={danger}>{icon}</IconWrap>
        <div className="min-w-0 text-left">
          <div className={`text-[15px] font-bold ${danger ? "text-red-400" : "text-white"}`}>
            {title}
          </div>
          {subtitle ? <div className="mt-0.5 truncate text-xs text-zinc-400">{subtitle}</div> : null}
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        {value ? <span className="max-w-[9rem] truncate text-xs font-semibold text-zinc-500">{value}</span> : null}
        {toggle ? <Toggle checked={toggle.checked} onChange={toggle.onChange} /> : null}
        {to || onClick ? <ChevronRight className="h-5 w-5 text-zinc-500" /> : null}
      </div>
    </>
  );

  const className =
    "flex min-h-[61px] w-full items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 transition-all hover:bg-white/[0.045] active:bg-white/[0.075] last:border-b-0";

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function SettingsPage() {
  useEffect(() => {
    document.title = "BitGlow Settings";
  }, []);

  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const { theme, setTheme, privateAccount, setPrivateAccount, onlineStatusVisible, setOnlineStatusVisible, hydrateFromUser } = useSettingsStore();

  useEffect(() => {
    if (user) {
      hydrateFromUser(!!user.isPrivate, user.onlineStatusVisible !== false);
    }
  }, [user, hydrateFromUser]);

  // Modals state
  const [activeModal, setActiveModal] = useState<"email" | "password" | "theme" | null>(null);

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIdentifier, setDeleteIdentifier] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const closeForm = () => {
    setActiveModal(null);
    setCurrentPassword("");
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setFormError("");
    setFormSuccess("");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);
    try {
      const res = await api.settings.changeEmail(currentPassword, newEmail);
      setFormSuccess(res.message || "A verification email has been sent.");
      // Don't close form immediately so they can read the success message
      setCurrentPassword("");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setFormLoading(true);
    try {
      await api.settings.changePassword(currentPassword, newPassword);
      closeForm();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

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
    <div className="h-screen overflow-hidden bg-black text-white selection:bg-brand/30">
      <Header showTop={false} hideBottomNav />

      <main className="mx-auto flex h-[100dvh] w-full max-w-5xl flex-col overflow-y-auto px-4 pb-[calc(92px+env(safe-area-inset-bottom))] custom-scrollbar sm:px-6 md:pb-10">
        <div className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-3 bg-black/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,12px))] backdrop-blur-xl sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={() => navigateBack(navigate, user?.username ? `/profile/${user.username}` : "/profile")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08] active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[24px] font-black tracking-tight">Settings</h1>
        </div>

        <div className="space-y-7">
          <SettingsSection title="Personal">
            <SettingsItem icon={<CircleUserRound className="h-5 w-5" />} title="View Profile" subtitle={`@${user?.username || "profile"}`} to={user?.username ? `/profile/${user.username}` : "/profile"} />
            <SettingsItem icon={<UserRoundCog className="h-5 w-5" />} title="Edit Profile" subtitle="Name, avatar, username, bio, website" to="/profile/edit" />
          </SettingsSection>

          <SettingsSection title="Account Security">
            <SettingsItem icon={<Mail className="h-5 w-5" />} title="Change Email" subtitle={user?.email || "Primary email"} onClick={() => setActiveModal("email")} />
            {activeModal === "email" && (
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-4 py-4">
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <Input label="New Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                  <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  {formError && <p className="text-red-400 text-sm">{formError}</p>}
                  {formSuccess && <p className="text-brand text-sm font-medium">{formSuccess}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={formLoading} disabled={formLoading || !!formSuccess}>Send Verification</Button>
                    <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
                  </div>
                </form>
              </div>
            )}
            <SettingsItem icon={<Lock className="h-5 w-5" />} title="Change Password" subtitle="Update password" onClick={() => setActiveModal("password")} />
            {activeModal === "password" && (
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-4 py-4">
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  {formError && <p className="text-red-400 text-sm">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={formLoading} disabled={formLoading}>Update Password</Button>
                    <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
                  </div>
                </form>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="Privacy">
            <SettingsItem icon={<Lock className="h-5 w-5" />} title="Private Account" subtitle="Only followers can see your posts" toggle={{ checked: privateAccount, onChange: setPrivateAccount }} />
            <SettingsItem icon={<Eye className="h-5 w-5" />} title="Show Online Status" subtitle="Let friends see when you are active" toggle={{ checked: onlineStatusVisible, onChange: setOnlineStatusVisible }} />
            <SettingsItem icon={<UserX className="h-5 w-5" />} title="Blocked Users" subtitle="Review accounts you blocked" to="/settings/blocked-users" />
          </SettingsSection>

          <SettingsSection title="Account & App">
            <SettingsItem icon={<Bookmark className="h-5 w-5" />} title="Saved Posts" to="/settings/saved-posts" />
            <SettingsItem icon={<CircleUserRound className="h-5 w-5" />} title="About This Account" subtitle="Profile information and account details" to={user?.username ? `/about/${user.username}` : "/profile"} />
            <SettingsItem 
              icon={<Moon className="h-5 w-5" />} 
              title="Theme for App" 
              subtitle={theme === 'dark' ? 'Dark' : 'White'} 
              onClick={() => setActiveModal(activeModal === "theme" ? null : "theme")} 
            />
            {activeModal === "theme" && (
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-4 py-4 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="space-y-2">
                  {(["dark", "white"] as AppTheme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); closeForm(); }}
                      className={`w-full text-left px-4 py-3 rounded-xl border ${theme === t ? "border-brand bg-brand/10 text-brand" : "border-white/10 hover:bg-white/[0.04]"}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)} Mode
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="About & Support">
            <SettingsItem icon={<Zap className="h-5 w-5" />} title="About BitGlow" subtitle="Version, features & tech stack" to="/about-app" />
            <SettingsItem icon={<FileText className="h-5 w-5" />} title="Terms of Service" subtitle="Rules & usage policies" to="/terms" />
            <SettingsItem icon={<Shield className="h-5 w-5" />} title="Privacy Policy" subtitle="How we handle your data" to="/privacy" />
            <SettingsItem icon={<Flag className="h-5 w-5" />} title="Report a Problem" subtitle="Submit a bug or issue" to="/contact" />
            <SettingsItem icon={<MessageCircle className="h-5 w-5" />} title="Help Center" subtitle="Get support" to="/contact" />
            <SettingsItem icon={<Mail className="h-5 w-5" />} title="Contact Support" subtitle="Reach us directly" to="/contact" />
          </SettingsSection>

          <SettingsSection title="Account Info">
            <SettingsItem icon={<Trash2 className="h-5 w-5" />} title="Delete Account" subtitle="Permanently remove your account" danger onClick={() => setShowDeleteConfirm((prev) => !prev)} />
            {showDeleteConfirm && (
              <div className="border-t border-red-500/15 bg-red-500/[0.04] px-4 py-5">
                <h3 className="text-sm font-bold text-red-300">Confirm account deletion</h3>
                <p className="mt-1 text-xs leading-5 text-red-100/60">
                  This permanently deletes @{user?.username || "your account"}. Enter your email or username and password to continue.
                </p>
                <div className="mt-4 space-y-3">
                  <Input label="Email or Username" value={deleteIdentifier} onChange={(e) => setDeleteIdentifier(e.target.value)} placeholder="name@example.com or bitglow" />
                  <Input label="Password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter your password" />
                </div>
                {deleteError && <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">{deleteError}</div>}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="danger" isLoading={deleteLoading} disabled={deleteLoading} onClick={handleDeleteAccount}>Delete Account</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </SettingsSection>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-2xl border border-red-500 px-5 py-3.5 text-center text-sm font-bold text-red-500 transition-all hover:bg-red-500/10 active:scale-[0.99]"
          >
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
