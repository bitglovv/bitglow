import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header";
import { navigateBack } from "../../utils/navigateBack";
import PostCard from "../../components/feed/PostCard";
import { api, Post } from "../../services/api";

export default function SavedPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Saved Posts - BitGlow";
    api.settings.getSavedPosts()
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      <Header
        leftContent={
          <button
            type="button"
            onClick={() => navigateBack(navigate, "/settings")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />
      <main className="mx-auto h-[calc(100dvh-64px)] w-full max-w-2xl overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 custom-scrollbar sm:px-6 md:pb-10">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight">Saved Posts</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Posts you have saved are collected here.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-zinc-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-zinc-500">
            No saved posts yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
