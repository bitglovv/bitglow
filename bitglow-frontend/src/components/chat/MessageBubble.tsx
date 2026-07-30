import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Avatar } from "../ui/Avatar";
import { api, Post } from "../../services/api";
import { Copy, Forward, Heart, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface DMBubbleProps {
  message: { 
    id: string; 
    text: string; 
    createdAt: string; 
    senderId: string; 
    type?: "text" | "post" | "profile"; 
    postId?: string;
    profileId?: string;
    editedAt?: string | null;
    isForwarded?: boolean;
  };
  isMe: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
}

interface LiveBubbleProps {
  text: string;
  username: string;
  isSelf: boolean;
  avatarUrl?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  type?: "chat" | "system" | "post" | "profile";
  postId?: string;
  profileId?: string;
  timeLabel?: string;
  editedAt?: string | null;
  isForwarded?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
}

type MessageBubbleProps = DMBubbleProps | LiveBubbleProps;

import { SharedProfileCard } from "./SharedProfileCard";

function PostPreview({ postId }: { postId: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.posts.get(postId)
      .then(setPost)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <div className="w-full max-w-[280px] h-28 bg-white/5 animate-pulse rounded-2xl mt-2 flex items-center justify-center border border-white/5">
        <div className="w-5 h-5 border-2 border-white/10 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <Link 
      to={`/posts/${post.id}`}
      className="block w-full max-w-[280px] mt-2 bg-zinc-950/40 border border-white/10 rounded-2xl overflow-hidden hover:border-brand/40 hover:bg-zinc-950/60 transition-all group/post shadow-2xl backdrop-blur-md"
    >
      <div className="p-3.5 space-y-2.5 text-left">
        <div className="flex items-center gap-2">
          <Avatar src={post.author.avatarUrl} alt={post.author.username} size="xs" />
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-white group-hover/post:text-brand transition-colors">
              {post.author.username}
            </span>
            <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-tight">
              {post.title ? post.title : "Shared Post"}
            </span>
          </div>
        </div>
        <p className="text-[13px] text-white/80 line-clamp-3 leading-relaxed font-normal italic">
          "{post.content}"
        </p>
        <div className="flex items-center gap-4 pt-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-t border-white/5">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {post.likesCount || 0}
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {post.commentsCount || 0}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MessageBubble(props: MessageBubbleProps) {
  const isMe = "isMe" in props ? props.isMe : (props as LiveBubbleProps).isSelf;
  const text = "message" in props ? props.message.text : (props as LiveBubbleProps).text;
  const type = "message" in props ? props.message.type : (props as LiveBubbleProps).type;
  const postId = "message" in props ? props.message.postId : (props as LiveBubbleProps).postId;
  const profileId = "message" in props ? props.message.profileId : (props as LiveBubbleProps).profileId;
  
  const {
    username, 
    avatarUrl, 
    isFirstInGroup = true, 
    isLastInGroup = true,
    timeLabel,
    editedAt,
    isForwarded,
      onEdit,
      onDelete,
      onCopy,
      onForward,
    } = "message" in props 
    ? {
        username: props.isMe ? "You" : "Other",
        avatarUrl: undefined,
        timeLabel: undefined,
        editedAt: props.message.editedAt,
        isForwarded: props.message.isForwarded,
        onEdit: props.onEdit,
        onDelete: props.onDelete,
        onCopy: props.onCopy,
        onForward: props.onForward,
      }
    : props;
  const [showMenu, setShowMenu] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasActions = !!onCopy || !!onForward || (isMe && (!!onEdit || !!onDelete));

  const startLongPress = () => {
    if (!hasActions) return;
    longPressRef.current = setTimeout(() => setShowMenu(true), 500);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  useEffect(() => cancelLongPress, []);

  const isPost = type === "post" || (type === "chat" && !!postId) || (!type && !!postId);
  const isProfile = type === "profile" || (!type && !!profileId);

  return (
    <div
      className={clsx(
        "group/message flex w-full px-2 transition-all duration-300 ease-out",
        isMe ? "justify-end" : "justify-start",
        isFirstInGroup ? "mt-3" : "mt-0.5",
        isLastInGroup ? "mb-1.5" : "mb-0"
      )}
    >
      {!isMe && isFirstInGroup && (
        <div className="mr-2.5 shrink-0 pt-0.5">
          {username && username !== "User" && username !== "Other" ? (
            <Link to={`/profile/${username}`} className="block transition-transform hover:scale-105">
              <Avatar src={avatarUrl} alt={username} size="xs" />
            </Link>
          ) : (
            <Avatar src={avatarUrl} alt={username} size="xs" />
          )}
        </div>
      )}
      {!isMe && !isFirstInGroup && <div className="mr-2.5 w-6 shrink-0" />}

      <div className={clsx("flex max-w-[85%] flex-col md:max-w-[65%] xl:max-w-[55%]", isMe ? "items-end" : "items-start")}>
        {!isMe && isFirstInGroup && username && username !== "User" && username !== "Other" && (
          <div className="flex h-6 items-center mb-1 ml-1">
            <Link
              to={`/profile/${username}`}
              className="text-[12px] font-bold text-zinc-400 transition-colors hover:text-white focus:outline-none focus:ring-1 focus:ring-white/20 rounded-sm"
            >
              {username}
            </Link>
          </div>
        )}
        <div
          onContextMenu={(event) => {
          if (!hasActions) return;
          event.preventDefault();
          setShowMenu(true);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "touch") {
              pointerStartRef.current = { x: event.clientX, y: event.clientY };
              startLongPress();
            }
          }}
          onPointerUp={() => { pointerStartRef.current = null; cancelLongPress(); }}
          onPointerCancel={() => { pointerStartRef.current = null; cancelLongPress(); }}
          onPointerMove={(event) => {
            const start = pointerStartRef.current;
            if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
              pointerStartRef.current = null;
              cancelLongPress();
            }
          }}
          className={clsx(
            "relative select-none transition-all duration-300 ease-out group/bubble",
            // Only apply bubble styling for text messages
            !isPost && !isProfile
              ? clsx(
                  "px-4 py-2.5 text-[14.5px] leading-[1.45] shadow-xl",
                  isMe
                    ? "bg-brand text-black shadow-[0_12px_32px_rgba(16,185,129,0.18)] font-medium"
                    : "border border-white/[0.08] bg-zinc-900/90 text-white backdrop-blur-sm shadow-[0_12px_32px_rgba(0,0,0,0.25)]",
                  isMe && isFirstInGroup && "rounded-tl-[24px] rounded-bl-[24px] rounded-br-[24px] rounded-tr-[4px]",
                  isMe && !isFirstInGroup && !isLastInGroup && "rounded-l-[24px] rounded-r-[4px]",
                  isMe && isLastInGroup && "rounded-tl-[24px] rounded-bl-[24px] rounded-br-[4px] rounded-tr-[4px]",
                  !isMe && isFirstInGroup && "rounded-tr-[24px] rounded-br-[24px] rounded-bl-[24px] rounded-tl-[4px]",
                  !isMe && !isFirstInGroup && !isLastInGroup && "rounded-r-[24px] rounded-l-[4px]",
                  !isMe && isLastInGroup && "rounded-tr-[24px] rounded-br-[4px] rounded-bl-[24px] rounded-tl-[4px]"
                )
              : ""
          )}
          style={{ WebkitTouchCallout: "none" }}
        >
          {hasActions && (
            <button
              type="button"
              aria-label="Message options"
              aria-expanded={showMenu}
              onClick={() => setShowMenu((open) => !open)}
              className={clsx(
                "absolute top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:bg-white/[0.08] hover:text-white focus-visible:flex md:group-hover/message:flex",
                isMe ? "-left-9" : "-right-9"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
          {showMenu && hasActions && (
            <>
              <button
                type="button"
                aria-label="Close message menu"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setShowMenu(false)}
              />
              <div className={clsx("absolute bottom-full z-40 mb-2 min-w-36 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-2xl", isMe ? "right-0" : "left-0")}>
                {onCopy && (
                  <button type="button" onClick={() => { setShowMenu(false); onCopy(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                )}
                {onForward && (
                  <button type="button" onClick={() => { setShowMenu(false); onForward(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]">
                    <Forward className="h-3.5 w-3.5" /> Forward
                  </button>
                )}
                {isMe && onEdit && (
                  <button type="button" onClick={() => { setShowMenu(false); onEdit(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {isMe && onDelete && (
                  <button type="button" onClick={() => { setShowMenu(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>
            </>
          )}
          {isForwarded && (
            <div className={clsx(
              "mb-1.5 flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
              isMe ? "border-black/15 bg-black/10 text-black/65" : "border-brand/20 bg-brand/10 text-brand/80"
            )}>
              <Forward className="h-2.5 w-2.5" />
              Forwarded
            </div>
          )}
          {!isPost && !isProfile && <p className="whitespace-pre-wrap break-words">{text}</p>}
          {isPost && postId && <PostPreview postId={postId} />}
          {isProfile && profileId && <SharedProfileCard profileId={profileId} />}
          {isProfile && !profileId && (
            <p className="whitespace-pre-wrap break-words text-zinc-400 italic text-sm">Shared a profile</p>
          )}
        </div>
        {(timeLabel || editedAt) && (
          <div className={clsx("mt-1 text-[10px] font-bold tracking-wider text-zinc-600", isMe ? "mr-1" : "ml-1")}>
            {timeLabel}{editedAt ? `${timeLabel ? " · " : ""}(edited)` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
