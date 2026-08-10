"use client";

import { memo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { type Post } from "@/lib/store";
import { dataService } from "@/lib/data";
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
  onDelete?: (postId: string) => void;
  currentUserId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

function PostCardInner({ post, isLiked, onLike, onCardClick, isSaved = false, onSave, onDelete, currentUserId, isOwner, isAdmin }: PostCardProps) {
  const hasImage = post.images && post.images.length > 0;
  const [showMenu, setShowMenu] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = currentUserId && (post.authorId === currentUserId || post.authorId === "system" || isOwner || isAdmin);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onLike(post.id);
    if (!isLiked) {
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 450);
    }
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (onSave) onSave(post.id);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setShowMenu(false);
      return;
    }
    setDeleting(true);
    try {
      const success = onDelete ? await onDelete(post.id) : false;
      if (success === false) {
        // Deletion failed, reset state
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setConfirmDelete(false);
  }

  const lastViewTime = useRef<number>(0);
  
  function handleCardClick() {
    // Increment views when post is clicked (debounce: only once per 5 seconds)
    const now = Date.now();
    if (now - lastViewTime.current > 5000) {
      lastViewTime.current = now;
      dataService.incrementViews(post.id).catch(() => {});
    }
    onCardClick(post.id);
  }

  return (
    <article
      onClick={handleCardClick}
      className="group bg-[var(--color-bg-card)] rounded-[12px] overflow-hidden cursor-pointer active:scale-[0.98] relative"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", border: "0.5px solid var(--color-border-subtle)", transition: "box-shadow 0.3s ease, transform 0.15s ease" }}
    >
      {/* Delete overlay - shows when confirming */}
      {confirmDelete && (
        <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm rounded-[10px] flex flex-col items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-white text-sm font-medium">确定删除这条帖子？</p>
          <div className="flex gap-2">
            <button onClick={cancelDelete}
              className="px-5 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition-all">
              取消
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-40 transition-all">
              {deleting ? "删除中..." : "确认删除"}
            </button>
          </div>
        </div>
      )}
      {/* Delete menu button */}
      {canDelete && !confirmDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/70 hover:text-white text-sm transition-all"
        >
          ⋯
        </button>
      )}
      {showMenu && !confirmDelete && (
        <div className="absolute top-9 right-2 z-20 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg shadow-xl overflow-hidden">
          <button onClick={handleDelete} className="w-full px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 text-left transition-all flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            删除
          </button>
        </div>
      )}

      {hasImage && (
        <div className="relative overflow-hidden">
          <img
            src={post.images[0]}
            alt={post.title}
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            className="w-full" style={{ display: "block", maxHeight: 500, objectFit: "cover" }}
          />
          {post.images.length > 1 && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium">
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
              className={`flex items-center gap-0.5 transition-all duration-150 active:scale-90${justLiked ? " like-bounce" : ""}`}
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
