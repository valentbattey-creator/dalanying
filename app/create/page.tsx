"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { uploadImages, validateImageFile, MAX_FILES } from "@/lib/storage";

const CATEGORIES = ["数码", "科技", "汽车", "运动", "游戏", "健身", "户外", "财经"];

export default function CreatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addPost } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("数码");
  const [tags, setTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="min-h-screen bg-[var(--color-bg-primary)]" />;
  }

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
      if (validationError) {
        setError(validationError);
        continue;
      }
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

    if (!title.trim()) {
      setError("请输入标题");
      return;
    }
    if (!content.trim()) {
      setError("请输入正文内容");
      return;
    }

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
        tags: tags.split(/[,，\s]+/).filter(Boolean),
        author: user!.name,
      });

      router.replace("/");
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
      <main className="min-h-screen pt-14 bg-[var(--color-bg-primary)]">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">发布新内容</h1>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-6">分享你的经验、见解或故事</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                标题 <span className="text-red-400">*</span>
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入一个吸引人的标题..."
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300"
              />
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 ml-1">{title.length}/100</p>
            </div>

            {/* Content */}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                正文 <span className="text-red-400">*</span>
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你想分享的内容..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none resize-y min-h-[160px] transition-all duration-300"
              />
            </div>

            {/* Images */}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                图片 <span className="text-[var(--color-text-tertiary)] font-normal">（选填，最多 {MAX_FILES} 张）</span>
              </p>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] group">
                      <img src={url} alt={`预览 ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover:opacity-100"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[var(--color-accent)] text-white text-[10px] font-medium">
                          封面
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 rounded-xl border-2 border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-300 flex flex-col items-center gap-1.5 group"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="transition-transform duration-300 group-hover:scale-110">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs">点击上传图片</span>
                  <span className="text-[10px] opacity-60">支持 JPG、PNG、WebP，单张不超过 10MB</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Tags */}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">标签（逗号分隔）</p>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例如：AI, 效率工具, 推荐"
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300"
              />
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
              ) : (
                "发布内容"
              )}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
