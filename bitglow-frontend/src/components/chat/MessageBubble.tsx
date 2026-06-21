import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Avatar } from "../ui/Avatar";
import { api, Post } from "../../services/api";
import { MessageSquare, Heart } from "lucide-react";

interface DMBubbleProps {
  message: { 
    id: string; 
    text: string; 
    createdAt: string; 
    senderId: string; 
    type?: "text" | "post" | "profile"; 
    postId?: string;
    profileId?: string;
  };
  isMe: boolean;
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
  const timeLabel = "message" in props ? undefined : (props as LiveBubbleProps).timeLabel;
  
  const { 
    username, 
    avatarUrl, 
    isFirstInGroup = true, 
    isLastInGroup = true 
  } = "message" in props 
    ? { username: props.isMe ? "You" : "Other", avatarUrl: undefined } 
    : props;

  const isPost = type === "post" || (type === "chat" && !!postId) || (!type && !!postId);
  const isProfile = type === "profile" || (!type && !!profileId);

  return (
    <div
      className={clsx(
        "group flex w-full px-1 transition-all duration-300 ease-out sm:px-2",
        isMe ? "justify-end" : "justify-start",
        isFirstInGroup ? "mt-2.5" : "mt-0.5",
        isLastInGroup ? "mb-2" : "mb-0"
      )}
    >
      {!isMe && isFirstInGroup && (
        <div className="mr-2.5 shrink-0 pt-5">
          {username && username !== "User" && username !== "Other" ? (
            <Link to={`/profile/${username}`} className="block transition-transform hover:scale-105">
              <Avatar src={avatarUrl} alt={username} size="xs" />
            </Link>
          ) : (
            <Avatar src={avatarUrl} alt={username} size="xs" />
          )}
        </div>
      )}
      {!isMe && !isFirstInGroup && <div className="mr-2.5 w-7 shrink-0" />}

      <div className={clsx("flex max-w-[82%] flex-col sm:max-w-[76%] md:max-w-[68%] xl:max-w-[58%]", isMe ? "items-end" : "items-start")}>
        {!isMe && isFirstInGroup && username && username !== "User" && username !== "Other" && (
          <Link
            to={`/profile/${username}`}
            className="mb-1 ml-1 max-w-full truncate text-[11px] font-bold leading-none text-zinc-400 transition-colors hover:text-white"
          >
            {username}
          </Link>
        )}
        <div
          className={clsx(
            "transition-all duration-300 ease-out relative group/bubble",
            // Only apply bubble styling for text messages
            !isPost && !isProfile
              ? clsx(
                  "px-3.5 py-2.5 text-[15px] leading-[1.45] shadow-xl sm:px-4",
                  isMe
                    ? "bg-brand text-black shadow-[0_12px_30px_rgba(16,185,129,0.18)] font-medium"
                    : "border border-white/[0.08] bg-zinc-900/95 text-white backdrop-blur-sm shadow-[0_12px_30px_rgba(0,0,0,0.24)]",
                  isMe && isFirstInGroup && "rounded-tl-[22px] rounded-bl-[22px] rounded-br-[22px] rounded-tr-md",
                  isMe && !isFirstInGroup && !isLastInGroup && "rounded-l-[22px] rounded-r-md",
                  isMe && isLastInGroup && "rounded-tl-[22px] rounded-bl-[22px] rounded-br-md rounded-tr-md",
                  !isMe && isFirstInGroup && "rounded-tr-[22px] rounded-br-[22px] rounded-bl-[22px] rounded-tl-md",
                  !isMe && !isFirstInGroup && !isLastInGroup && "rounded-r-[22px] rounded-l-md",
                  !isMe && isLastInGroup && "rounded-tr-[22px] rounded-br-md rounded-bl-[22px] rounded-tl-md"
                )
              : ""
          )}
        >
          {!isPost && !isProfile && (
            <p className="whitespace-pre-wrap break-words">{text}</p>
          )}
          {isPost && postId && <PostPreview postId={postId} />}
          {isProfile && profileId && <SharedProfileCard profileId={profileId} />}
          {isProfile && !profileId && (
            <p className="whitespace-pre-wrap break-words text-zinc-400 italic text-sm">Shared a profile</p>
          )}
        </div>
        {isLastInGroup && timeLabel && (
          <span
            className={clsx(
              "mt-1 px-1 text-[10px] font-medium leading-none text-zinc-600",
              isMe ? "text-right" : "text-left"
            )}
          >
            {timeLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
