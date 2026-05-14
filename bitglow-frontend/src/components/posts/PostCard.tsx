import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Heart, 
  MessageSquare, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  Edit3, 
  Trash2 
} from "lucide-react";
import clsx from "clsx";
import { api, Post } from "../../services/api";
import { Avatar } from "../ui/Avatar";
import { Card } from "../ui/Card";

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s || 1}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type PostCardProps = {
  post: Post;
  currentUserId?: string;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUnfollow?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
};

export function PostCard({ 
  post, 
  currentUserId, 
  onLike, 
  onComment, 
  onShare, 
  onSave, 
  onEdit, 
  onDelete, 
  onUnfollow, 
  onBlock, 
  onReport 
}: PostCardProps) {
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-base md:text-lg">{post.author.username}</span>
                <span className="text-zinc-600 text-xs">•</span>
                <span className="text-xs text-zinc-500">{timeAgo(post.createdAt || new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </Link>
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
                {currentUserId === post.author.id ? (
                  <>
                    <button onClick={() => { setShowMenu(false); if (onEdit) onEdit(); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-white">
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => { setShowMenu(false); if (onDelete) onDelete(); }} className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-white/5 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setShowMenu(false); if (onUnfollow) onUnfollow(); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-white">
                      Unfollow
                    </button>
                    <button onClick={() => { setShowMenu(false); if (onBlock) onBlock(); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-white">
                      Block
                    </button>
                    <button onClick={() => { setShowMenu(false); if (onReport) onReport(); }} className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-white/5 flex items-center gap-2">
                      Report
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {post.title && (
        <div className="space-y-2 mt-3">
          <p className="font-semibold text-lg md:text-xl">{post.title}</p>
        </div>
      )}

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
        <button className="inline-flex items-center gap-1 hover:text-white transition-all active:scale-90" aria-label="Share" onClick={onShare}>
          <Send className="w-4 h-4 -rotate-12 translate-y-[-1px]" />
        </button>
        <button className="ml-auto inline-flex items-center gap-1 hover:text-white transition-colors" aria-label="Save" onClick={onSave}>
          <Bookmark className={clsx("w-4 h-4", post.savedByMe ? "fill-brand text-brand" : "")} />
          <span>{post.savedByMe ? "Saved" : "Save"}</span>
        </button>
      </div>

      <p className="text-[10px] text-zinc-600 pt-1.5 mt-1">
        {formatDate(post.createdAt || new Date().toISOString())}
      </p>
    </Card>
  );
}
