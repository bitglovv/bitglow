import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Search as SearchIcon, Compass } from "lucide-react";
import Header from "../components/common/Header";
import { api, User } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import clsx from "clsx";

export default function SearchPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.user.list().then((list) => {
      if (cancelled) return;
      setUsers(list || []);
    });
    api.user.following().then((list) => {
      if (cancelled) return;
      const ids = new Set((list || []).map((u) => u.id));
      setFollowing(ids);
    });
    api.user.followers().then((list) => {
      if (cancelled) return;
      const ids = new Set((list || []).map((u) => u.id));
      setFollowers(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const results = useMemo(() => {
    const meId = user?.id;
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => u.id !== meId)
      .filter((u) => {
        if (!q) return true;
        return (
          u.username?.toLowerCase().includes(q) ||
          u.displayName?.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [users, user?.id, query]);

  const suggestionList = useMemo(() => {
    const meId = user?.id;
    return (users || [])
      .filter(
        (u) =>
          u.id !== meId &&
          !following.has(u.id) &&
          !pending.has(u.id)
      )
      .sort((a, b) => (Math.random() > 0.5 ? 1 : -1))
      .slice(0, 15);
  }, [users, user?.id, following, pending]);

  const handleFollow = async (u: User) => {
    const status = await api.user.follow(u.id, u.username);
    if (status === "accepted") {
      setFollowing((prev) => new Set(prev).add(u.id));
    } else if (status === "pending") {
      setPending((prev) => new Set(prev).add(u.id));
    }
  };

  const listToRender = query.trim() ? results : suggestionList;

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col overflow-x-hidden">
      {/* Immersive Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/5 blur-[120px] rounded-full opacity-60" />
      </div>

      <Header showTop={false} />

      <main className="relative z-10 w-full px-4 pt-12 pb-[100px] md:max-w-xl md:mx-auto flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
                <Compass className="w-5 h-5 text-brand" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight">Explore</h1>
                <p className="text-xs text-zinc-500 font-medium">Find people to connect with</p>
             </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <SearchIcon className="w-4 h-4 text-zinc-500 group-focus-within:text-brand transition-colors" />
            </div>
            <input
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:bg-white/[0.05] transition-all"
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results / Suggestions Section */}
        <div className="flex flex-col gap-2">
          {!query.trim() && (
             <h2 className="text-sm font-bold text-zinc-400 px-1 mb-2 uppercase tracking-widest flex items-center gap-2">
               Suggested for you
             </h2>
          )}
          
          <div className="flex flex-col gap-1">
            {listToRender.length > 0 ? (
              listToRender.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.05] group">
                  <Link to={`/profile/${u.username}`} className="flex items-center gap-3 overflow-hidden">
                    <Avatar src={u.avatarUrl} alt={u.username} size="sm" className="ring-1 ring-white/10 group-hover:ring-brand/30 transition-all" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-bold text-white truncate leading-tight">
                        {u.displayName || u.username}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">@{u.username}</span>
                    </div>
                  </Link>

                  <div className="shrink-0 flex items-center gap-2">
                    {pending.has(u.id) ? (
                      <span className="text-[13px] font-bold text-zinc-500 px-4 py-1.5 bg-white/5 rounded-full">Requested</span>
                    ) : following.has(u.id) ? (
                      <span className="text-[13px] font-bold text-zinc-400 px-4 py-1.5 bg-white/5 rounded-full">Following</span>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleFollow(u)}
                        className="bg-brand text-black font-bold h-8 px-5 rounded-full hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                      >
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                <SearchIcon className="w-8 h-8 opacity-20 mb-3" />
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

