"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { toast } from "sonner";
import type { Post, Comment } from "@/lib/store";

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return "刚刚";
  if (d < 3600) return `${Math.floor(d / 60)}分钟前`;
  if (d < 86400) return `${Math.floor(d / 3600)}小时前`;
  if (d < 2592000) return `${Math.floor(d / 86400)}天前`;
  return new Date(s).toLocaleDateString("zh-CN");
}

interface PostDetailModalProps {
  postId: string;
  onClose: () => void;
}

export default function PostDetailModal({ postId, onClose }: PostDetailModalProps) {
  const { user, requireLogin } = useAuth();
  const { posts, comments, addComment, toggleLike, likedPosts } = useData();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const post = posts.find(p => p.id === postId);
  const postComments = comments.filter(c => c.postId === postId);
  const isLiked = likedPosts.has(postId);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!post) return null;

  async function handleSendComment() {
    if (!commentText.trim() || !user || sending || !post) return;
    setSending(true);
    try {
      await addComment(post.id, commentText.trim(), replyTo?.id || null);
      setCommentText("");
      setReplyTo(null);
      toast.success("评论成功");
      if (rightPanelRef.current) {
        rightPanelRef.current.scrollTop = rightPanelRef.current.scrollHeight;
      }
    } catch {
      toast.error("评论失败");
    } finally {
      setSending(false);
    }
  }

  function handleLike() {
    if (!user || !post) { requireLogin(); return; }
    toggleLike(post.id);
  }

  const images = post?.images || [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} onClick={onClose}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />

      {/* Close button - absolutely on top of everything */}
      <button
        onClick={onClose}
        aria-label="关闭"
        style={{
          position: "fixed",
          top: "max(16px, env(safe-area-inset-top, 16px))",
          right: "max(16px, env(safe-area-inset-right, 16px))",
          zIndex: 10001,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.6)")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Back button - left top */}
      <button
        onClick={onClose}
        aria-label="返回"
        style={{
          position: "fixed",
          top: "max(16px, env(safe-area-inset-top, 16px))",
          left: "max(16px, env(safe-area-inset-left, 16px))",
          zIndex: 10001,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderRadius: 8,
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          transition: "background-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.6)")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回
      </button>

      {/* Modal container */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 10000,
          width: "90vw",
          maxWidth: 1200,
          height: "85vh",
          maxHeight: "90vh",
          margin: "auto",
          marginTop: "max(60px, calc(env(safe-area-inset-top, 0px) + 50px))",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          backgroundColor: "var(--color-bg-primary)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Left: Image area (60%) */}
        <div style={{ width: "60%", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex]}
                alt={post?.title || ""}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length); }}
                    style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); }}
                    style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                  <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
                    {images.map((_, i) => (
                      <button key={i} onClick={e => { e.stopPropagation(); setCurrentImageIndex(i); }}
                        style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: i === currentImageIndex ? "#fff" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", padding: 0 }} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>暂无图片</div>
          )}
        </div>

        {/* Right: Content area (40%) */}
        <div style={{ width: "40%", display: "flex", flexDirection: "column", backgroundColor: "var(--color-bg-primary)", overflow: "hidden" }}>
          {/* Post header - fixed */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "0.5px solid var(--color-border-subtle)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #52525b, #71717a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
                {post?.authorAvatar ? <img src={post.authorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (post?.author?.charAt(0) || "?")}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{post?.author || "匿名"}</p>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>{timeAgo(post?.createdAt || "")}</p>
              </div>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px" }}>{post?.title}</h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{post?.content}</p>
            {post?.tags && post.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {post.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 999, backgroundColor: "var(--color-accent-glow)", color: "var(--color-accent)" }}>{tag}</span>
                ))}
              </div>
            )}
            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16, paddingTop: 12, borderTop: "0.5px solid var(--color-border-subtle)" }}>
              <button onClick={handleLike} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: isLiked ? "var(--color-accent)" : "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                <span>{post?.likes || 0}</span>
              </button>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--color-text-tertiary)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <span>{postComments.length}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--color-text-tertiary)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                <span>{post?.views || 0}</span>
              </span>
            </div>
          </div>

          {/* Comments section - scrollable */}
          <div ref={rightPanelRef} style={{ flex: 1, overflowY: "auto", padding: 20, WebkitOverflowScrolling: "touch" }}>
            {postComments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", margin: 0 }}>暂无评论</p>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>来说点什么吧</p>
              </div>
            ) : (
              postComments.map(comment => (
                <div key={comment.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #52525b, #71717a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
                    {comment.authorAvatar ? <img src={comment.authorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (comment.author?.charAt(0) || "?")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{comment.author || "匿名"}</span>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>{comment.content}</p>
                    <button onClick={() => { setReplyTo(comment); commentInputRef.current?.focus(); }}
                      style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginTop: 4 }}>
                      回复
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input - fixed at bottom */}
          <div style={{ padding: 16, borderTop: "0.5px solid var(--color-border-subtle)", backgroundColor: "var(--color-bg-primary)", flexShrink: 0 }}>
            {replyTo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: "var(--color-text-tertiary)" }}>
                <span>回复 {replyTo.author}:</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content}</span>
                <button onClick={() => setReplyTo(null)} style={{ color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                placeholder={user ? "说点什么..." : "登录后评论"}
                disabled={!user}
                style={{ flex: 1, height: 40, padding: "8px 12px", fontSize: 14, backgroundColor: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, resize: "none", outline: "none", color: "var(--color-text-primary)" }}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || !user || sending}
                style={{ padding: "0 20px", height: 40, backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 500, borderRadius: 8, border: "none", cursor: sending ? "not-allowed" : "pointer", opacity: (!commentText.trim() || !user || sending) ? 0.5 : 1, flexShrink: 0 }}
              >
                {sending ? "..." : "发送"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
