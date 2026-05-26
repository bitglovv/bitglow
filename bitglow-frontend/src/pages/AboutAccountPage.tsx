import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, BadgeCheck, Users, Image as ImageIcon } from "lucide-react";
import { api, User } from "../services/api";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";

export default function AboutAccountPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api.profile.get(username)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  const joinedDate = profile && (profile as any).createdAt
    ? new Date((profile as any).createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : "Loading...";

  const location = profile?.location || "Not specified";
  const isVerified = (profile as any)?.isVerified || (profile as any)?.role === 'verified' || false;

  return (
    <div className="flex h-[100dvh] flex-col bg-black text-white w-full overflow-y-auto">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center bg-black/80 px-4 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">About this account</h1>
      </header>

      <main className="flex-1 p-4 pb-12 animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-lg">
          {loading ? (
            <div className="flex flex-col items-center pt-12">
              <Skeleton className="w-32 h-32 rounded-full mb-6" />
              <Skeleton className="w-40 h-8 mb-2" />
              <Skeleton className="w-32 h-5 mb-10" />

              <div className="w-full space-y-4">
                <Skeleton className="w-full h-[76px] rounded-2xl" />
                <Skeleton className="w-full h-[76px] rounded-2xl" />
              </div>
            </div>
          ) : profile ? (
            <div className="flex flex-col items-center pt-12">
              <div className="mb-6 rounded-full ring-0 ring-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] p-1">
                <Avatar src={profile.avatarUrl} alt={profile.username} size="2xl" />
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <h2 className="text-2xl font-bold">{profile.displayName || profile.username}</h2>
                {isVerified && <BadgeCheck className="w-6 h-6 text-brand" strokeWidth={2} />}
              </div>
              <p className="text-zinc-400 text-sm mb-4">@{profile.username}</p>
              
              {profile.bio && (
                <p className="text-center text-zinc-300 text-[15px] mb-8 max-w-sm">
                  {profile.bio}
                </p>
              )}

              <div className="w-full flex flex-col gap-3">
                <InfoCard icon={<Calendar />} label="Date joined" value={joinedDate} />
                <InfoCard icon={<MapPin />} label="Account based in" value={location} />
                <InfoCard icon={<Users />} label="Followers" value={profile.followersCount || 0} />
                <InfoCard icon={<Users />} label="Following" value={profile.followsCount || 0} />
                <InfoCard icon={<ImageIcon />} label="Posts" value={profile.postsCount || 0} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-32 text-zinc-500">
              <p className="text-lg">Account not found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-4 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] transition-all hover:bg-white/[0.06]">
      <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-zinc-400">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-[15px] font-semibold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}
