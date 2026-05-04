import React from "react";
import type { Post } from "../../services/api";
import PostCard from "./PostCard";
import EmptyState from "../ui/EmptyState";
import { Sparkles } from "lucide-react";

type Props = {
  posts: Post[];
  currentUserId?: string;
  emptyTitle: string;
  emptyDescription: string;
  onPostActions: (post: Post) => {
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
};

export default function FeedList({ posts, currentUserId, emptyTitle, emptyDescription, onPostActions }: Props) {
  if (posts.length === 0) {
    return <EmptyState icon={<Sparkles className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const actions = onPostActions(post);
        return <PostCard key={post.id} post={post} currentUserId={currentUserId} {...actions} />;
      })}
    </div>
  );
}
