import clsx from "clsx";
import { Bookmark, Heart, MessageSquare, Share2 } from "lucide-react";

type Props = {
  liked: boolean;
  saved: boolean;
  likesCount: number;
  commentsCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
};

export default function PostActions({ liked, saved, likesCount, commentsCount, onLike, onComment, onShare, onSave }: Props) {
  const actionClass = "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-zinc-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.04] hover:text-white active:scale-[0.97]";

  return (
    <div className="flex items-center gap-2 pt-3 text-sm">
      <button className={actionClass} aria-label="Like" onClick={onLike}>
        <Heart className={clsx("h-4 w-4", liked && "fill-rose-500 text-rose-500")} />
        <span>{likesCount}</span>
      </button>
      <button className={actionClass} aria-label="Comment" onClick={onComment}>
        <MessageSquare className="h-4 w-4" />
        <span>{commentsCount}</span>
      </button>
      <button className={actionClass} aria-label="Share" onClick={onShare}>
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>
      <button className={clsx(actionClass, "ml-auto")} aria-label="Save" onClick={onSave}>
        <Bookmark className={clsx("h-4 w-4", saved && "fill-cyan-400 text-cyan-400")} />
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    </div>
  );
}
