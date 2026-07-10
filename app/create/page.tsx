"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { uploadImages, validateImageFile, MAX_FILES } from "@/lib/storage";
import EmojiPicker from "@/components/EmojiPicker";

const CATEGORIES = ["数码", "科技", "汽车", "运动", "游戏", "健身", "户外", "财经"];

export default function CreatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addPost } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("数码");
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  // Admin options
  const [isPinned, setIsPinned] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="min-h-screen bg-[var(--color-bg-primary)]" />;
  }

  const isAdmin = user.isAdmin;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setError("");
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`最多只能选择 ${MAX_FILES} 张图片`);
      return;
    }
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) { setError(validationError); continue; }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUploadProgress("");
    if (!title.trim()) { setError("请输入标题"); return; }
    if (!content.trim()) { setError("请输入正文内容"); return; }
    setPosting(true);
    try {
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setUploadProgress(`正在上传 ${selectedFiles.length} 张图片...`);
        imageUrls = await uploadImages(selectedFiles);
      }
      setUploadProgress("正在发布...");
      await addPost({
        title: title.trim(),
        content: content.trim(),
        images: imageUrls,
        category,
        tags,
        author: user!.name,
        isPinned: isAdmin ? isPinned : false,
        isAnnouncement: isAdmin ? isAnnouncement : false,
      } as Parameters<typeof addPost>[0]);
      toast.success("发布成功！");
      setTimeout(() => router.replace("/"), 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "发布失败，请重试";
      setError(msg);
      setPosting(false);
      setUploadProgress("");
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-14 pb-20 bg-[var(--color-bg-primary)]">
        <div className="max-w-2xl mx-auto px-5 py-6">
          {/* Admin badge */}
          {isAdmin && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-lg">🛡️</span>
              <span className="text-xs font-medium text-amber-400">管理员发布模式</span>
            </div>
          )}

          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
            {isAdmin ? "发布内容（管理员）" : "发布新内容"}
          </h1>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-6">分享你的经验、见解或故事</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Admin special options */}
            {isAdmin && (
              <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">管理员选项</p>
                
                {/* Pin toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📌</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">置顶帖子</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">在首页顶部始终显示</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinned(!isPinned)}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                      isPinned ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-hover)]"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow ${
                      isPinned ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </label>

                {/* Announcement toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📢</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">全站公告</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">以横幅样式展示在首页最顶部</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAnnouncement(!isAnnouncement)}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                      isAnnouncement ? "bg-amber-500" : "bg-[var(--color-bg-hover)]"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow ${
                      isAnnouncement ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </label>
              </div>
            )}

            {/* Category */}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">选择分类</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                      category === c
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入标题..."
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300"
              />
            </div>

            {/* Content */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你想分享的内容..."
                rows={8}
                maxLength={5000}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300 resize-none"
              />
            </div>

            {/* Image Upload */}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                图片（最多 {MAX_FILES} 张）
              </p>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-bg-hover)] group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedFiles.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] flex flex-col items-center justify-center gap-1.5 text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-300 group"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="transition-transform duration-300 group-hover:scale-110">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs">点击上传图片</span>
                  <span className="text-[10px] opacity-60">支持 JPG、PNG、WebP，单张不超过 10MB</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Tags */}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">标签（最多3个，回车添加）</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-medium border-[0.5px] border-[var(--color-accent)]/30">
                    {t}
                    <button type="button" onClick={() => setTags(tags.filter((_, j) => j !== i))} className="hover:text-white transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
              </div>
              {tags.length < 3 && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      if (!tags.includes(newTag)) setTags([...tags, newTag]);
                      setTagInput("");
                    }
                  }}
                  placeholder={tags.length === 0 ? "输入标签后按回车..." : `还可添加 ${3 - tags.length} 个`}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300"
                />
              )}
            </div>

            {/* Upload Progress */}
            {uploadProgress && !error && (
              <div className="bg-[var(--color-accent-glow)] border border-[var(--color-accent)]/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[var(--color-accent)]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-xs text-[var(--color-accent)]">{uploadProgress}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={posting || !title.trim() || !content.trim()}
              className="btn-primary w-full py-3 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              {posting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  发布中...
                </span>
              ) : isAnnouncement ? "📢 发布公告" : isPinned ? "📌 发布并置顶" : "发布内容"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
