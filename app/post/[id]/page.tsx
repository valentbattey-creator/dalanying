"use client";

import { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import EmojiPicker from "@/components/EmojiPicker";
import { uploadImages, MAX_FILES } from "@/lib/storage";
import { useData } from "@/lib/store";
import type { Post, Comment } from "@/lib/store";

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return "刚刚";
  if (d < 3600) return `${Math.floor(d / 60)}分钟前`;
  if (d < 86400) return `${Math.floor(d / 3600)}小时前`;
  if (d < 2592000) return `${Math.floor(d / 86400)}天前`;
  return new Date(s).toLocaleDateString("zh-CN");
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--color-bg-hover)]" />
        <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-[var(--color-bg-hover)]" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[var(--color-bg-hover)]" />
          <div className="h-8 w-1/2 animate-pulse rounded-lg bg-[var(--color-bg-hover)]" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full animate-pulse rounded bg-[var(--color-bg-hover)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--color-bg-hover)]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-bg-hover)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-bg-hover)]" />
          </div>
        </div>
      </div>
    </main>
  );
}

function ImageGallery({ images }: { images: string[] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (images.length === 0) return null;

  function openViewer(idx: number) {
    setViewerIndex(idx);
    setViewerOpen(true);
  }

  function nextImage(e: React.MouseEvent) {
    e.stopPropagation();
    setViewerIndex((prev) => (prev + 1) % images.length);
  }

  function prevImage(e: React.MouseEvent) {
    e.stopPropagation();
    setViewerIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  return (
    <>
      <div className="space-y-2">
        {images.map((url, i) => (
          <div
            key={i}
            onClick={() => openViewer(i)}
            className="cursor-pointer overflow-hidden rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] transition-all duration-300 hover:border-[var(--color-border-default)]"
          >
            <img
              src={url}
              alt={`图片 ${i + 1}`}
              className="w-full h-auto object-cover transition-transform duration-500 hover:scale-[1.02]"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* Fullscreen viewer */}
      {viewerOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={() => setViewerOpen(false)}
        >
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-300 z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-300 z-10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <img
            src={images[viewerIndex]}
            alt={`图片 ${viewerIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-300 z-10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {viewerIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}

function InteractionBar({ post }: { post: Post }) {
  const { user, requireLogin } = useAuth();
  const { likedPosts, savedPosts, toggleLike, toggleSave } = useData();
  const liked = likedPosts.has(post.id);
  const saved = savedPosts.has(post.id);

  function handleLike() {
    if (!user) { requireLogin(); toast("请先登录", { style: { background: "rgba(28,28,31,0.9)", border: "1px solid #333336", color: "#e8e8ea" } }); return; }
    toggleLike(post.id);
  }

  function handleSave() {
    if (!user) { requireLogin(); toast("请先登录", { style: { background: "rgba(28,28,31,0.9)", border: "1px solid #333336", color: "#e8e8ea" } }); return; }
    toggleSave(post.id);
  }

  return (
    <div className="flex items-center gap-5 py-3 border-y border-[var(--color-border-subtle)]">
      <button onClick={handleLike}
        className={`flex items-center gap-1.5 text-sm transition-all duration-300 ${
          liked ? "text-red-400 scale-105" : "text-[var(--color-text-tertiary)] hover:text-red-400"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span className="font-medium">{post.likes}</span>
      </button>
      <button onClick={handleSave}
        className={`flex items-center gap-1.5 text-sm transition-all duration-300 ${
          saved ? "text-[var(--color-accent)] scale-105" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="font-medium">{saved ? "已收藏" : "收藏"}</span>
      </button>
      <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="font-medium">{post.comments}</span>
      </span>
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { getPostById, getCommentsByPostId, addComment, loading } = useData();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState("");
  const [uploadingComment, setUploadingComment] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);

  if (loading) return <DetailSkeleton />;

  const post = getPostById(id);

  if (!post) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <p className="text-sm text-[var(--color-text-tertiary)]">内容不存在或已被删除</p>
          <button onClick={() => window.location.href = "/" }
            className="text-sm text-[var(--color-accent)] mt-3 inline-block hover:underline transition-all duration-300"
          >返回首页</button>
        </div>
      </main>
    );
  }

  const comments = getCommentsByPostId(id);

  // Organize comments: top-level and replies
  const { topLevel, replies } = useMemo(() => {
    const top: Comment[] = [];
    const rep: Record<string, Comment[]> = {};
    for (const c of comments) {
      if (!c.parentId) {
        top.push(c);
      } else {
        if (!rep[c.parentId]) rep[c.parentId] = [];
        rep[c.parentId].push(c);
      }
    }
    return { topLevel: top, replies: rep };
  }, [comments]);

  function handleComment(e: React.FormEvent, parentId: string | null = null) {
    e.preventDefault();
    if (!user) { requireLogin(); toast("请先登录", { style: { background: "rgba(28,28,31,0.9)", border: "1px solid #333336", color: "#e8e8ea" } }); return; }
    if (!commentText.trim()) return;
    addComment(id, commentText.trim(), parentId); toast.success(parentId ? "回复已发送" : "评论已发布");
    setCommentText("");
    setReplyTo(null);
  }

  function handleReply(comment: Comment) {
    if (!user) { requireLogin(); toast("请先登录", { style: { background: "rgba(28,28,31,0.9)", border: "1px solid #333336", color: "#e8e8ea" } }); return; }
    setReplyTo(comment);
    setCommentText("");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Glass back-bar */}
      <div className="glass sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center">
          <button
            onClick={() => window.location.href = "/" }
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all duration-300 px-2 py-1.5 -ml-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>返回</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pb-16">
        {/* Image Gallery */}
        <ImageGallery images={post.images || []} />

        {/* Category + Time */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <span className="text-xs font-medium tracking-wider text-[var(--color-accent)]">
            {post.category}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">{timeAgo(post.createdAt)}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold leading-tight text-[var(--color-text-primary)] mb-4">
          {post.title}
        </h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#6b8cff] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              post.author.charAt(0)
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{post.author}</p>
            <p className="text-[11px] text-[var(--color-text-tertiary)]">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Interaction Bar */}
        <InteractionBar post={post} />

        {/* Content */}
        <div className="mt-6 text-[15px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
          {post.content}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-6">
            {post.tags.map((t) => (
              <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Comments Section */}
        <section className="mt-10 pt-8 border-t border-[var(--color-border-subtle)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">
            评论 <span className="text-[var(--color-text-tertiary)] font-normal">({comments.length})</span>
          </h2>

          {/* Comment input */}
          {user ? (
            <form onSubmit={(e) => handleComment(e, replyTo?.id || null)} className="mb-6 space-y-2">
              {replyTo && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] text-[var(--color-accent)]">回复 @{replyTo.author}</span>
                  <button type="button" onClick={() => { setReplyTo(null); setCommentText(""); }}
                    className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">取消</button>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={replyTo ? `回复 @${replyTo.author}...` : "写下你的看法..."}
                    maxLength={500}
                    rows={2}
                    className={`w-full px-3 py-2 rounded-xl bg-[var(--color-bg-card)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 resize-none ${
                      replyTo ? "border-[var(--color-accent)]/50 focus:border-[var(--color-accent)]" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
                    }`}
                  />
                  {/* Image preview */}
                  {commentImagePreview && (
                    <div className="mt-2 relative inline-block">
                      <img src={commentImagePreview} alt="" className="h-16 rounded-lg object-cover" />
                      <button type="button" onClick={() => { setCommentImage(null); setCommentImagePreview(""); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px]">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="submit" disabled={(!commentText.trim() && !commentImage) || uploadingComment}
                    className="btn-primary px-3 py-2 rounded-xl text-xs disabled:opacity-40 transition-all duration-300">
                    {uploadingComment ? "..." : "发送"}
                  </button>
                </div>
              </div>
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-1">
                <div className="relative">
                  <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all duration-200 text-sm">
                    😊
                  </button>
                  {showEmoji && (
                    <EmojiPicker onSelect={(e) => { setCommentText(prev => prev + e); }} onClose={() => setShowEmoji(false)} />
                  )}
                </div>
                <button type="button" onClick={() => commentFileRef.current?.click()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all duration-200">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
                <input ref={commentFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) { toast.error("图片不能超过10MB"); return; }
                    setCommentImage(f);
                    setCommentImagePreview(URL.createObjectURL(f));
                  }} />
                <span className="text-[10px] text-[var(--color-text-tertiary)] ml-auto">{commentText.length}/500</span>
              </div>
            </form>
          ) : (
            <button
              onClick={requireLogin}
              className="w-full mb-6 py-3 rounded-xl border border-dashed border-[var(--color-border-default)] text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all duration-300"
            >
              登录后参与评论
            </button>
          )}

          {comments.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">💬</span>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-3">暂无评论，来抢沙发吧</p>
            </div>
          ) : (
            <div className="space-y-5">
              {topLevel.map((c) => (
                <div key={c.id} className="animate-fade-up">
                  <CommentItem
                    comment={c}
                    onReply={handleReply}
                  />
                  {/* Nested replies */}
                  {replies[c.id] && replies[c.id].length > 0 && (
                    <div className="ml-10 mt-2 space-y-3 pl-4 border-l-2 border-[var(--color-border-subtle)]">
                      {replies[c.id].map((reply) => (
                        <div key={reply.id} className="animate-fade-up">
                          <CommentItem
                            comment={reply}
                            onReply={handleReply}
                            isReply
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CommentItem({
  comment,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onReply: (c: Comment) => void;
  isReply?: boolean;
}) {
  return (
    <div className="flex gap-3 group">
      <div className={`${isReply ? "w-7 h-7" : "w-8 h-8"} rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden`}>
        {comment.authorAvatar ? (
          <img src={comment.authorAvatar} alt="" className="w-full h-full object-cover" />
        ) : (
          comment.author.charAt(0)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`${isReply ? "text-[12px]" : "text-[13px]"} font-medium text-[var(--color-text-primary)]`}>
            {comment.author}
          </span>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className={`${isReply ? "text-[13px]" : "text-sm"} text-[var(--color-text-secondary)] mt-1 leading-relaxed`}>
          {comment.content}
        </p>
        {comment.image && (
          <div className="mt-2">
            <img src={comment.image} alt="" className="max-h-40 rounded-lg object-cover" loading="lazy" />
          </div>
        )}
        <button
          onClick={() => onReply(comment)}
          className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] mt-1 transition-colors duration-200"
        >
          回复
        </button>
      </div>
    </div>
  );
}
