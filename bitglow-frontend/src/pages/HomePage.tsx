import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  MessageSquare,
  Send,
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
import { ComposerSkeleton, PostCardSkeleton } from "../components/ui/Skeleton";

import { PostCard } from "../components/posts/PostCard";
import { BottomSheet } from "../components/ui/BottomSheet";

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
    <div className="bg-white/[0.02] md:bg-black/40 border border-white/15 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.25)] md:shadow-none">

      {/* Top bar — avatar + name */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <Avatar alt={user?.username || "You"} size="sm" src={user?.avatarUrl} />
        <span className="text-sm font-semibold text-zinc-300">{user?.username || "You"}</span>
      </div>

      {/* Title input — edge to edge */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title (optional)"
        className="w-full bg-transparent px-4 pt-4 pb-2 text-base font-semibold text-white placeholder:text-zinc-600 focus:outline-none"
      />

      {/* Body textarea — edge to edge, tall */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind? Share with your friends..."
        maxLength={maxChars}
        className="w-full bg-transparent px-4 py-2 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none resize-none min-h-[200px] leading-relaxed"
      />

      {/* Footer row */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
        <span className={`text-xs font-medium tabular-nums ${charCount > maxChars * 0.9 ? 'text-amber-400' : 'text-zinc-600'}`}>
          {charCount}/{maxChars}
        </span>
        <Button size="sm" disabled={!canPost || isSubmitting} onClick={handleSubmit} isLoading={isSubmitting}>
          Post to friends <Send className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  useEffect(() => {
    document.title = "BitGlow \u2022 Home";
  }, []);

  // Modal states
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    if (commentingPost) {
      setIsLoadingComments(true);
      api.posts.comments(commentingPost.id)
        .then(setComments)
        .catch(console.error)
        .finally(() => setIsLoadingComments(false));
    } else {
      setComments([]);
    }
  }, [commentingPost]);

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
      setComments(prev => [res.comment, ...prev]);
      updatePostLocally(commentingPost.id, (p) => ({
        ...p,
        commentsCount: (p.commentsCount || 0) + 1,
      }));
      setCommentText("");
    }
    setIsCommenting(false);
  };

  const handleShareToFriend = async (friendId: string) => {
    if (!sharingPost || isSharing) return;
    setIsSharing(true);
    try {
      const dm = await api.dms.send(
        friendId, 
        `Shared a post`,
        'post',
        sharingPost.id
      );
      if (dm) {
        setSharingPost(null);
        alert("Shared successfully!");
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

      <main className="relative z-10 flex-1 w-full px-3 sm:px-6 pt-6 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8 space-y-6 md:max-w-4xl md:mx-auto overflow-y-auto custom-scrollbar">
        <div className="space-y-4" id="compose">
          <Composer user={user} onPostCreated={(p) => setPosts((prev) => [p, ...prev])} />
          {isLoading || isLoadingFeed ? (
            <div className="space-y-4">
              <ComposerSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
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
                onUnfollow={async () => {
                  await api.user.unfollow(post.author.id);
                  // Refresh feed or remove posts by this user visually
                  setPosts(prev => prev.filter(p => p.author.id !== post.author.id));
                }}
                onBlock={() => {
                  alert(`Blocked ${post.author.username}`);
                  setPosts(prev => prev.filter(p => p.author.id !== post.author.id));
                }}
                onReport={() => {
                  alert(`Reported post by ${post.author.username}`);
                }}
              />
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      <BottomSheet isOpen={!!commentingPost} onClose={() => setCommentingPost(null)} title="Comments">
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[60vh] custom-scrollbar py-2">
          {isLoadingComments ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-30">
              <div className="w-6 h-6 border-2 border-white/20 border-t-brand rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <MessageSquare className="w-10 h-10 opacity-10 mb-3" />
              <p className="text-sm">No comments yet. Be the first to reply!</p>
            </div>
          ) : (
            <div className="space-y-4 px-1">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  <Avatar src={c.author?.avatarUrl} alt={c.author?.username} size="xs" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{c.author?.username}</span>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
