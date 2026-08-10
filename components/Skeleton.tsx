"use client";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-[var(--color-bg-hover)] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] overflow-hidden">
      {/* Cover skeleton */}
      <div className="aspect-[4/3] relative overflow-hidden bg-[var(--color-bg-hover)]">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="p-2.5 space-y-1.5">
        <SkeletonBlock className="h-3.5 w-full" />
        <div className="space-y-1">
          <SkeletonBlock className="h-2.5 w-full" />
          <SkeletonBlock className="h-2.5 w-3/4" />
        </div>
        <div className="flex justify-between items-center pt-0.5">
          <div className="flex items-center gap-1.5">
            <SkeletonBlock className="h-5 w-5 rounded-full" />
            <SkeletonBlock className="h-2.5 w-10" />
          </div>
          <SkeletonBlock className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-up">
          <PostCardSkeleton />
        </div>
      ))}
    </div>
  );
}
