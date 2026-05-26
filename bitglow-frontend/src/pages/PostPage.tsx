import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search as SearchIcon, Send, Heart, Trash2 } from "lucide-react";
import { api, Post, Friend, Comment } from "../services/api";
import clsx from "clsx";
import { useAuth } from "../hooks/useAuth";
import { PostCard } from "../components/posts/PostCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { ReportSheet } from "../components/common/ReportSheet";
import { Toast } from "../components/ui/Toast";
import { Avatar } from "../components/ui/Avatar";
import { PostCardSkeleton } from "../components/ui/Skeleton";
import { navigateBack } from "../utils/navigateBack";
import { timeAgo } from "../utils/time";

const POST_REPORT_OPTIONS = [
    "Spam or misleading content",
    "Hate speech or symbols",
    "Bullying or harassment",
    "Violence or dangerous content",
    "Nudity or sexual content",
    "False information",
];

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
    const [isSharing, setIsSharing] = useState(false);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendQuery, setFriendQuery] = useState("");
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [reportingPost, setReportingPost] = useState<Post | null>(null);
    const [reportToastOpen, setReportToastOpen] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);

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
        if (post) document.title = "BitGlow";
    }, [post]);

    useEffect(() => {
        if (sharingPost && friends.length === 0) {
            api.user.friends().then(setFriends).catch(console.error);
        }
    }, [sharingPost, friends.length]);

    const fetchComments = async (id: string) => {
        setLoadingComments(true);
        try {
            const res = await api.posts.comments(id);
            setComments(res);
        } catch (err) {
            console.error("Failed to fetch comments", err);
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        if (postId) {
            fetchComments(postId);
        }
    }, [postId]);

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
            setComments(prev => [res.comment, ...prev]);
            setCommentText("");
        }
        setIsCommenting(false);
    };

    const handleCommentLike = async (commentId: string) => {
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        const liked = !comment.likedByMe;
        
        // Optimistic update
        setComments(prev => prev.map(c => 
            c.id === commentId 
                ? { ...c, likedByMe: liked, likesCount: c.likesCount + (liked ? 1 : -1) } 
                : c
        ));

        try {
            const res = await api.posts.likeComment(commentId);
            if (res) {
                setComments(prev => prev.map(c => 
                    c.id === commentId 
                        ? { ...c, likedByMe: res.liked, likesCount: res.likesCount } 
                        : c
                ));
            }
        } catch (err) {
            console.error("Failed to like comment", err);
            // Revert on error
            setComments(prev => prev.map(c => 
                c.id === commentId 
                    ? { ...c, likedByMe: !liked, likesCount: c.likesCount + (!liked ? 1 : -1) } 
                    : c
            ));
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        const ok = await api.posts.deleteComment(commentId);
        if (ok) {
            setComments(prev => prev.filter(c => c.id !== commentId));
            setPost(prev => prev ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) } : null);
        }
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

    const handleDelete = async () => {
        if (!post) return;
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        const ok = await api.posts.delete(post.id);
        if (ok) {
            navigate("/home");
        }
    };

    const handleEditSubmit = async () => {
        if (!editingPost || !editContent.trim() || isEditing) return;
        setIsEditing(true);
        try {
            const updated = await api.posts.update(editingPost.id, {
                title: editTitle.trim() || undefined,
                content: editContent.trim()
            });
            if (updated) {
                setPost(prev => prev ? { ...prev, title: updated.title, content: updated.content } : null);
                setEditingPost(null);
            }
        } catch (err: any) {
            alert(err.message || "Failed to update post");
        } finally {
            setIsEditing(false);
        }
    };

    const handleReportSubmit = (reason: string) => {
        if (!reportingPost) return;
        console.log("Report submitted", { type: "post", postId: reportingPost.id, reason });
        setReportingPost(null);
        setReportToastOpen(true);
        window.setTimeout(() => setReportToastOpen(false), 1800);
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
                            onEdit={() => {
                                setEditingPost(post);
                                setEditTitle(post.title || "");
                                setEditContent(post.content);
                            }}
                            onDelete={handleDelete}
                            onUnfollow={async () => {
                                await api.user.unfollow(post.author.id);
                                // For PostPage, we can optionally redirect to home or just update state
                            }}
                            onReport={() => setReportingPost(post)}
                        />
                    </div>
                )}
            </main>

            {/* Modals copied from HomePage logic */}
            <BottomSheet 
                isOpen={!!commentingPost} 
                onClose={() => setCommentingPost(null)} 
                title="Comments"
                footer={
                    <div className="flex gap-2 items-center">
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
                }
            >
                <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar px-1">
                    {loadingComments ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col pt-8 items-center justify-center text-zinc-500 mb-8">
                            <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">No comments yet. Be the first to comment!</p>
                        </div>
                    ) : (
                        <div className="space-y-6 mb-8">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 group/comment">
                                    <Link to={`/profile/${comment.author.username}`} className="shrink-0 transition-transform hover:scale-105">
                                        <Avatar src={comment.author.avatarUrl} alt={comment.author.username} size="xs" />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Link to={`/profile/${comment.author.username}`} className="font-semibold text-sm text-white hover:underline hover:text-brand transition-colors">
                                                {comment.author.username}
                                            </Link>
                                            <span className="text-[10px] text-zinc-500">{timeAgo(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-zinc-300 leading-relaxed break-words">{comment.content}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 self-start pt-1">
                                        {/* Delete — visible to comment author or post author */}
                                        {(comment.author.id === user?.id || post?.author?.id === user?.id) && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover/comment:opacity-100 mb-1"
                                                title="Delete comment"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleCommentLike(comment.id)}
                                            className={clsx(
                                                "transition-all active:scale-125",
                                                comment.likedByMe ? "text-rose-500" : "text-zinc-600 hover:text-zinc-400"
                                            )}
                                        >
                                            <Heart className={clsx("w-4 h-4", comment.likedByMe ? "fill-rose-500 text-rose-500" : "")} />
                                        </button>
                                        {comment.likesCount > 0 && (
                                            <span className="text-[10px] font-medium text-zinc-500">{comment.likesCount}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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

            <BottomSheet isOpen={!!editingPost} onClose={() => setEditingPost(null)} title="Edit Post">
                <div className="space-y-4 pt-2">
                    <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Post content"
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand min-h-[150px] resize-none"
                    />
                    <button 
                        onClick={handleEditSubmit} 
                        disabled={!editContent.trim() || isEditing}
                        className="w-full bg-brand text-black font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {isEditing ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </BottomSheet>

            <ReportSheet
                isOpen={!!reportingPost}
                title="Report Post"
                prompt="Why are you reporting this post?"
                options={POST_REPORT_OPTIONS}
                onClose={() => setReportingPost(null)}
                onSubmit={handleReportSubmit}
            />
            <Toast message="Report Sent" isOpen={reportToastOpen} />
        </div>
    );
}
