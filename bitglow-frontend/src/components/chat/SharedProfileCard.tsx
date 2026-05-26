import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { api } from "../../services/api";
import { User, BadgeCheck, ExternalLink } from "lucide-react";

interface SharedProfileCardProps {
  profileId: string;
}

export function SharedProfileCard({ profileId }: SharedProfileCardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Assuming api.user.get(profileId) works for fetching a user by ID
    api.user.get(profileId)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) {
    return (
      <div className="w-full max-w-[280px] h-[88px] bg-white/[0.03] animate-pulse rounded-[20px] mt-2 flex items-center justify-center border border-white/[0.06]">
        <div className="w-4 h-4 border-[2px] border-white/10 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const displayName = profile.displayName || profile.username;
  // Assume user is verified if they have a specific role or just mock it for now
  // as the instructions ask for "verified badge support". We'll show it if profile.isVerified is true
  const isVerified = profile.isVerified || profile.role === 'verified' || false;

  return (
    <Link 
      to={`/profile/${profile.username}`}
      className="block w-full max-w-[280px] mt-2 bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] rounded-[20px] overflow-hidden hover:border-brand/30 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 group/profile backdrop-blur-xl touch-manipulation"
    >
      <div className="p-3.5 flex items-center gap-3.5">
        <div className="relative shrink-0">
          <Avatar src={profile.avatarUrl} alt={profile.username} size="lg" className="ring-1 ring-white/10" />
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] pointer-events-none" />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-bold text-white truncate group-hover/profile:text-brand transition-colors">
              {displayName}
            </span>
            {isVerified && (
              <BadgeCheck className="w-[14px] h-[14px] text-brand shrink-0" strokeWidth={2.5} />
            )}
          </div>
          <div className="text-[13px] font-medium text-zinc-400 truncate mt-0.5">
            @{profile.username}
          </div>
        </div>
        
        <div className="w-8 h-8 shrink-0 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-400 group-hover/profile:bg-brand group-hover/profile:text-black group-hover/profile:scale-110 transition-all duration-300">
          <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
