import { useEffect, useState } from "react";
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
  UserMinus, UserX, Link2, Lock 
} from "lucide-react";
import { ProfileHeaderSkeleton, PostCardSkeleton } from "../components/ui/Skeleton";
import { UserListItem } from '../components/user/UserListItem';
import { navigateBack } from "../utils/navigateBack";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ReportSheet } from "../components/common/ReportSheet";
import { blockUserEverywhere, muteUserEverywhere, reportUser, unmuteUserEverywhere, unblockUserEverywhere } from "../utils/socialActions";
import { useChatStore } from "../store/chatStore";
import ActionSheet from "../components/common/ActionSheet";

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
  onClose,
  emptyText,
  renderAction
}: {
  title: string;
  items: Friend[];
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

        {items.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-8">{emptyText}</div>
        ) : (
          <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {items.map((f) => (
              <UserListItem
                key={f.id}
                user={f}
                actionSlot={renderAction ? (
                  <div className="ml-4 shrink-0">
                    {renderAction(f)}
                  </div>
                ) : undefined}
              />
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [pendingFollows, setPendingFollows] = useState<any[]>([]);
  const [shareLabel, setShareLabel] = useState("Share Profile");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const isOwner = loggedInUser && profile && loggedInUser.username === profile.username;
  // Use centralized presence store for accurate presence + visibility handling
  // presence.visible controls whether any presence indicator is shown
  // presence.isOnline controls whether the green dot is shown
  // derive presence from presence store when available
  // Always call the hook (do not call hooks conditionally)
  const presenceEntry = usePresenceStore((s) => (profile?.id ? s.presence[profile.id] : undefined));
  const visible = presenceEntry?.visible ?? (profile?.onlineStatusVisible ?? true);
  const isOnline = presenceEntry?.isOnline ?? false;
  const statusLabel = visible ? "ONLINE" : "";

  const followersCount = isOwner ? followers.length : (profile?.followersCount ?? 0);
  const followingCount = isOwner ? following.length : (profile?.followsCount ?? 0);
  const friendsCount = isOwner ? friends.length : ((profile as any)?.friendsCount ?? 0);
  const isMutualFriend = !!profile && friends.some((f) => f.id === profile.id);
  const canOpenLiveRoom = !!profile && (isOwner || isMutualFriend);

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
      } catch (err) {
        setError("User not found");
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

  useEffect(() => {
    if (!profile || !loggedInUser) return;
    const isFriend = friends.some((f) => f.id === profile.id);
    const isFollowingUser = following.some((f) => f.id === profile.id);
    const isPendingUser = pendingFollows.some((f) => f.id === profile.id);
    setIsFollowing(isFollowingUser || isFriend);
    setIsPending(isPendingUser);

    // initialize mute/block state from chat store for immediate UI feedback
    const chatState = useChatStore.getState();
    setIsMuted(!!profile.id && chatState.mutedUsers.has(profile.id));
    setIsBlocked(!!profile.id && chatState.restrictedUsers.has(profile.id));

    const onMuteChanged = (event: Event) => {
      const { userId, muted } = (event as CustomEvent).detail || {};
      if (!userId || userId !== profile.id) return;
      setIsMuted(!!muted);
    };
    const onBlockChanged = (event: Event) => {
      const { userId, blocked } = (event as CustomEvent).detail || {};
      if (!userId || userId !== profile.id) return;
      setIsBlocked(!!blocked);
      // if blocked, reflect relationship removals immediately in UI
      if (blocked) {
        setIsFollowing(false);
        setIsPending(false);
        setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
        setFriends((prev) => prev.filter((f) => f.id !== profile.id));
      }
    };

    window.addEventListener("bitglow:mute-changed", onMuteChanged);
    window.addEventListener("bitglow:block-changed", onBlockChanged);
    return () => {
      window.removeEventListener("bitglow:mute-changed", onMuteChanged);
      window.removeEventListener("bitglow:block-changed", onBlockChanged);
    };
  }, [friends, following, pendingFollows, profile, loggedInUser]);

  const handleFollowToggle = async () => {
    if (!profile || !loggedInUser || isOwner) return;
    setIsFollowLoading(true);
    try {
      const isFriend = friends.some((f) => f.id === profile.id);
      if (isFollowing || isPending) {
        const success = await api.user.unfollow(profile.id);
        if (success) {
          setIsFollowing(false);
          setIsPending(false);
          setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
          setFriends((prev) => prev.filter((f) => f.id !== profile.id));
          setPendingFollows((prev) => prev.filter((f) => f.id !== profile.id));
        }
      } else {
        const status = await api.user.follow(profile.id, profile.username);
        if (status === 'pending') {
          setIsPending(true);
          setPendingFollows((prev) => {
            if (prev.some((f) => f.id === profile.id)) return prev;
            return [...prev, { id: profile.id, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl }];
          });
        } else if (status === 'accepted' || status === true) {
          setIsFollowing(true);
          if (!isFriend) {
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
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile || isOwner) return;
    // show confirm when attempting to block; unblocking happens inline
    setShowBlockConfirm(true);
  };

  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const handleBlockConfirm = async () => {
    if (!profile) return;
    setBlockLoading(true);
    try {
      await blockUserEverywhere(profile);
      // immediately remove follow/friend relationships in the UI
      setIsFollowing(false);
      setIsPending(false);
      setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
      setFriends((prev) => prev.filter((f) => f.id !== profile.id));
      setIsBlocked(true);
      // keep on the profile page so users can quickly Unblock if they change their mind
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setBlockLoading(false);
      setShowBlockConfirm(false);
    }
  };

  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  const [muteTargetAction, setMuteTargetAction] = useState<'mute' | 'unmute'>('mute');

  const handleMuteUser = async () => {
    if (!profile || isOwner || muteLoading) return;
    // show confirmation for both mute and unmute
    setMuteTargetAction(isMuted ? 'unmute' : 'mute');
    setShowMuteConfirm(true);
  };

  const handleMuteConfirm = async () => {
    if (!profile) return;
    setMuteLoading(true);
    try {
      if (isMuted) {
        await unmuteUserEverywhere(profile.id);
        setIsMuted(false);
      } else {
        await muteUserEverywhere(profile);
        setIsMuted(true);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to toggle mute");
    } finally {
      setMuteLoading(false);
      setShowMuteConfirm(false);
    }
  };

  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);

  const handleToggleBlock = async () => {
    if (!profile || isOwner) return;
    if (isBlocked) {
      // show confirm for unblock as well
      setShowUnblockConfirm(true);
    } else {
      setShowBlockConfirm(true);
    }
  };

  const handleUnblockConfirm = async () => {
    if (!profile) return;
    try {
      await unblockUserEverywhere(profile.id);
      setIsBlocked(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setShowUnblockConfirm(false);
    }
  };

  const handleCopyProfileLink = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.username}`;
    await navigator.clipboard.writeText(url);
    setShareLabel("Copied");
    setTimeout(() => setShareLabel("Share Profile"), 2000);
  };

  const handleReportSubmit = async (reason: string) => {
    if (!profile) return;
    try {
      await reportUser(profile.id, reason);
      setShowReportSheet(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to submit report");
    }
  };

  const handleModalUnfollow = async (targetId: string) => {
    try {
      const success = await api.user.unfollow(targetId);
      if (success) {
        setFollowing(prev => prev.filter(f => f.id !== targetId));
        setFriends(prev => prev.filter(f => f.id !== targetId));
      }
    } catch (err) {
      console.error("Failed to unfollow", err);
    }
  };

  const handleModalFollow = async (targetId: string, targetUsername: string) => {
    try {
      const status = await api.user.follow(targetId, targetUsername);
      if (status) {
        const followerUser = followers.find(f => f.id === targetId);
        if (followerUser && !following.some(f => f.id === targetId)) {
          setFollowing(prev => [...prev, followerUser]);
        }
      }
    } catch (err) {
      console.error("Failed to follow", err);
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
              <>
                 <button 
                  onClick={() => setShowActionSheet(true)}
                  className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white transition-all hover:bg-white/10"
                  aria-label="More Options"
                >
                  <MoreVertical className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start pt-8">
          <div className="shrink-0 relative">
            <Avatar src={profile.avatarUrl} alt={profile.username} size="2xl" status={visible && isOnline ? 'online' : 'none'} />
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start sm:gap-4 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{profile.displayName || profile.username}</h1>
              {profile.displayName && profile.displayName !== profile.username && (
                <span className="text-[15px] font-semibold text-zinc-400">@{profile.username}</span>
              )}
              <div className="flex items-center justify-center gap-2 text-xs mt-1 sm:mt-0">
                {visible && isOnline ? <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> : null}
                <span className="font-bold uppercase tracking-widest text-[#8b8f9c]">{statusLabel}</span>
              </div>

              {profile.isPrivate && (
                <div className="ml-3 inline-flex items-center gap-2 rounded-full bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 mt-2">
                  <Lock className="w-4 h-4" />
                  <span className="font-semibold">Private Account</span>
                </div>
              )}
            </div>

            {profile.isPrivate && !isOwner && !isFollowing && !isMutualFriend ? (
              <div className="mt-8 text-center md:text-left">
                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">This account is private. Follow this account to view posts and profile information.</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center md:justify-start gap-8 mt-6 text-sm">
                  <CountButton
                    label="Followers"
                    count={followersCount}
                    onClick={isOwner ? () => setShowFollowers(true) : undefined}
                    disabled={!isOwner}
                  />
                  <CountButton
                    label="Following"
                    count={followingCount}
                    onClick={isOwner ? () => setShowFollowing(true) : undefined}
                    disabled={!isOwner}
                  />
                  <CountButton
                    label="Friends"
                    count={friendsCount}
                    onClick={isOwner ? () => setShowFriends(true) : undefined}
                    disabled={!isOwner}
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
              </>
            )}

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
                  <Button
                    variant={isMutualFriend || isFollowing || isPending ? "secondary" : "primary"}
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                  >
                    {isMutualFriend || isFollowing || isPending ? <Send className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {isMutualFriend ? "Friends" : isFollowing ? "Following" : isPending ? "Requested" : (profile.isPrivate ? "Request Follow" : "Follow")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      sessionStorage.setItem("bitglow:dmUserId", profile.id);
                      navigate("/messages");
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> {(profile.isPrivate && !isFollowing && !isMutualFriend) ? "Message Request" : "Message"}
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
            </div>

            {!isOwner && !canOpenLiveRoom && (
              <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Mutual friends only to access Live Space.</div>
            )}
          </div>
        </div>

      </main>

      {showFollowers && (
        <ListModal
          title="Followers"
          items={followers}
          onClose={() => setShowFollowers(false)}
          emptyText="No followers yet."
          renderAction={isOwner ? (f) => {
            const isFollowingThem = following.some(followed => followed.id === f.id);
            return isFollowingThem ? (
              <Button variant="secondary" size="sm" onClick={() => handleModalUnfollow(f.id)}>Unfollow</Button>
            ) : (
              <Button size="sm" onClick={() => handleModalFollow(f.id, f.username)}>{f.isPrivate ? "Request Follow" : "Follow Back"}</Button>
            );
          } : undefined}
        />
      )}

      {showFollowing && (
        <ListModal
          title="Following"
          items={following}
          onClose={() => setShowFollowing(false)}
          emptyText="Not following anyone yet."
          renderAction={isOwner ? (f) => (
            <Button variant="secondary" size="sm" onClick={() => handleModalUnfollow(f.id)}>Unfollow</Button>
          ) : undefined}
        />
      )}

      {showFriends && (
        <ListModal
          title="Friends"
          items={friends}
          onClose={() => setShowFriends(false)}
          emptyText="No friends yet."
          renderAction={isOwner ? (f) => (
            <Button variant="secondary" size="sm" onClick={() => handleModalUnfollow(f.id)}>Unfriend</Button>
          ) : undefined}
        />
      )}

      <ConfirmDialog
        open={showBlockConfirm}
        title="Block user"
        message={<div>Are you sure you want to block this user? They will no longer be able to message or interact with you.</div>}
        confirmLabel="Block"
        cancelLabel="Cancel"
        onConfirm={handleBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        loading={blockLoading}
      />

      <ConfirmDialog
        open={showUnblockConfirm}
        title="Unblock user"
        message={<div>Are you sure you want to unblock this user? They will be able to follow and message you again.</div>}
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        onConfirm={handleUnblockConfirm}
        onClose={() => setShowUnblockConfirm(false)}
        loading={false}
      />

      <ConfirmDialog
        open={showMuteConfirm}
        title={muteTargetAction === 'mute' ? 'Mute user' : 'Unmute user'}
        message={muteTargetAction === 'mute' ? <div>Muting will hide posts and DM notifications from this user. You will remain connected. Proceed?</div> : <div>Unmute will restore posts and DM notifications from this user. Proceed?</div>}
        confirmLabel={muteTargetAction === 'mute' ? 'Mute' : 'Unmute'}
        cancelLabel="Cancel"
        onConfirm={handleMuteConfirm}
        onClose={() => setShowMuteConfirm(false)}
        loading={muteLoading}
      />

      <ActionSheet
        open={showActionSheet}
        title={`@${profile.username}`}
        onClose={() => setShowActionSheet(false)}
        items={[
          { label: "Share Profile", onClick: handleShare, icon: <Share2 className="h-4 w-4" /> },
          { label: "Copy Profile Link", onClick: () => void handleCopyProfileLink(), icon: <Link2 className="h-4 w-4" /> },
          { label: "Report User", onClick: () => setShowReportSheet(true), icon: <UserX className="h-4 w-4" /> },
          // simplified: use a single clean section for moderation actions and auto-toggle labels
          { label: isMuted ? "Unmute User" : "Mute User", onClick: () => void handleMuteUser(), disabled: muteLoading, icon: <UserMinus className="h-4 w-4" /> },
          { label: isBlocked ? "Unblock User" : "Block User", onClick: handleToggleBlock, danger: !isBlocked, icon: <UserX className="h-4 w-4" /> },
        ]}
      />
      <ReportSheet
        isOpen={showReportSheet}
        title="Report User"
        prompt={`Why are you reporting @${profile.username}?`}
        options={["Harassment or bullying", "Spam or scams", "Hate speech", "Impersonation", "Inappropriate content"]}
        onClose={() => setShowReportSheet(false)}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
