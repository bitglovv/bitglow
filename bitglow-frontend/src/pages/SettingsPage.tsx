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
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
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

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
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
    disabled?: boolean;
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
        {toggle ? <Toggle checked={toggle.checked} onChange={toggle.onChange} disabled={toggle.disabled} /> : null}
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

  if (toggle) {
    return <div className={className}>{content}</div>;
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

  const { logout, user, updatePrivacy, updateOnlineStatusVisible } = useAuth();
  const navigate = useNavigate();
  
  const { theme, setTheme } = useSettingsStore();

  const [privacyConfirmOpen, setPrivacyConfirmOpen] = useState(false);
  const [privacyNextValue, setPrivacyNextValue] = useState<boolean | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  const [onlineConfirmOpen, setOnlineConfirmOpen] = useState(false);
  const [onlineNextValue, setOnlineNextValue] = useState<boolean | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);

  // When Toggle is clicked, open a confirmation dialog. The actual update happens after confirmation.
  const currentPrivate = !!user?.isPrivate;
  const handlePrivacyToggle = () => {
    if (privacyLoading) return;
    setPrivacyNextValue(!currentPrivate);
    setPrivacyConfirmOpen(true);
  };

  const performPrivacyToggle = async () => {
    if (privacyNextValue === null) return;
    const next = privacyNextValue;
    setPrivacyLoading(true);
    try {
      await updatePrivacy(next);
      try {
        window.dispatchEvent(new CustomEvent("bitglow:toast", { detail: { type: "success", message: next ? "Account is now private" : "Account is now public" } }));
      } catch {}
      setPrivacyConfirmOpen(false);
      setPrivacyNextValue(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update privacy";
      try { window.dispatchEvent(new CustomEvent("bitglow:toast", { detail: { type: "error", message: msg } })); } catch {}
      window.alert(msg);
      // keep dialog open so user can retry or cancel
    } finally {
      setPrivacyLoading(false);
    }
  };

  const onlineStatusVisible = user?.onlineStatusVisible !== false;
  const handleOnlineStatusToggle = () => {
    if (onlineLoading) return;
    setOnlineNextValue(!onlineStatusVisible);
    setOnlineConfirmOpen(true);
  };

  const performOnlineStatusToggle = async () => {
    if (onlineNextValue === null) return;
    const next = onlineNextValue;
    setOnlineLoading(true);
    try {
      await updateOnlineStatusVisible(next);
      try {
        window.dispatchEvent(new CustomEvent("bitglow:toast", { detail: { type: "success", message: next ? "Online status shown" : "Online status hidden" } }));
      } catch {}
      setOnlineConfirmOpen(false);
      setOnlineNextValue(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update online status";
      try { window.dispatchEvent(new CustomEvent("bitglow:toast", { detail: { type: "error", message: msg } })); } catch {}
      window.alert(msg);
      // keep dialog open so user can retry or cancel
    } finally {
      setOnlineLoading(false);
    }
  };

  // Form state is handled on dedicated pages.

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white selection:bg-brand/30">
      <Header showTop={false} hideBottomNav />

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] custom-scrollbar sm:px-6 sm:pb-6">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-between">
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
              <SettingsItem icon={<Shield className="h-5 w-5" />} title="BitGlow Identity" subtitle="Status and attributes" to="/identity" />
            </SettingsSection>

            <SettingsSection title="Account Security">
              <SettingsItem icon={<Mail className="h-5 w-5" />} title="Change Email" subtitle={user?.email || "Primary email"} to="/settings/change-email" />
              <SettingsItem icon={<Lock className="h-5 w-5" />} title="Change Password" subtitle="Update password" to="/settings/change-password" />
            </SettingsSection>

            <SettingsSection title="Privacy">
              <SettingsItem icon={<Lock className="h-5 w-5" />} title="Private Account" subtitle="Only followers can see your posts" toggle={{ checked: currentPrivate, onChange: handlePrivacyToggle, disabled: privacyLoading }} />
              <SettingsItem icon={<Eye className="h-5 w-5" />} title="Show Online Status" subtitle="Let friends see when you are active" toggle={{ checked: onlineStatusVisible, onChange: handleOnlineStatusToggle, disabled: onlineLoading }} />
              <SettingsItem icon={<UserX className="h-5 w-5" />} title="Blocked Users" subtitle="Review accounts you blocked" to="/settings/blocked-users" />
              <SettingsItem icon={<MessageCircle className="h-5 w-5" />} title="Muted Users" subtitle="Review accounts you muted" to="/settings/muted-users" />
            </SettingsSection>

            <SettingsSection title="Account & App">
              <SettingsItem icon={<Bookmark className="h-5 w-5" />} title="Saved Posts" to="/settings/saved-posts" />
              <SettingsItem icon={<CircleUserRound className="h-5 w-5" />} title="About This Account" subtitle="Profile information and account details" to={user?.username ? `/about/${user.username}` : "/profile"} />
              <SettingsItem
                icon={<Moon className="h-5 w-5" />}
                title="Theme for App"
                subtitle={theme === "dark" ? "Dark" : "White"}
                onClick={() => setTheme(theme === "dark" ? "white" : "dark")}
              />
            </SettingsSection>

            <SettingsSection title="About & Support">
              <SettingsItem icon={<Zap className="h-5 w-5" />} title="About BitGlow" subtitle="Version, features & tech stack" to="/about-app" />
              <SettingsItem icon={<FileText className="h-5 w-5" />} title="Terms of Service" subtitle="Rules & usage policies" to="/terms" />
              <SettingsItem icon={<Shield className="h-5 w-5" />} title="Privacy Policy" subtitle="How we handle your data" to="/privacy" />
              <SettingsItem icon={<MessageCircle className="h-5 w-5" />} title="Help Center" subtitle="Browse help articles" to="/help" />
              <SettingsItem icon={<Mail className="h-5 w-5" />} title="Contact Support" subtitle="Reach us directly" to="/contact" />
              <SettingsItem icon={<Flag className="h-5 w-5" />} title="Report a Problem" subtitle="Submit a bug or issue" to="/report" />
            </SettingsSection>

            <SettingsSection title="Account Info">
              <SettingsItem
                icon={<Trash2 className="h-5 w-5" />}
                title="Delete Account"
                subtitle="Schedule account deactivation & deletion"
                to="/settings/delete-account"
              />
            </SettingsSection>

            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl border border-red-500 px-5 py-3.5 text-center text-sm font-bold text-red-500 transition-all hover:bg-red-500/10 active:scale-[0.99]"
            >
              Log Out
            </button>

          {/* Confirmation dialogs for toggles */}
          <ConfirmDialog
            open={privacyConfirmOpen}
            title={privacyNextValue ? "Make account private?" : "Make account public?"}
            message={privacyNextValue ? "Only approved followers can view your profile and posts." : "Everyone can view your profile and posts."}
            confirmLabel={privacyNextValue ? "Make Private" : "Make Public"}
            cancelLabel="Cancel"
            onConfirm={performPrivacyToggle}
            onClose={() => { setPrivacyConfirmOpen(false); setPrivacyNextValue(null); }}
            loading={privacyLoading}
          />

          <ConfirmDialog
            open={onlineConfirmOpen}
            title={onlineNextValue ? "Show online status?" : "Hide online status?"}
            message={onlineNextValue ? "Others can see when you're online." : "Others won't see when you're online."}
            confirmLabel={onlineNextValue ? "Show Status" : "Hide Status"}
            cancelLabel="Cancel"
            onConfirm={performOnlineStatusToggle}
            onClose={() => { setOnlineConfirmOpen(false); setOnlineNextValue(null); }}
            loading={onlineLoading}
          />

        </div>
        </div>
      </main>
    </div>
  );
}
