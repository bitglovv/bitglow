import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { Post } from "../../services/api";
import { api } from "../../services/api";

type Props = {
  user: any;
  onPostCreated: (post: Post) => void;
};

export default function Composer({ user, onPostCreated }: Props) {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxChars = 500;
  const canPost = body.trim().length > 0;

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
        onPostCreated({
          ...newPost,
          likesCount: newPost.likesCount ?? 0,
          commentsCount: newPost.commentsCount ?? 0,
          savesCount: newPost.savesCount ?? 0,
          likedByMe: newPost.likedByMe ?? false,
          savedByMe: newPost.savedByMe ?? false,
        });
        setBody("");
        setTitle("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card interactive padding="none" className="overflow-hidden border-white/10 bg-white/[0.025]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4">
        <Avatar alt={user?.username || "You"} size="sm" src={user?.avatarUrl} ring="glow" />
        <span className="text-sm font-semibold text-white">{user?.username || "You"}</span>
      </div>
      <div className="space-y-1 px-4 py-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title (optional)"
          className="glass-input border-transparent bg-transparent px-0 py-0 text-lg font-semibold text-white placeholder:text-zinc-600 focus:border-transparent focus:ring-0"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={maxChars}
          className="min-h-[180px] w-full resize-none bg-transparent py-2 text-sm leading-6 text-white placeholder:text-zinc-600 focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
        <span className={`text-xs font-medium tabular-nums ${body.length > maxChars * 0.9 ? "text-amber-400" : "text-zinc-500"}`}>
          {body.length}/{maxChars}
        </span>
        <Button size="sm" disabled={!canPost || isSubmitting} isLoading={isSubmitting} onClick={handleSubmit}>
          Post <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
