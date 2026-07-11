"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { type Post } from "@/lib/store";
import AdminBadge from "@/components/AdminBadge";
import { TinyAvatar } from "@/components/UserAvatar";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
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

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  onLike: (postId: string) => void;
  onCardClick: (postId: string) => void;
  isSaved?: boolean;
  onSave?: (postId: string) => void;
}

function PostCardInner({ post, isLiked, onLike, onCardClick, isSaved = false, onSave }: PostCardProps) {
  const hasImage = post.images && post.images.length > 0;

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onLike(post.id);
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (onSave) onSave(post.id);
  }

  return (
    <article
      onClick={() => onCardClick(post.id)}
      className="group bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[var(--color-border-default)] active:scale-[0.98]"
    >
      {hasImage && (
        <div className="relative overflow-hidden">
          <img
            src={post.images[0]}
            alt={post.title}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            className="w-full aspect-[4/3] object-cover"
          />
          {post.images.length > 1 && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium">
              {post.images.length}图
            </span>
          )}
        </div>
      )}

      <div className={`${hasImage ? "p-2.5" : "p-3"} space-y-1.5`}>
        <h3 className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-1">
          {post.isPinned && <span className="mr-1">📌</span>}
          {post.title}
        </h3>

        <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)] line-clamp-2">
          {post.content}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {post.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <TinyAvatar name={post.author || "?"} avatarUrl={post.authorAvatar} size={22} />
            <span className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[80px] flex items-center gap-0.5">
              {post.author || "匿名"}
              {post.authorId === "admin" && <AdminBadge size="sm" />}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-0.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="text-[10px]">{post.views || 0}</span>
            </span>
            <button
              onClick={handleSave}
              className="flex items-center gap-0.5 transition-all duration-150 active:scale-90"
              title="收藏"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "#fbbf24" : "none"} stroke={isSaved ? "#fbbf24" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
            <button
              onClick={handleLike}
              className="flex items-center gap-0.5 transition-all duration-150 active:scale-90"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? "var(--color-accent)" : "none"} stroke={isLiked ? "var(--color-accent)" : "currentColor"} strokeWidth="2" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-[11px] font-medium">{post.likes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(PostCardInner);
