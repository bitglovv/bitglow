import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-white/[0.06] rounded-xl",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_2s_infinite]" />
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)] md:shadow-none">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1 pt-1">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-8 rounded-md" />
          </div>
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </div>
      <div className="space-y-2 mt-4">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[90%] rounded-md" />
      </div>
      <div className="flex items-center gap-4 pt-4">
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="ml-auto h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function ComposerSkeleton() {
  return (
    <div className="bg-white/[0.02] md:bg-black/40 border border-white/15 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.25)] md:shadow-none">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-1/2 rounded-md" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
        <Skeleton className="h-3 w-12 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start pt-8">
      <div className="shrink-0">
        <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full" />
      </div>
      <div className="flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <div className="flex items-center justify-center md:justify-start gap-8">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <Skeleton className="h-4 w-full max-w-lg mx-auto md:mx-0 rounded-md" />
          <Skeleton className="h-4 w-2/3 max-w-xs mx-auto md:mx-0 rounded-md" />
        </div>
        <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
      <Skeleton className="w-14 h-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-12 rounded-md" />
        </div>
        <Skeleton className="h-4 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-white/[0.04]">
      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}
