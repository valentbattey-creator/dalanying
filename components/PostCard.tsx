"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import type { Post } from "@/lib/store";

interface Props {
  post: Post;
  showFull?: boolean;
}

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return "刚刚";
  if (d < 3600) return `${Math.floor(d / 60)}分钟前`;
  if (d < 86400) return `${Math.floor(d / 3600)}小时前`;
  if (d < 2592000) return `${Math.floor(d / 86400)}天前`;
  return new Date(s).toLocaleDateString("zh-CN");
}

export default function PostCard({ post, showFull = false }: Props) {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { likedPosts, savedPosts, toggleLike, toggleSave } = useData();
  const hasImages = post.images && post.images.length > 0;

  function goToDetail() {
    router.push(`/post/${post.id}`);
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) { requireLogin(); return; }
    toggleLike(post.id);
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) { requireLogin(); return; }
    toggleSave(post.id);
  }

  function handleComment(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/post/${post.id}`);
  }

  // In full mode (detail page), don't make the card clickable
  const CardWrapper = showFull ? "article" : "article";
  const clickProps = showFull ? {} : { onClick: goToDetail, role: "link", tabIndex: 0 };

  return (
    <CardWrapper
      {...clickProps}
      className={`bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg overflow-hidden transition-all duration-300 ${
        showFull ? "" : "hover:border-[var(--color-border-default)] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      }`}
    >
      {hasImages && (
        <div className="overflow-hidden bg-[var(--color-bg-secondary)]">
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-auto aspect-[16/9] object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
            {post.category}
          </span>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">{timeAgo(post.createdAt)}</span>
        </div>

        <h2 className="text-base font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-300">
          {post.title}
        </h2>

        {showFull ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
            {post.content}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">
            {post.content}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#6b8cff] flex items-center justify-center text-white text-[10px] font-bold">
              {post.author.charAt(0)}
            </div>
            <span className="text-[12px] text-[var(--color-text-tertiary)]">{post.author}</span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLike}
              className={`flex items-center gap-1 text-[12px] transition-all duration-300 ${
                likedPosts.has(post.id)
                  ? "text-red-400 scale-110"
                  : "text-[var(--color-text-tertiary)] hover:text-red-400 hover:scale-105"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={likedPosts.has(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {post.likes}
            </button>
            <button onClick={handleComment}
              className="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-all duration-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {post.comments}
            </button>
            <button onClick={handleSave}
              className={`text-[12px] transition-all duration-300 ${
                savedPosts.has(post.id)
                  ? "text-[var(--color-accent)] scale-110"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:scale-105"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={savedPosts.has(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}
