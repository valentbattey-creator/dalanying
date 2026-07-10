"use client";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-[var(--color-bg-hover)] ${className}`} />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] overflow-hidden">
      {/* Cover skeleton */}
      <div className="aspect-[4/3] bg-[var(--color-bg-hover)] animate-pulse" />
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
    <div className="grid grid-cols-2 gap-2.5 px-1 pt-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-up">
          <PostCardSkeleton />
        </div>
      ))}
    </div>
  );
}
