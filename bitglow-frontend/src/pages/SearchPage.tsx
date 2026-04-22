import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Search as SearchIcon } from "lucide-react";
import Header from "../components/common/Header";
import { api, User } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";

export default function SearchPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => { document.title = "BitGlow \u2022 Search"; }, []);

  useEffect(() => {
    let cancelled = false;
    api.user.list().then((list) => {
      if (cancelled) return;
      const normalizedUsers = (list || []).map((u) => {
        const username = u.username?.trim() || "";
        const displayName = u.displayName?.trim() || username;
        return {
          ...u,
          username,
          displayName,
          avatarUrl: u.avatarUrl || undefined,
        };
      });
      setUsers(normalizedUsers);
    });
    api.user.following().then((list) => {
      if (cancelled) return;
      const ids = new Set((list || []).map((u) => u.id));
      setFollowing(ids);
    });
    api.user.followers().then((list) => {
      if (cancelled) return;
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
  const isShowingSuggestions = !query.trim();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-black text-white">

      <Header showTop={false} />

      <main className="relative z-10 flex w-full flex-1 flex-col gap-7 bg-black px-4 pb-[100px] pt-5 md:mx-auto md:max-w-xl md:px-5 md:pt-7">
        <div className="flex flex-col gap-3">
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <SearchIcon className="h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-zinc-300" />
            </div>
            <input
              className="w-full rounded-[1.35rem] border border-white/[0.06] bg-white/[0.025] pl-11 pr-11 py-3.5 text-[15px] text-white shadow-[0_14px_34px_-26px_rgba(0,0,0,0.85)] placeholder:text-zinc-600 transition-all duration-200 focus:border-white/[0.12] focus:bg-white/[0.04] focus:outline-none focus:ring-0"
              placeholder="Search for Bits"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-zinc-500 transition-colors hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results / Suggestions Section */}
        <div className="flex flex-col gap-2">
          {!query.trim() && suggestionList.length > 0 && (
             <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
               Suggested for you
             </h2>
          )}
          
          <div className="flex flex-col gap-1.5">
            {listToRender.length > 0 ? (
              listToRender.map((u) => (
                <div
                  key={u.id}
                  className="group flex items-center justify-between rounded-[1.35rem] border border-white/[0.04] bg-white/[0.02] px-3 py-3 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.03]"
                >
                  <Link to={`/profile/${u.username}`} className="flex min-w-0 items-center gap-3 overflow-hidden">
                    <Avatar
                      src={u.avatarUrl}
                      alt={u.username}
                      size="md"
                      className="transition-all"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-semibold leading-tight text-white">
                        @{u.username}
                      </span>
                      <span className="truncate text-xs text-zinc-500">
                        {u.displayName || u.username}
                      </span>
                    </div>
                  </Link>

                  <div className="ml-3 shrink-0 flex items-center gap-2">
                    {pending.has(u.id) ? (
                      <span className="rounded-full bg-white/[0.05] px-4 py-1.5 text-[13px] font-semibold text-zinc-500">
                        Requested
                      </span>
                    ) : following.has(u.id) ? (
                      <span className="rounded-full bg-white/[0.05] px-4 py-1.5 text-[13px] font-semibold text-zinc-400">
                        Following
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleFollow(u)}
                        className="h-9 rounded-full bg-white px-5 text-[13px] font-semibold text-black transition-all hover:bg-zinc-100"
                      >
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : query.trim() ? (
              <div className="flex flex-col items-center justify-center rounded-[1.35rem] border border-white/[0.04] bg-white/[0.015] py-12 text-zinc-500">
                <SearchIcon className="mb-3 h-8 w-8 opacity-20" />
                <p className="text-sm text-zinc-400">{`No results found for "${query}"`}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Try a different username or display name.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

