"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { toast } from "sonner";
import EmojiPicker from "@/components/EmojiPicker";
import { uploadImages } from "@/lib/storage";
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

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      // Scroll to bottom of comments
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-[90vw] h-[85vh] max-w-[1200px] bg-[var(--color-bg-primary)] rounded-xl overflow-hidden flex shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Left: Image area (60%) */}
        <div className="w-[60%] bg-black flex items-center justify-center relative">
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex]}
                alt={post?.title}
                className="max-w-full max-h-full object-contain"
              />
              {/* Image navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => (prev + 1) % images.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                  {/* Image dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(i);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-white/50 text-sm">暂无图片</div>
          )}
        </div>

        {/* Right: Content area (40%) */}
        <div className="w-[40%] flex flex-col bg-[var(--color-bg-primary)]">
          {/* Post header */}
          <div className="p-5 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {post?.authorAvatar ? (
                  <img src={post?.authorAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  post?.author?.charAt(0) || "?"
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{post?.author || "匿名"}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{timeAgo(post?.createdAt)}</p>
              </div>
            </div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">{post?.title}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{post?.content}</p>
            
            {/* Tags */}
            {post?.tags && post?.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post?.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{post?.likes || 0}</span>
              </button>
              <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>{postComments.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <span>{post?.views || 0}</span>
              </div>
            </div>
          </div>

          {/* Comments section */}
          <div ref={rightPanelRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {postComments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--color-text-tertiary)]">暂无评论</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">来说点什么吧</p>
              </div>
            ) : (
              postComments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {comment.authorAvatar ? (
                      <img src={comment.authorAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      comment.author?.charAt(0) || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{comment.author || "匿名"}</span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{comment.content}</p>
                    <button
                      onClick={() => {
                        setReplyTo(comment);
                        commentInputRef.current?.focus();
                      }}
                      className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] mt-1"
                    >
                      回复
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-xs text-[var(--color-text-tertiary)]">
                <span>回复 {replyTo.author}:</span>
                <span className="truncate flex-1">{replyTo.content}</span>
                <button onClick={() => setReplyTo(null)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder={user ? "说点什么..." : "登录后评论"}
                className="flex-1 h-10 px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-lg resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                disabled={!user}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || !user || sending}
                className="px-4 h-10 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity"
              >
                {sending ? "发送中..." : "发送"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
