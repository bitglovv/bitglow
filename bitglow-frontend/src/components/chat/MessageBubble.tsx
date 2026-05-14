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
    type?: "text" | "post"; 
    postId?: string;
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
  type?: "chat" | "system" | "post";
  postId?: string;
}

type MessageBubbleProps = DMBubbleProps | LiveBubbleProps;

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
  
  const { 
    username, 
    avatarUrl, 
    isFirstInGroup = true, 
    isLastInGroup = true 
  } = "message" in props 
    ? { username: props.isMe ? "You" : "Other", avatarUrl: undefined } 
    : props;

  const isPost = type === "post" || (type === "chat" && !!postId);

  return (
    <div
      className={clsx(
        "group flex w-full px-2 transition-all duration-300 ease-out",
        isMe ? "justify-end" : "justify-start",
        isFirstInGroup ? "mt-3" : "mt-0.5",
        isLastInGroup ? "mb-1.5" : "mb-0"
      )}
    >
      {!isMe && isFirstInGroup && (
        <div className="mr-2.5 shrink-0 pt-1">
          <Avatar src={avatarUrl} alt={username} size="xs" />
        </div>
      )}
      {!isMe && !isFirstInGroup && <div className="mr-2.5 w-7 shrink-0" />}

      <div className={clsx("flex max-w-[85%] flex-col md:max-w-[65%] xl:max-w-[55%]", isMe ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "px-4 py-2.5 text-[14.5px] leading-[1.45] shadow-xl transition-all duration-300 ease-out relative group/bubble",
            isMe
              ? "bg-brand text-black shadow-[0_12px_32px_rgba(16,185,129,0.18)] font-medium"
              : "border border-white/[0.08] bg-zinc-900/90 text-white backdrop-blur-sm shadow-[0_12px_32px_rgba(0,0,0,0.25)]",
            isMe && isFirstInGroup && "rounded-tl-[24px] rounded-bl-[24px] rounded-br-[24px] rounded-tr-[4px]",
            isMe && !isFirstInGroup && !isLastInGroup && "rounded-l-[24px] rounded-r-[4px]",
            isMe && isLastInGroup && "rounded-tl-[24px] rounded-bl-[24px] rounded-br-[4px] rounded-tr-[4px]",
            !isMe && isFirstInGroup && "rounded-tr-[24px] rounded-br-[24px] rounded-bl-[24px] rounded-tl-[4px]",
            !isMe && !isFirstInGroup && !isLastInGroup && "rounded-r-[24px] rounded-l-[4px]",
            !isMe && isLastInGroup && "rounded-tr-[24px] rounded-br-[4px] rounded-bl-[24px] rounded-tl-[4px]"
          )}
        >
          {(!isPost || text !== "Shared a post") && (
            <p className="whitespace-pre-wrap break-words">{text}</p>
          )}
          {isPost && postId && <PostPreview postId={postId} />}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
