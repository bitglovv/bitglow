import { useState } from "react";
import { Edit3, MoreHorizontal, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { Card } from "../ui/Card";
import PostActions from "./PostActions";
import type { Post } from "../../services/api";

type Props = {
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
  if (d < 30) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (d < 365) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
};

export default function PostCard({ post, currentUserId, onLike, onComment, onShare, onSave, onEdit, onDelete, onUnfollow, onBlock, onReport }: Props) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card interactive padding="md" className="border-white/10 bg-white/[0.025]">
      <div className="flex gap-3">
        <Link to={`/profile/${post.author.username}`} className="flex flex-1 items-start gap-3">
          <Avatar alt={post.author.username} size="sm" src={post.author.avatarUrl} ring="glow" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">{post.author.username}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">{timeAgo(post.createdAt || new Date().toISOString())}</span>
            </div>
            {post.title ? <p className="mt-1 text-base font-semibold text-white">{post.title}</p> : null}
          </div>
        </Link>
        <div className="relative">
          <button className="rounded-full p-2 text-zinc-500 transition-all hover:bg-white/[0.04] hover:text-white active:scale-[0.97]" onClick={() => setShowMenu((v) => !v)} aria-label="Post options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu ? (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-[100] w-44 overflow-hidden rounded-[14px] border border-white/10 bg-zinc-950/95 p-1 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                {currentUserId === post.author.id ? (
                  <>
                    <button onClick={() => { setShowMenu(false); onEdit?.(); }} className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/[0.04]">
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                    <button onClick={() => { setShowMenu(false); onDelete?.(); }} className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setShowMenu(false); onUnfollow?.(); }} className="w-full rounded-[12px] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/[0.04]">
                      Unfollow
                    </button>
                    <button onClick={() => { setShowMenu(false); onBlock?.(); }} className="w-full rounded-[12px] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/[0.04]">
                      Block
                    </button>
                    <button onClick={() => { setShowMenu(false); onReport?.(); }} className="w-full rounded-[12px] px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10">
                      Report
                    </button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-200">{post.content}</p>

      <PostActions
        liked={!!post.likedByMe}
        saved={!!post.savedByMe}
        likesCount={post.likesCount ?? 0}
        commentsCount={post.commentsCount ?? 0}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onSave={onSave}
      />
    </Card>
  );
}
