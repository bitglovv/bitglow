import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  MessageSquare,
  Send,
  Clock,
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  Edit3,
  Trash2,
  X,
  Search as SearchIcon
} from "lucide-react";
import clsx from "clsx";
import Header from "../components/common/Header";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar";
import { api, Post, Friend } from "../services/api";

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

function BottomSheet({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4 touch-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-zinc-950 sm:rounded-2xl rounded-t-3xl border-t sm:border border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 pointer-events-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

type PostCardProps = {
  post: Post;
  currentUserId?: string;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function PostCard({ post, currentUserId, onLike, onComment, onShare, onSave, onEdit, onDelete }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card
      padding="md"
      className="hover:border-brand/30 transition-colors bg-white/[0.02] border-transparent md:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.25)] md:shadow-none"
    >
      <div className="flex gap-3">
        <Link to={`/profile/${post.author.username}`} className="flex items-start gap-3 flex-1 group">
          <Avatar alt={post.author.username} size="xs" src={post.author.avatarUrl} />
          <div className="flex-1 space-y-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base md:text-lg">{post.author.username}</span>
              </div>
            </div>
          </div>
        </Link>
        {currentUserId && currentUserId === post.author.id && (
          <div className="relative">
            <button
              aria-label="Post options"
              className="ml-auto text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={() => { setShowMenu(false); if (onEdit) onEdit(); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-white">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => { setShowMenu(false); if (onDelete) onDelete(); }} className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-white/5 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 mt-3">
        {post.title ? <p className="font-semibold text-lg md:text-xl">{post.title}</p> : null}
        <p className="text-xs text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(post.createdAt || new Date().toISOString())}
        </p>
      </div>

      <p className="text-zinc-200 leading-relaxed text-sm md:text-base mt-2">{post.content}</p>

      <div className="flex items-center gap-4 text-sm text-zinc-500 pt-2">
        <button className="inline-flex items-center gap-1 hover:text-white transition-colors" aria-label="Like" onClick={onLike}>
          <Heart className={clsx("w-4 h-4", post.likedByMe ? "fill-rose-500 text-rose-500" : "")} />
          <span>{post.likesCount ?? 0}</span>
        </button>
        <button className="inline-flex items-center gap-1 hover:text-white transition-colors" aria-label="Comment" onClick={onComment}>
          <MessageSquare className="w-4 h-4" />
          <span>{post.commentsCount ?? 0}</span>
        </button>
        <button className="inline-flex items-center gap-1 hover:text-white transition-colors" aria-label="Share" onClick={onShare}>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
        <button className="ml-auto inline-flex items-center gap-1 hover:text-white transition-colors" aria-label="Save" onClick={onSave}>
          <Bookmark className={clsx("w-4 h-4", post.savedByMe ? "fill-brand text-brand" : "")} />
          <span>{post.savedByMe ? "Saved" : "Save"}</span>
        </button>
      </div>
    </Card>
  );
}

type ComposerProps = { user: any; onPostCreated: (post: Post) => void };

function Composer({ user, onPostCreated }: ComposerProps) {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPost = body.trim().length > 0;
  const charCount = body.length;
  const maxChars = 500;

  const handleSubmit = async () => {
    if (!canPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newPost = await api.posts.create({
        title: title.trim() || undefined,
        content: body.trim(),
        visibility: "friends",
      });
      if (newPost) {
        newPost.likesCount = newPost.likesCount ?? 0;
        newPost.commentsCount = newPost.commentsCount ?? 0;
        newPost.savesCount = newPost.savesCount ?? 0;
        newPost.likedByMe = newPost.likedByMe ?? false;
        newPost.savedByMe = newPost.savedByMe ?? false;
        onPostCreated(newPost);
        setBody("");
        setTitle("");
      }
    } catch (err) {
      console.error("Failed to publish post", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="dark" padding="md" className="border-transparent md:border-white/10 bg-white/[0.02] md:bg-black/40 shadow-[0_10px_40px_rgba(0,0,0,0.25)] md:shadow-none">
      <div className="flex gap-3">
        <Avatar alt={user?.username || "You"} size="xs" src={user?.avatarUrl} />
        <div className="flex-1 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="bg-white/[0.04] md:bg-white/[0.03]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts with everyone following you..."
            maxLength={maxChars}
            className="w-full bg-white/[0.04] md:bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand/50 focus:bg-white/[0.06] md:focus:bg-white/[0.05] resize-none min-h-[140px]"
          />
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span className="text-xs text-zinc-600">{charCount}/{maxChars}</span>
            <Button size="sm" disabled={!canPost || isSubmitting} onClick={handleSubmit} isLoading={isSubmitting}>
              Post to friends <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Modal states
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendQuery, setFriendQuery] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (sharingPost && friends.length === 0) {
      api.user.friends().then(setFriends).catch(console.error);
    }
  }, [sharingPost, friends.length]);

  const updatePostLocally = (id: string, updater: (p: Post) => Post) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  };

  const handleLike = async (postId: string) => {
    let previous: Post | undefined;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        previous = p;
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likesCount: (p.likesCount || 0) + (liked ? 1 : -1),
        };
      })
    );

    const res = await api.posts.like(postId);
    if (res) {
      updatePostLocally(postId, (p) => ({
        ...p,
        likedByMe: res.liked,
        likesCount: res.likesCount,
      }));
    } else if (previous) {
      // rollback on failure
      updatePostLocally(postId, () => previous as Post);
    }
  };

  const handleSave = async (postId: string) => {
    const res = await api.posts.save(postId);
    if (res) {
      updatePostLocally(postId, (p) => ({
        ...p,
        savedByMe: res.saved,
        savesCount: res.savesCount,
      }));
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentingPost || !commentText.trim() || isCommenting) return;
    setIsCommenting(true);
    const res = await api.posts.comment(commentingPost.id, commentText.trim());
    if (res?.comment) {
      updatePostLocally(commentingPost.id, (p) => ({
        ...p,
        commentsCount: (p.commentsCount || 0) + 1,
      }));
      setCommentText("");
      setCommentingPost(null);
    }
    setIsCommenting(false);
  };

  const handleShareToFriend = async (friendId: string) => {
    if (!sharingPost || isSharing) return;
    setIsSharing(true);
    try {
      const dm = await api.dms.send(friendId, `Check this post: ${window.location.origin}/posts/${sharingPost.id}`);
      if (dm) {
        setSharingPost(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async (postId: string) => {
    const ok = await api.posts.delete(postId);
    if (ok) setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleEditSubmit = async () => {
    if (!editingPost || !editContent.trim() || isEditing) return;
    setIsEditing(true);
    const updated = await api.posts.update(editingPost.id, {
      title: editTitle.trim() || undefined,
      content: editContent.trim()
    });
    if (updated) {
      updatePostLocally(editingPost.id, (p) => ({
        ...p,
        title: updated.title,
        content: updated.content,
      }));
      setEditingPost(null);
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoadingFeed(true);
    api.posts
      .feed()
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((err) => console.error("Failed to load feed", err))
      .finally(() => {
        if (!cancelled) setIsLoadingFeed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filteredFriends = friends.filter(f => f.username.toLowerCase().includes(friendQuery.toLowerCase()));

  return (
    <div className="h-screen bg-black text-white relative selection:bg-brand/20 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[520px] bg-brand/5 blur-[140px] opacity-50" />
        <div className="absolute inset-0 bg-mesh opacity-[0.02]" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 w-full px-3 sm:px-6 pb-[90px] md:pb-6 pt-6 space-y-6 md:max-w-4xl md:mx-auto overflow-y-auto custom-scrollbar">
        <div className="space-y-4" id="compose">
          <Composer user={user} onPostCreated={(p) => setPosts((prev) => [p, ...prev])} />
          {isLoading || isLoadingFeed ? (
            <Card padding="md" className="bg-white/[0.02] border-transparent md:border-white/10 text-zinc-500 text-sm">
              Loading feed...
            </Card>
          ) : posts.length === 0 ? (
            <Card padding="md" className="bg-white/[0.02] border-transparent md:border-white/10 text-zinc-400 text-sm">
              No posts yet. Share something with your friends.
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onLike={() => handleLike(post.id)}
                onSave={() => handleSave(post.id)}
                onComment={() => setCommentingPost(post)}
                onShare={() => setSharingPost(post)}
                onEdit={() => {
                  setEditingPost(post);
                  setEditTitle(post.title || "");
                  setEditContent(post.content);
                }}
                onDelete={() => handleDelete(post.id)}
              />
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      <BottomSheet isOpen={!!commentingPost} onClose={() => setCommentingPost(null)} title="Comments">
        <div className="flex-1 flex flex-col pt-2 items-center justify-center min-h-[120px] text-zinc-500 mb-6">
          <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
          <p className="text-sm">Comments are loaded via a separate API route if needed.</p>
        </div>
        <div className="mt-auto border-t border-white/5 pt-4 bg-zinc-950 pb-2">
          <div className="flex gap-2">
            <Avatar alt={user?.username} src={user?.avatarUrl} size="sm" />
            <div className="flex-1 relative">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || isCommenting}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-brand font-semibold text-sm disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!sharingPost} onClose={() => setSharingPost(null)} title="Share via Messages">
        <div className="mb-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={friendQuery}
            onChange={(e) => setFriendQuery(e.target.value)}
            placeholder="Search friends..."
            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {filteredFriends.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm mt-8">No friends found.</p>
          ) : (
            filteredFriends.map(f => (
              <button
                key={f.id}
                onClick={() => handleShareToFriend(f.id)}
                disabled={isSharing}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left disabled:opacity-50"
              >
                <Avatar alt={f.username} src={f.avatarUrl} size="sm" />
                <span className="font-semibold text-sm text-white flex-1">{f.username}</span>
                <Send className="w-4 h-4 text-zinc-400" />
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!editingPost} onClose={() => setEditingPost(null)} title="Edit Post">
        <div className="space-y-4 pt-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title (optional)"
            className="bg-white/[0.05]"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Post content"
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand min-h-[150px] resize-none"
          />
          <Button onClick={handleEditSubmit} disabled={!editContent.trim() || isEditing} isLoading={isEditing} className="w-full">
            Save Changes
          </Button>
        </div>
      </BottomSheet>

    </div>
  );
}
