import clsx from 'clsx';

type Props = {
    src?: string;
    alt?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
};

export default function Avatar({ src, alt, className, size = 'md' }: Props) {
    const initials = alt ? alt.slice(0, 2).toUpperCase() : "BG";

    return (
        <div className={clsx("relative rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700", className)}>
            {src ? (
                <img src={src} alt={alt || "Avatar"} className="w-full h-full object-cover" />
            ) : (
                <span className="text-zinc-400 font-medium text-xs">{initials}</span>
            )}
        </div>
    );
}
