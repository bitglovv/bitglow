import React from 'react';

interface AvatarProps {
    src?: string;
    alt?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    status?: 'online' | 'offline' | 'away' | 'none';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = 'Avatar',
    size = 'md',
    status = 'none',
    className = '',
}) => {
    const sizes = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
        '2xl': 'w-24 h-24',
    };

    const statusColors = {
        online: 'bg-brand',
        offline: 'bg-zinc-500',
        away: 'bg-yellow-500',
        none: 'transparent',
    };

    const initials = alt.substring(0, 2).toUpperCase();

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`${sizes[size]} overflow-hidden rounded-full bg-transparent flex items-center justify-center`}>
                {src ? (
                    <img src={src} alt={alt} className="block h-full w-full rounded-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-transparent text-brand font-bold text-sm">
                        {initials}
                    </div>
                )}
            </div>
            {status !== 'none' && (
                <span className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status]} border-2 border-zinc-950 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></span>
            )}
        </div>
    );
};
