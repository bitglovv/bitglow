import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../components/common/Header";
import { api, User, Friend } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { 
  Settings, X, Edit3, Share2, Send, MessageSquare, 
  Video, UserPlus, ArrowLeft, MoreVertical, 
  UserMinus, UserX, Link2 
} from "lucide-react";
import clsx from "clsx";

// ... (CountButton and ListModal remain same but we can move them or keep them)

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
              <div key={f.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                <Link to={`/profile/${f.username}`} onClick={onClose} className="flex items-center gap-3 group shrink-0">
                  <Avatar src={f.avatarUrl} alt={f.username} size="sm" />
                  <div className="text-[15px] font-semibold text-white group-hover:underline">{f.username}</div>
                </Link>
                {renderAction && (
                  <div className="ml-4 shrink-0">
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
  const { user: loggedInUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [following, setFollowing] = useState<Friend[]>([]);
  const [shareLabel, setShareLabel] = useState("Share Profile");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = loggedInUser && profile && loggedInUser.username === profile.username;
  const isOnline =
    (isOwner && true) ||
    (profile as any)?.isOnline ||
    (profile as any)?.online ||
    (profile as any)?.is_online ||
    ((profile as any)?.status === "online") ||
    (!isOwner && (profile as any)?.status === undefined && true);
  const statusLabel = isOnline ? "Online" : "Offline";

  const followersCount = isOwner ? followers.length : (profile?.followersCount ?? 0);
  const followingCount = isOwner ? following.length : (profile?.followsCount ?? 0);
  const friendsCount = isOwner ? friends.length : ((profile as any)?.friendsCount ?? 0);
  const isMutualFriend = !!profile && friends.some((f) => f.id === profile.id);
  const canOpenLiveRoom = !!profile && (isOwner || isMutualFriend);

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
      setLoading(true);
      setProfile(null);
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
  }, [username, loggedInUser]);

  useEffect(() => {
    if (!loggedInUser) return;
    let cancelled = false;
    Promise.all([
      api.user.friends(),
      api.user.followers(),
      api.user.following()
    ]).then(([friendsList, followersList, followingList]) => {
      if (cancelled) return;
      setFriends(friendsList || []);
      setFollowers(followersList || []);
      setFollowing(followingList || []);
    }).catch(() => {
      if (!cancelled) {
        setFriends([]);
        setFollowers([]);
        setFollowing([]);
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
    setIsFollowing(isFollowingUser || isFriend);
  }, [friends, following, profile, loggedInUser]);

  const handleFollowToggle = async () => {
    if (!profile || !loggedInUser || isOwner) return;
    setIsFollowLoading(true);
    try {
      const isFriend = friends.some((f) => f.id === profile.id);
      if (isFollowing) {
        const success = await api.user.unfollow(profile.id);
        if (success) {
          setIsFollowing(false);
          setFollowing((prev) => prev.filter((f) => f.id !== profile.id));
          setFriends((prev) => prev.filter((f) => f.id !== profile.id));
        }
      } else {
        const status = await api.user.follow(profile.id, profile.username);
        if (status) {
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
    try {
      // Placeholder for block API
      console.log("Blocking user:", profile.id);
      setShowMoreMenu(false);
      navigate("/home");
    } catch (err) {
      console.error("Failed to block", err);
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
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        </div>
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

      <main className="relative flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-8 overflow-y-auto custom-scrollbar pb-[90px] md:pb-8">
        
        {/* Navigation Actions */}
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-6 flex items-center justify-between z-20">
          <button 
            onClick={() => navigate("/")}
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
                        onClick={() => { handleFollowToggle(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <UserMinus className="w-4 h-4" />
                        {isMutualFriend ? "Unfriend" : "Unfollow"}
                      </button>
                    )}
                    <button 
                      onClick={() => { /* Block logic placeholder */ setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <UserX className="w-4 h-4" />
                      Block User
                    </button>
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
            <Avatar src={profile.avatarUrl} alt={profile.username} size="2xl" />
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start sm:gap-4 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{profile.displayName || profile.username}</h1>
              {profile.displayName && profile.displayName !== profile.username && (
                <span className="text-[15px] font-semibold text-zinc-400">@{profile.username}</span>
              )}
              <div className="flex items-center justify-center gap-2 text-xs mt-1 sm:mt-0">
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500"}`} />
                <span className="font-bold uppercase tracking-widest text-[#8b8f9c]">{statusLabel}</span>
              </div>
            </div>

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
                    variant={isMutualFriend || isFollowing ? "secondary" : "primary"}
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                  >
                    {isMutualFriend || isFollowing ? <Send className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {isMutualFriend ? "Friends" : isFollowing ? "Requested" : "Follow"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      sessionStorage.setItem("bitglow:dmUserId", profile.id);
                      navigate("/messages");
                    }}
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
              <Button size="sm" onClick={() => handleModalFollow(f.id, f.username)}>Follow Back</Button>
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
    </div>
  );
}
