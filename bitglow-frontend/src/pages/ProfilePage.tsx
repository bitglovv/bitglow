import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../components/common/Header";
import { api, User, Friend } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { usePresenceStore } from "../store/presenceStore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { 
  Settings, X, Edit3, Share2, Send, MessageSquare, 
  Video, UserPlus, ArrowLeft, MoreVertical, 
  UserMinus, UserX, UserCheck, Link2, Lock 
} from "lucide-react";
import clsx from "clsx";
import { ProfileHeaderSkeleton, PostCardSkeleton } from "../components/ui/Skeleton";
import { navigateBack } from "../utils/navigateBack";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { blockUserEverywhere, unblockUserEverywhere } from "../utils/socialActions";
import { useChatStore } from "../store/chatStore";

function CountButton({
  label,
  count,
  onClick,
  disabled
}: {
  label: string;
  count: number | string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (onClick && !disabled) {
    return (
      <button
        onClick={onClick}
        className="text-left hover:text-white transition-colors"
      >
        <span className="font-semibold">{count}</span> {label}
      </button>
    );
  }

  return (
    <span className="text-[#8b8f9c]">
      <span className="font-semibold text-[#e6e6eb]">{count}</span> {label}
    </span>
  );
}

function ListModal({
  title,
  items,
  isLoading,
  onClose,
  emptyText,
  renderAction,
}: {
  title: string;
  items: Friend[];
  isLoading?: boolean;
  onClose: () => void;
  emptyText: string;
  renderAction?: (f: Friend) => React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center p-0 sm:p-4 touch-none text-white">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-zinc-950 border-t sm:border border-white/10 sm:rounded-2xl rounded-t-3xl pt-2 pb-5 px-5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 max-h-[85vh] flex flex-col pointer-events-auto">

        {/* Mobile drag handle indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-8">{emptyText}</div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {items.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                <Link
                  to={`/profile/${f.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 group min-w-0"
                >
                  <Avatar src={f.avatarUrl} alt={f.username} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-white group-hover:underline truncate">
                      {f.displayName || f.username}
                    </p>
                    <p className="text-[12px] text-zinc-500 truncate">@{f.username}</p>
                  </div>
                </Link>
                {renderAction && (
                  <div className="ml-auto shrink-0">
                    {renderAction(f)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username?: string }>();
  const { user: loggedInUser, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [pendingFollows, setPendingFollows] = useState<any[]>([]);
  const [shareLabel, setShareLabel] = useState("Share Profile");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  // Modal lists for viewed profile (may differ from own lists when viewing another user)
  const [modalFollowers, setModalFollowers] = useState<Friend[]>([]);
  const [modalFollowing, setModalFollowing] = useState<Friend[]>([]);
  const [modalFriends, setModalFriends] = useState<Friend[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [showCancelRequestConfirm, setShowCancelRequestConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = Boolean(loggedInUser && profile && loggedInUser.username === profile.username);
  const isMutualFriend = Boolean(!isOwner && profile && friends.some((f) => f.id === profile.id));
  const isFollowing = Boolean(!isOwner && !isMutualFriend && profile && following.some((f) => f.id === profile.id));
  const isPending = Boolean(!isOwner && !isMutualFriend && !isFollowing && profile && pendingFollows.some((f) => f.id === profile.id));
  const isAuthorized = Boolean(isOwner || isMutualFriend || isFollowing);

  const presenceEntry = usePresenceStore((s) => (profile?.id ? s.presence[profile.id] : undefined));
  const visible =
    presenceEntry?.visible ??
    profile?.onlineStatusVisible ??
    true;
  const isOnline =
    isOwner ? true : (presenceEntry?.isOnline ?? false);
  const shouldShowPresence = visible;
  const statusLabel = isOnline ? "ONLINE" : "OFFLINE";

  const followersCount = isOwner ? followers.length : (profile?.followersCount ?? 0);
  const followingCount = isOwner ? following.length : (profile?.followsCount ?? 0);
  const friendsCount = isOwner ? friends.length : ((profile as any)?.friendsCount ?? 0);
  const canOpenLiveRoom = Boolean(profile && (isOwner || isMutualFriend));

  useEffect(() => {
    if (!profile) return;
    const s = useChatStore.getState();
    setIsBlocked(s.restrictedUsers.has(profile.id));

    const onBlockEvent = (e: Event) => {
      const { userId, blocked } = (e as CustomEvent).detail || {};
      if (profile && userId === profile.id) {
        setIsBlocked(Boolean(blocked));
      }
    };
    window.addEventListener("bitglow:block-changed", onBlockEvent);
    return () => window.removeEventListener("bitglow:block-changed", onBlockEvent);
  }, [profile?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (isAuthLoading) return;
      setLoading(true);
      setError("");

      if (!username) {
        if (loggedInUser) {
          setProfile(loggedInUser);
        } else {
          setError("User not found");
        }
        setLoading(false);
        return;
      }

      try {
        const data = await api.profile.get(username);
        if (cancelled) return;
        if (!data) {
          setError("User not found");
        } else {
          setProfile(data);
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.status === 404 || err?.message === "User not found" || err?.message === "Profile not found") {
          setError("User not found");
        } else {
          setError(err?.message || "Failed to load profile. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [username, loggedInUser, isAuthLoading]);

  useEffect(() => {
    if (!loggedInUser) return;
    let cancelled = false;
    Promise.all([
      api.user.friends(),
      api.user.followers(),
      api.user.following(),
      api.user.pendingFollows()
    ]).then(([friendsList, followersList, followingList, pendingList]) => {
      if (cancelled) return;
      setFriends(friendsList || []);
      setFollowers(followersList || []);
      setFollowing(followingList || []);
      setPendingFollows(pendingList || []);
    }).catch(() => {
      if (!cancelled) {
        setFriends([]);
        setFollowers([]);
        setFollowing([]);
        setPendingFollows([]);
      }
    });
    return () => { cancelled = true; };
  }, [loggedInUser?.id]);

  useEffect(() => {
    if (profile) {
      document.title = `BitGlow \u2022 Profile (@${profile.username})`;
    } else if (!loading) {
      document.title = "BitGlow \u2022 Profile";
    }
  }, [profile, loading]);

  const handleFollowToggle = async () => {
    if (!profile || !loggedInUser || isOwner || isFollowLoading) return;
    if (isMutualFriend) {
      setShowUnfriendConfirm(true);
      return;
    }
    if (isFollowing) {
      setShowUnfollowConfirm(true);
      return;
    }
    if (isPending) {
      setShowCancelRequestConfirm(true);
      return;
    }

    setIsFollowLoading(true);
    try {
      const status = await api.user.follow(profile.id, profile.username);
      if (status === 'pending') {
        setPendingFollows((prev) => {
          if (prev.some((f) => f.id === profile.id)) return prev;
          return [...prev, { id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }];
        });
      } else if (status === 'accepted' || status === true) {
        setFollowing((prev) => {
          if (prev.some((f) => f.id === profile.id)) return prev;
          return [
            ...prev,
            {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl
            }
          ];
        });
        const fresh = await api.profile.get(profile.username);
        if (fresh) setProfile(fresh);
      }
    } catch (err) {
      console.error("Follow action failed", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleConfirmUnfollow = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const ok = await api.user.unfollow(profile.id);
      if (ok) {
        setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
        setFriends((prev) => prev.filter((f) => f.id !== profile.id));
        setPendingFollows((prev) => prev.filter((f) => f.id !== profile.id));
        const fresh = await api.profile.get(profile.username);
        if (fresh) setProfile(fresh);
      }
    } catch (err) {
      console.error("Unfollow failed", err);
    } finally {
      setActionLoading(false);
      setShowUnfollowConfirm(false);
    }
  };

  const handleConfirmUnfriend = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const ok = await api.user.unfollow(profile.id);
      if (ok) {
        setFriends((prev) => prev.filter((f) => f.id !== profile.id));
        setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
        setPendingFollows((prev) => prev.filter((f) => f.id !== profile.id));
        const fresh = await api.profile.get(profile.username);
        if (fresh) setProfile(fresh);
      }
    } catch (err) {
      console.error("Unfriend failed", err);
    } finally {
      setActionLoading(false);
      setShowUnfriendConfirm(false);
    }
  };

  const handleConfirmCancelRequest = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const ok = await api.user.unfollow(profile.id);
      if (ok) {
        setPendingFollows((prev) => prev.filter((f) => f.id !== profile.id));
      }
    } catch (err) {
      console.error("Cancel request failed", err);
    } finally {
      setActionLoading(false);
      setShowCancelRequestConfirm(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!profile || isOwner) return;
    setActionLoading(true);
    try {
      await blockUserEverywhere({
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      setIsBlocked(true);
      setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
      setFriends((prev) => prev.filter((f) => f.id !== profile.id));
      setPendingFollows((prev) => prev.filter((f) => f.id !== profile.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setActionLoading(false);
      setShowBlockConfirm(false);
    }
  };

  const handleConfirmUnblock = async () => {
    if (!profile || isOwner) return;
    setActionLoading(true);
    try {
      await unblockUserEverywhere(profile.id);
      setIsBlocked(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setActionLoading(false);
      setShowUnblockConfirm(false);
    }
  };

  const handleModalUnfollow = async (targetId: string) => {
    try {
      const success = await api.user.unfollow(targetId);
      if (success) {
        setFollowing(prev => prev.filter(f => f.id !== targetId));
        setFriends(prev => prev.filter(f => f.id !== targetId));
        setModalFollowing(prev => prev.filter(f => f.id !== targetId));
        setModalFriends(prev => prev.filter(f => f.id !== targetId));
      }
    } catch (err) {
      console.error("Failed to unfollow", err);
    }
  };

  const handleModalFollow = async (targetId: string, targetUsername: string) => {
    try {
      const status = await api.user.follow(targetId, targetUsername);
      if (status) {
        const followerUser = (modalFollowers.length ? modalFollowers : followers).find(f => f.id === targetId);
        if (followerUser && !following.some(f => f.id === targetId)) {
          setFollowing(prev => [...prev, followerUser]);
          setModalFollowing(prev => [...prev, followerUser]);
        }
      }
    } catch (err) {
      console.error("Failed to follow", err);
    }
  };

  /** Open Followers modal — fetches the viewed profile's followers if not own */
  const handleOpenFollowers = async () => {
    setShowFollowers(true);
    if (isOwner) {
      setModalFollowers(followers);
      return;
    }
    if (!profile) return;
    setIsModalLoading(true);
    try {
      const list = await api.user.userFollowers(profile.id);
      setModalFollowers(list);
    } catch {
      setModalFollowers([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  /** Open Following modal — fetches the viewed profile's following if not own */
  const handleOpenFollowing = async () => {
    setShowFollowing(true);
    if (isOwner) {
      setModalFollowing(following);
      return;
    }
    if (!profile) return;
    setIsModalLoading(true);
    try {
      const list = await api.user.userFollowing(profile.id);
      setModalFollowing(list);
    } catch {
      setModalFollowing([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  /** Open Friends modal — fetches the viewed profile's friends if not own */
  const handleOpenFriends = async () => {
    setShowFriends(true);
    if (isOwner) {
      setModalFriends(friends);
      return;
    }
    if (!profile) return;
    setIsModalLoading(true);
    try {
      const list = await api.user.userFriends(profile.id);
      setModalFriends(list);
    } catch {
      setModalFriends([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `BitGlow - ${profile.username}`, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareLabel("Copied");
        setTimeout(() => setShareLabel("Share Profile"), 2000);
      }
    } catch (err) {
      setShareLabel("Share Profile");
    }
  };

  const handleDirectMessage = () => {
    if (!profile) return;
    if (profile.isPrivate && !isAuthorized) {
      window.alert("This account is private. Follow request must be accepted before messaging.");
      return;
    }
    const targetUser = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.avatarUrl,
    };
    sessionStorage.setItem("bitglow:dmUserId", targetUser.id);
    sessionStorage.setItem("bitglow:dmUsername", targetUser.username);
    sessionStorage.setItem("bitglow:dmDisplayName", targetUser.displayName);
    if (targetUser.avatarUrl) {
      sessionStorage.setItem("bitglow:dmAvatarUrl", targetUser.avatarUrl);
    } else {
      sessionStorage.removeItem("bitglow:dmAvatarUrl");
    }

    navigate(`/messages?userId=${encodeURIComponent(targetUser.id)}`, {
      state: { directDmUser: targetUser },
    });
  };

  const handleStartLiveChat = () => {
    if (!profile || !canOpenLiveRoom) return;
    navigate("/live");
  };

  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
        <Header showTop={false} />
        <main className="relative flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-8 overflow-y-auto custom-scrollbar md:pb-8">
          <ProfileHeaderSkeleton />
          <div className="mt-10 space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-[#e6e6eb] flex flex-col overflow-hidden">
      <Header showTop={false} />

      <main className="relative flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-8 overflow-y-auto custom-scrollbar md:pb-8">
        
        {/* Navigation Actions */}
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-6 flex items-center justify-between z-20">
          <button 
            type="button"
            onClick={() => navigateBack(navigate, "/home")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-white transition duration-200 hover:-translate-y-[1px] hover:bg-white/[0.04] active:translate-y-[1px]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <Link
                to="/settings"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-white transition duration-200 hover:-translate-y-[1px] hover:bg-white/[0.04] active:translate-y-[1px]"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
            ) : (
              <div className="relative" ref={menuRef}>
                 <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white transition-all hover:bg-white/10"
                  aria-label="More Options"
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-12 w-52 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200 z-[100]">
                    {(isFollowing || isMutualFriend) && (
                       <button 
                        onClick={() => { 
                          setShowMoreMenu(false);
                          if (isMutualFriend) setShowUnfriendConfirm(true);
                          else if (isFollowing) setShowUnfollowConfirm(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <UserMinus className="w-4 h-4" />
                        {isMutualFriend ? "Unfriend" : "Unfollow"}
                      </button>
                    )}
                    {isBlocked ? (
                      <button 
                        onClick={() => { setShowMoreMenu(false); setShowUnblockConfirm(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                      >
                        <UserCheck className="w-4 h-4" />
                        Unblock User
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setShowMoreMenu(false); setShowBlockConfirm(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <UserX className="w-4 h-4" />
                        Block User
                      </button>
                    )}
                    <button 
                      onClick={() => { handleShare(); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <Link2 className="w-4 h-4" />
                      Share Profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start pt-8">
          <div className="shrink-0 relative">
            <Avatar src={profile.avatarUrl} alt={profile.username} size="2xl" status={visible && isOnline ? "online" : "none"} />
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start sm:gap-4 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{profile.displayName || profile.username}</h1>
              {profile.displayName && profile.displayName !== profile.username && (
                <span className="text-[15px] font-semibold text-zinc-400">@{profile.username}</span>
              )}
              {shouldShowPresence && (
                <div className="flex items-center justify-center gap-2 text-xs mt-1 sm:mt-0">
                  {isOnline && (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    />
                  )}
                  <span
                    className={`font-bold uppercase tracking-widest ${
                      isOnline ? "text-emerald-400" : "text-zinc-500"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
              )}
            </div>

            {profile.isPrivate && !isAuthorized ? (
              <div className="mt-8 text-center md:text-left">
                <div className="inline-flex flex-col items-center sm:items-start p-6 rounded-2xl bg-white/[0.02] border border-white/5 max-w-lg">
                  <div className="flex items-center gap-3 text-white font-bold text-base mb-2">
                    <Lock className="w-5 h-5 text-zinc-400" />
                    <span>Private Account</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6 text-center sm:text-left">
                    This account is private. Follow to connect and see their protected content.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isPending ? "secondary" : "primary"}
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className="px-6"
                    >
                      {isPending ? "Requested" : "Follow"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center md:justify-start gap-8 mt-6 text-sm">
                  <CountButton
                    label="Followers"
                    count={followersCount}
                    onClick={handleOpenFollowers}
                  />
                  <CountButton
                    label="Following"
                    count={followingCount}
                    onClick={handleOpenFollowing}
                  />
                  <CountButton
                    label="Friends"
                    count={friendsCount}
                    onClick={handleOpenFriends}
                  />
                </div>

                <div className="mt-6 space-y-2 text-center md:text-left">
                  <div className="text-[15px] leading-relaxed text-zinc-200 whitespace-pre-line max-w-2xl">
                    {profile.bio || "No bio yet."}
                  </div>

                  {profile.website && (
                    <div className="pt-1">
                      <a
                        className="text-[15px] text-blue-500 hover:text-blue-400 hover:underline"
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}

                  {profile.location && (
                    <div className="text-[15px] font-semibold text-zinc-400 tracking-wide">
                      {profile.location}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-4">
                  {isOwner ? (
                    <>
                      <Button variant="secondary" onClick={() => navigate("/profile/edit")}>
                        <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                      </Button>
                      <Button variant="secondary" onClick={handleStartLiveChat}>
                        <Video className="w-4 h-4 mr-2" /> Live Chat
                      </Button>
                      <Button variant="secondary" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" /> {shareLabel}
                      </Button>
                    </>
                  ) : (
                    <>
                      {isBlocked ? (
                        <Button
                          variant="secondary"
                          onClick={() => setShowUnblockConfirm(true)}
                          className="flex items-center gap-2"
                        >
                          <UserCheck className="w-4 h-4" /> Unblock
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant={isMutualFriend || isFollowing || isPending ? "secondary" : "primary"}
                            onClick={handleFollowToggle}
                            disabled={isFollowLoading}
                          >
                            {isMutualFriend || isFollowing || isPending ? <Send className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            {isMutualFriend ? "Friends" : isFollowing ? "Following" : isPending ? "Requested" : "Follow"}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleDirectMessage}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" /> Message
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleStartLiveChat}
                            disabled={!canOpenLiveRoom}
                          >
                            <Video className="w-4 h-4 mr-2" /> Live Space
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {!isOwner && !canOpenLiveRoom && (
                  <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Mutual friends only to access Live Space.</div>
                )}
              </>
            )}
          </div>
        </div>

      </main>

      {showFollowers && (
        <ListModal
          title="Followers"
          items={modalFollowers}
          isLoading={isModalLoading}
          onClose={() => { setShowFollowers(false); setModalFollowers([]); }}
          emptyText="No followers yet."
          renderAction={isOwner ? (f) => {
            const isFollowingThem = following.some(followed => followed.id === f.id);
            return isFollowingThem ? (
              <Button variant="secondary" size="sm" onClick={() => handleModalUnfollow(f.id)}>Unfollow</Button>
            ) : (
              <Button size="sm" onClick={() => handleModalFollow(f.id, f.username)}>Follow Back</Button>
            );
          } : undefined}
        />
      )}

      {showFollowing && (
        <ListModal
          title="Following"
          items={modalFollowing}
          isLoading={isModalLoading}
          onClose={() => { setShowFollowing(false); setModalFollowing([]); }}
          emptyText="Not following anyone yet."
          renderAction={isOwner ? (f) => (
            <Button variant="secondary" size="sm" onClick={() => handleModalUnfollow(f.id)}>Unfollow</Button>
          ) : undefined}
        />
      )}

      {showFriends && (
        <ListModal
          title="Friends"
          items={modalFriends}
          isLoading={isModalLoading}
          onClose={() => { setShowFriends(false); setModalFriends([]); }}
          emptyText="No friends yet."
          renderAction={isOwner ? (f) => (
            <Button variant="secondary" size="sm" onClick={() => handleModalUnfollow(f.id)}>Unfriend</Button>
          ) : undefined}
        />
      )}

      <ConfirmDialog
        open={showUnfollowConfirm}
        title={`Unfollow @${profile.username}?`}
        message={
          profile.isPrivate
            ? "Unfollowing will remove your connection. You will need to follow again and be accepted to reconnect."
            : `Are you sure you want to unfollow @${profile.username}?`
        }
        confirmLabel="Unfollow"
        cancelLabel="Cancel"
        onConfirm={handleConfirmUnfollow}
        onClose={() => setShowUnfollowConfirm(false)}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showUnfriendConfirm}
        title={`Unfriend @${profile.username}?`}
        message={
          profile.isPrivate
            ? "Unfriending will remove your connection. You will need to follow again and be accepted to reconnect."
            : `Are you sure you want to unfriend @${profile.username}?`
        }
        confirmLabel="Unfriend"
        cancelLabel="Cancel"
        onConfirm={handleConfirmUnfriend}
        onClose={() => setShowUnfriendConfirm(false)}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showCancelRequestConfirm}
        title="Cancel follow request?"
        message={`Cancel your pending follow request to @${profile.username}?`}
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        onConfirm={handleConfirmCancelRequest}
        onClose={() => setShowCancelRequestConfirm(false)}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showBlockConfirm}
        title={`Block @${profile.username}?`}
        message="Blocked accounts cannot follow, message, or view your posts. Are you sure you want to block?"
        confirmLabel="Block"
        cancelLabel="Cancel"
        onConfirm={handleConfirmBlock}
        onClose={() => setShowBlockConfirm(false)}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showUnblockConfirm}
        title={`Unblock @${profile.username}?`}
        message="Unblocking will allow this user to view your profile, follow you, and message you again. Are you sure you want to unblock?"
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        onConfirm={handleConfirmUnblock}
        onClose={() => setShowUnblockConfirm(false)}
        loading={actionLoading}
      />
    </div>
  );
}
