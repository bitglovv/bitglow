import clsx from "clsx";
import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";

function getUserColor(username: string): string {
    const colors = [
        'text-emerald-400', 'text-blue-400', 'text-indigo-400', 
        'text-purple-400', 'text-pink-400', 'text-rose-400', 
        'text-orange-400', 'text-amber-400', 'text-sky-400'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

type Props = {
    text: string;
    username: string;
    isSelf: boolean;
    avatarUrl?: string;
    timestamp?: string;
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
};

export default function MessageBubble({ 
    text, username, isSelf, avatarUrl, timestamp, isFirstInGroup, isLastInGroup 
}: Props) {
    return (
        <div className={clsx(
            "flex gap-3 relative animate-in fade-in slide-in-from-bottom-1 duration-300",
            isSelf ? "flex-row-reverse" : "flex-row",
            isFirstInGroup ? "mt-4" : "mt-0.5"
        )}>
            {/* Avatar only for other user, and only on first message of group */}
            {!isSelf ? (
                <div className="w-8 flex-shrink-0 flex items-start mt-1">
                    {isFirstInGroup && (
                        <Link to={`/profile/${username}`} className="hover:opacity-80 transition-opacity">
                            <Avatar src={avatarUrl} alt={username} size="xs" />
                        </Link>
                    )}
                </div>
            ) : (
                <div className="w-2" /> 
            )}

            <div className={clsx("flex flex-col max-w-[75%]", isSelf ? "items-end" : "items-start")}>
                    {!isSelf && isFirstInGroup && (
                        <Link 
                            to={`/profile/${username}`} 
                            className={clsx(
                                "text-[11px] font-bold tracking-tight mb-1 ml-1 hover:brightness-125 transition-all lowercase",
                                getUserColor(username)
                            )}
                        >
                            {username}
                        </Link>
                    )}
                
                <div className={clsx(
                    "px-4 py-2 text-[14px] leading-[1.4] break-words shadow-lg transition-all",
                    isSelf
                        ? "bg-gradient-to-r from-emerald-500 to-blue-600 text-white"
                        : "bg-white/[0.08] backdrop-blur-md border border-white/5 text-zinc-100",
                    // Dynamic Rounding
                    isSelf
                        ? clsx(
                            "rounded-[20px]",
                            isFirstInGroup && !isLastInGroup && "rounded-tr-[4px]",
                            !isFirstInGroup && !isLastInGroup && "rounded-r-[4px]",
                            !isFirstInGroup && isLastInGroup && "rounded-br-[4px]"
                        )
                        : clsx(
                            "rounded-[20px]",
                            isFirstInGroup && !isLastInGroup && "rounded-tl-[4px]",
                            !isFirstInGroup && !isLastInGroup && "rounded-l-[4px]",
                            !isFirstInGroup && isLastInGroup && "rounded-bl-[4px]"
                        )
                )}>
                    {text}
                </div>
                
                {/* Time below chat */}
                {isLastInGroup && (
                    <div className={clsx(
                        "mt-1 text-[10px] text-zinc-600 font-medium",
                        isSelf ? "mr-1" : "ml-1"
                    )}>
                        {timestamp}
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

