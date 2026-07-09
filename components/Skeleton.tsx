"use client";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[var(--color-bg-hover)] ${className}`} />
  );
}

export function PostCardSkeleton() {
  return (
    <article className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
      {/* 封面骨架 */}
      <div className="aspect-[16/9] bg-[var(--color-bg-hover)] animate-pulse" />
      <div className="p-5 space-y-3">
        {/* 分类 + 时间 */}
        <div className="flex justify-between">
          <SkeletonBlock className="h-3 w-12" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        {/* 标题 */}
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-3/4" />
        {/* 正文 */}
        <div className="space-y-1.5">
          <SkeletonBlock className="h-3.5 w-full" />
          <SkeletonBlock className="h-3.5 w-5/6" />
        </div>
        {/* 底部 */}
        <div className="flex justify-between pt-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-6 w-6 rounded-full" />
            <SkeletonBlock className="h-3 w-14" />
          </div>
          <div className="flex gap-3">
            <SkeletonBlock className="h-3 w-10" />
            <SkeletonBlock className="h-3 w-10" />
            <SkeletonBlock className="h-3 w-8" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-fade-up">
          <PostCardSkeleton />
        </div>
      ))}
    </div>
  );
}
