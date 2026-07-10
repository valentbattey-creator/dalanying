"use client";

import { useRouter } from "next/navigation";
import { type Post } from "@/lib/store";

// Time ago helper
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

export default function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const hasImage = post.images && post.images.length > 0;

  const handleClick = () => {
    router.push(`/post/${post.id}`);
  };

  return (
    <article
      onClick={handleClick}
      className="group bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] overflow-hidden cursor-pointer transition-all duration-300 hover:border-[var(--color-border-default)] hover:shadow-md hover:shadow-black/20 active:scale-[0.98]"
    >
      {/* Cover Image */}
      {hasImage && (
        <div className="relative overflow-hidden">
          <img
            src={post.images[0]}
            alt={post.title}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {post.images.length > 1 && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium">
              {post.images.length}图
            </span>
          )}
        </div>
      )}

      {/* Text Content */}
      <div className={`${hasImage ? "p-2.5" : "p-3"} space-y-1.5`}>
        {/* Title */}
        <h3 className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors duration-200">
          {post.title}
        </h3>

        {/* Body */}
        <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)] line-clamp-2">
          {post.content}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {post.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom bar: author + likes */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0 overflow-hidden">
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                post.author?.charAt(0) || "?"
              )}
            </div>
            <span className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[80px]">
              {post.author || "匿名"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-[10px]">{post.likes || 0}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
