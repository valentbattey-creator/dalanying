"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { toast } from "sonner";
import type { Post } from "@/lib/store";

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { likedPosts, toggleLike, deletePost, updatePost } = useData();
  const hasImages = post.images && post.images.length > 0;
  const liked = likedPosts.has(post.id);
  const isOwner = user?.id === post.authorId;
  const isAdmin = user?.isAdmin || false;
  const canManage = isOwner || isAdmin;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  function goToDetail() {
    if (editing || menuOpen) return;
    router.push(`/post/${post.id}`);
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) { requireLogin(); toast("请先登录"); return; }
    toggleLike(post.id);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("确定要删除这条内容吗？此操作不可恢复。")) return;
    const ok = await deletePost(post.id);
    if (ok) toast.success("已删除");
    else toast.error("删除失败");
    setMenuOpen(false);
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setMenuOpen(false);
  }

  async function handleEditSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editTitle.trim()) { toast.error("标题不能为空"); return; }
    const ok = await updatePost(post.id, { title: editTitle.trim(), content: editContent.trim() });
    if (ok) { toast.success("已更新"); setEditing(false); }
    else toast.error("更新失败");
  }

  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()} className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] p-3 space-y-2">
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] border-[0.5px] border-[var(--color-border-subtle)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" placeholder="标题" />
        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] border-[0.5px] border-[var(--color-border-subtle)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] resize-none" placeholder="正文" />
        <div className="flex gap-1.5">
          <button onClick={handleEditSave} className="flex-1 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium">保存</button>
          <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} className="flex-1 py-1.5 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-xs">取消</button>
        </div>
      </div>
    );
  }

  return (
    <article onClick={goToDetail}
      className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[var(--color-border-default)] active:scale-[0.98] relative group">

      {/* More menu */}
      {canManage && (
        <div ref={menuRef} className="absolute top-1.5 right-1.5 z-10">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-all duration-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-24 bg-[var(--color-bg-elevated)] border-[0.5px] border-[var(--color-border-default)] rounded-lg shadow-xl py-1 animate-fade-up">
              {isOwner && <button onClick={handleEdit} className="w-full text-left px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)] hover:bg-white/[0.04] transition-all duration-200">编辑</button>}
              <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-[12px] text-red-400 hover:bg-white/[0.04] transition-all duration-200">
                {isAdmin && !isOwner ? "删除(管理)" : "删除"}
              </button>
            </div>
          )}
        </div>
      )}

      {post.isAnnouncement && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium">📢 公告</span>
        </div>
      )}

      {/* Cover */}
      {hasImages ? (
        <div className="relative overflow-hidden">
          <img src={post.images[0]} alt={post.title} className="w-full aspect-[4/3] object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-zinc-800 via-zinc-750 to-zinc-800 flex items-center justify-center">
          <span className="text-zinc-600 text-2xl font-bold select-none">{post.title.charAt(0)}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-2.5 space-y-1.5">
        <h3 className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-1">{post.title}</h3>
        <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)] line-clamp-2">{post.content}</p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0 overflow-hidden">
              {post.authorAvatar ? <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" /> : post.author.charAt(0)}
            </div>
            <span className="text-[11px] text-[var(--color-text-tertiary)] truncate">{post.author}</span>
          </div>
          <button onClick={handleLike} className="flex items-center gap-1 shrink-0 transition-all duration-200 hover:scale-110 active:scale-90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className={liked ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className={`text-[11px] ${liked ? "text-[var(--color-accent)] font-medium" : "text-[var(--color-text-tertiary)]"}`}>{post.likes}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
