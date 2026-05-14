import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search as SearchIcon, Send } from "lucide-react";
import { api, Post, Friend } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { PostCard } from "../components/posts/PostCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Avatar } from "../components/ui/Avatar";
import { PostCardSkeleton } from "../components/ui/Skeleton";
import { navigateBack } from "../utils/navigateBack";

export default function PostPage() {
    const { postId } = useParams<{ postId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states (sharing/commenting)
    const [commentingPost, setCommentingPost] = useState<Post | null>(null);
    const [commentText, setCommentText] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendQuery, setFriendQuery] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (!postId) return;
        setLoading(true);
        api.posts.get(postId)
            .then(res => {
                console.log("PostPage: api.posts.get result:", res);
                if (res) {
                    setPost(res);
                } else {
                    setError("Post not found");
                }
            })
            .catch(err => {
                console.error("PostPage: api.posts.get error:", err);
                setError(err.message || "Failed to load post");
            })
            .finally(() => setLoading(false));
    }, [postId]);

    useEffect(() => {
        if (post) document.title = `BitGlow \u2022 Post by @${post.author.username}`;
    }, [post]);

    useEffect(() => {
        if (sharingPost && friends.length === 0) {
            api.user.friends().then(setFriends).catch(console.error);
        }
    }, [sharingPost, friends.length]);

    const handleLike = async () => {
        if (!post) return;
        const previous = { ...post };
        const liked = !post.likedByMe;
        setPost({
            ...post,
            likedByMe: liked,
            likesCount: (post.likesCount || 0) + (liked ? 1 : -1)
        });

        const res = await api.posts.like(post.id);
        if (res) {
            setPost(prev => prev ? { ...prev, likedByMe: res.liked, likesCount: res.likesCount } : null);
        } else {
            setPost(previous);
        }
    };

    const handleSave = async () => {
        if (!post) return;
        const res = await api.posts.save(post.id);
        if (res) {
            setPost(prev => prev ? { ...prev, savedByMe: res.saved, savesCount: res.savesCount } : null);
        }
    };

    const handleCommentSubmit = async () => {
        if (!post || !commentText.trim() || isCommenting) return;
        setIsCommenting(true);
        const res = await api.posts.comment(post.id, commentText.trim());
        if (res?.comment) {
            setPost(prev => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null);
            setCommentText("");
            setCommentingPost(null);
        }
        setIsCommenting(false);
    };

    const handleShareToFriend = async (friendId: string) => {
        if (!post || isSharing) return;
        setIsSharing(true);
        try {
            const dm = await api.dms.send(friendId, `Check this post: ${window.location.origin}/posts/${post.id}`);
            if (dm) setSharingPost(null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSharing(false);
        }
    };

    const filteredFriends = friends.filter(f => f.username.toLowerCase().includes(friendQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-black text-white">
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/5">
                <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-4">
                    <button
                        onClick={() => navigateBack(navigate, "/home")}
                        className="rounded-full p-2 text-white transition-colors hover:bg-zinc-900"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-8">
                {loading ? (
                    <PostCardSkeleton />
                ) : error || !post ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <p>{error || "Post not found"}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <PostCard 
                            post={post}
                            currentUserId={user?.id}
                            onLike={handleLike}
                            onSave={handleSave}
                            onComment={() => setCommentingPost(post)}
                            onShare={() => setSharingPost(post)}
                        />
                    </div>
                )}
            </main>

            {/* Modals copied from HomePage logic */}
            <BottomSheet isOpen={!!commentingPost} onClose={() => setCommentingPost(null)} title="Comments">
                <div className="flex-1 flex flex-col pt-2 items-center justify-center min-h-[120px] text-zinc-500 mb-6">
                    <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm">Comments are coming soon.</p>
                </div>
                <div className="mt-auto border-t border-white/5 pt-4 bg-zinc-950 pb-2">
                    <div className="flex gap-2">
                        <Avatar alt={user?.username} src={user?.avatarUrl} size="sm" />
                        <div className="flex-1 relative">
                            <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full bg-white/[0.05] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                            <button
                                onClick={handleCommentSubmit}
                                disabled={!commentText.trim() || isCommenting}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-brand font-semibold text-sm"
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
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px]">
                    {filteredFriends.length === 0 ? (
                        <p className="text-center text-zinc-600 text-sm mt-8">No friends found.</p>
                    ) : (
                        filteredFriends.map(f => (
                            <button
                                key={f.id}
                                onClick={() => handleShareToFriend(f.id)}
                                disabled={isSharing}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                            >
                                <Avatar alt={f.username} src={f.avatarUrl} size="sm" />
                                <span className="font-semibold text-sm text-white flex-1">{f.username}</span>
                                <Send className="w-4 h-4 text-zinc-400" />
                            </button>
                        ))
                    )}
                </div>
            </BottomSheet>
        </div>
    );
}
