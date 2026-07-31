"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { uploadImages, validateImageFile, MAX_FILES } from "@/lib/storage";

// All categories (与首页保持一致)
const ALL_CATEGORIES = [
  "数码", "科技", "汽车", "运动", "游戏", "健身", "户外", "财经",
  "美食", "旅游", "音乐", "电影", "时尚", "宠物", "摄影", "读书",
  "职场", "教育", "房产", "军事", "历史", "哲学", "设计", "动漫",
  "骑行", "钓鱼", "篮球", "足球", "跑步", "格斗", "穿搭", "机车",
  "清谈", "月落", "浮生", "缘渡", "修行", "健康", "手工", "家居", "天文", "趣闻", "科普",
];

// Keyword → category mapping for auto-detection
const KEYWORD_MAP: Record<string, string> = {
  "手机": "数码", "电脑": "数码", "笔记本": "数码", "相机": "数码", "耳机": "数码",
  "芯片": "科技", "AI": "科技", "人工智能": "科技", "编程": "科技", "代码": "科技",
  "开车": "汽车", "特斯拉": "汽车", "宝马": "汽车", "奔驰": "汽车", "电车": "汽车",
  "跑步": "跑步", "健身": "健身", "增肌": "健身", "减脂": "健身", "撸铁": "健身",
  "游戏": "游戏", "PS5": "游戏", "Switch": "游戏", "Steam": "游戏", "电竞": "游戏",
  "股票": "财经", "基金": "财经", "A股": "财经", "理财": "财经", "投资": "财经",
  "篮球": "篮球", "NBA": "篮球", "足球": "足球", "世界杯": "足球", "英超": "足球",
  "徒步": "户外", "露营": "户外", "登山": "户外", "骑行": "骑行", "钓鱼": "钓鱼",
  "好吃": "美食", "餐厅": "美食", "做饭": "美食", "烧烤": "美食", "火锅": "美食",
  "旅行": "旅游", "酒店": "旅游", "打卡": "旅游", "景点": "旅游",
  "穿搭": "穿搭", "潮牌": "穿搭", "球鞋": "穿搭", "OOTD": "穿搭",
  "电影": "电影", "剧": "电影", "动漫": "动漫", "番": "动漫", "二次元": "动漫",
  "猫": "宠物", "狗": "宠物", "宠物": "宠物", "萌宠": "宠物",
  "摄影": "摄影", "拍照": "摄影", "镜头": "摄影", "构图": "摄影",
  "职场": "职场", "面试": "职场", "工资": "职场", "跳槽": "职场",
  "读书": "读书", "书单": "读书", "阅读": "读书",
  "设计": "设计", "UI": "设计", "平面": "设计",
  "机车": "机车", "摩托车": "机车", "摩旅": "机车",
  "格斗": "格斗", "拳击": "格斗", "MMA": "格斗", "UFC": "格斗",
  "历史": "历史", "三国": "历史", "明朝": "历史",
  "哲学": "哲学", "人生": "哲学", "意义": "哲学",
  "买房": "房产", "装修": "房产", "房价": "房产",
  "军事": "军事", "武器": "军事", "战争": "军事",
  "月落": "月落", "初恋": "月落", "暗恋": "月落", "遗憾": "月落",
  "彩礼": "缘渡", "结婚": "缘渡", "相亲": "缘渡", "婚礼": "缘渡", "离婚": "缘渡",
  "爱情": "浮生", "恋爱": "浮生", "异地恋": "浮生", "分手": "浮生", "出轨": "浮生",
  "修行": "修行", "自律": "修行", "独立": "修行",
  "健康": "健康", "养生": "健康", "睡眠": "健康", "心理": "健康",
  "手工": "手工", "DIY": "手工", "木工": "手工",
  "家居": "家居", "收纳": "家居", "软装": "家居",
  "天文": "天文", "星空": "天文", "宇宙": "天文",
  "趣闻": "趣闻", "搞笑": "趣闻", "段子": "趣闻",
  "科普": "科普", "知识": "科普", "冷知识": "科普",
};

// Draft key for localStorage
const DRAFT_KEY = "dalanying_draft";

interface Draft {
  title: string;
  content: string;
  category: string;
  tags: string[];
  savedAt: number;
}

export default function CreatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addPost } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [detectedCategory, setDetectedCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Admin options
  const [isPinned, setIsPinned] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: Draft = JSON.parse(saved);
        setHasDraft(true);
        // Auto-restore if saved within 24 hours
        if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
          setTitle(draft.title);
          setContent(draft.content);
          setCategory(draft.category);
          setTags(draft.tags);
          setHasDraft(false);
          toast.success("已恢复草稿", { duration: 2000 });
        }
      }
    } catch {}
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!title && !content) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          title, content, category, tags,
          savedAt: Date.now(),
        }));
      } catch {}
    }, 2000); // Save after 2 seconds of inactivity
    return () => clearTimeout(timer);
  }, [title, content, category, tags]);

  // Clear draft on successful publish
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  useEffect(() => {
    if (!user && !authLoading) router.replace("/");
  }, [user, authLoading, router]);

  // 游客不能发帖
  if (!authLoading && user?.isGuest) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">需要注册才能发帖</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-4">用邮箱注册一个账号就可以发布内容了</p>
          <button onClick={() => router.push("/")} className="btn-primary px-6 py-2.5 rounded-xl text-sm">去登录</button>
        </div>
      </main>
    );
  }

  if (authLoading || !user) {
    return <div className="min-h-screen bg-[var(--color-bg-primary)]" />;
  }

  const isAdmin = !!user.isAdmin;

  // Auto-detect category from title + content
  const autoDetect = useMemo(() => {
    const text = (title + " " + content).toLowerCase();
    const scores: Record<string, number> = {};
    for (const [keyword, cat] of Object.entries(KEYWORD_MAP)) {
      if (text.includes(keyword.toLowerCase())) {
        scores[cat] = (scores[cat] || 0) + 1;
      }
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : "";
  }, [title, content]);

  useEffect(() => { setDetectedCategory(autoDetect); }, [autoDetect]);

  // Auto-suggest tags from content
  const autoTags = useMemo(() => {
    const text = (title + " " + content).toLowerCase();
    const found: string[] = [];
    for (const [keyword] of Object.entries(KEYWORD_MAP)) {
      if (text.includes(keyword.toLowerCase()) && !found.includes(keyword) && found.length < 5) {
        found.push(keyword);
      }
    }
    return found;
  }, [title, content]);

  // Show detected category (but user can override)
  const effectiveCategory = category || detectedCategory;
  const visibleCategories = showAllCategories ? ALL_CATEGORIES : ALL_CATEGORIES.slice(0, 15);

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
      const valErr = validateImageFile(file);
      if (valErr) { setError(valErr); continue; }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(i: number) {
    URL.revokeObjectURL(previews[i]);
    setSelectedFiles(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setUploadProgress("");
    
    // 检查是否被禁言
    if (user?.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now()) {
      setError("你已被禁言，暂时无法发布内容");
      return;
    }
    
    if (!title.trim()) { setError("请输入标题"); return; }
    if (title.trim().length < 2) { setError("标题至少2个字"); return; }
    if (!content.trim()) { setError("请输入正文内容"); return; }
    if (content.trim().length < 5) { setError("内容太少了，多写点吧"); return; }
    
    const finalCat = category || detectedCategory || "趣闻";
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
        category: finalCat,
        tags,
        author: user!.name,
        isPinned: isAdmin ? isPinned : false,
        isAnnouncement: isAdmin ? isAnnouncement : false,
        views: 0,
      } as Parameters<typeof addPost>[0]);
      clearDraft();
      toast.success("发布成功！");
      setTimeout(() => router.replace("/"), 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "发布失败");
      setPosting(false);
      setUploadProgress("");
    }
  }

  return (
    <>
      <main className="min-h-screen pb-20 bg-[var(--color-bg-primary)]">
        {/* Header with back button */}
        <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
          <button type="button" onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-20 relative transition-all duration-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-xs">取消</span>
          </button>
          <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-12">
            {user?.isAdmin ? "管理员发布" : "发布内容"}
          </h1>
          <div className="w-[42px]" />
        </div>

        {/* Draft restore banner */}
        {hasDraft && (
          <div className="max-w-2xl mx-auto px-4 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📝</span>
                <p className="text-xs text-amber-300">发现未发布的草稿</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setHasDraft(false); clearDraft(); }} className="px-3 py-1 rounded-lg text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">丢弃</button>
                <button onClick={() => {
                  try {
                    const draft: Draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
                    setTitle(draft.title || ""); setContent(draft.content || "");
                    setCategory(draft.category || ""); setTags(draft.tags || []);
                    setHasDraft(false); toast.success("已恢复草稿");
                  } catch {}
                }} className="px-3 py-1 rounded-lg bg-amber-500 text-black text-[11px] font-bold">恢复草稿</button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* ADMIN: unmissable banner */}
          {isAdmin && (
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-2 border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <p className="text-sm font-bold text-amber-300">管理员发布模式</p>
                  <p className="text-[10px] text-amber-400/60">你可以使用置顶和公告功能</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsPinned(!isPinned); if (!isPinned) setIsAnnouncement(false); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isPinned
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                      : "bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]"
                  }`}
                >
                  📌 {isPinned ? "已置顶" : "置顶帖子"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAnnouncement(!isAnnouncement); if (!isAnnouncement) setIsPinned(false); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isAnnouncement
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                      : "bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]"
                  }`}
                >
                  📢 {isAnnouncement ? "已设公告" : "全站公告"}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--color-text-tertiary)] mb-6">分享你的经验、见解或故事</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="输入标题..."
                  maxLength={100}
                  className="w-full px-4 py-3 pr-16 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-tertiary)]">
                  {title.length}/100
                </span>
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="写下你想分享的内容...（系统会根据内容自动推荐分类）"
                  rows={8}
                  maxLength={5000}
                  className="w-full px-4 py-3 pb-7 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-300 resize-none"
                />
                <span className="absolute right-3 bottom-2 text-[10px] text-[var(--color-text-tertiary)]">
                  {content.length}/5000
                </span>
              </div>
            </div>

            {/* Auto-detect notice */}
            {detectedCategory && !category && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/8 border border-blue-500/15">
                <span className="text-sm">🤖</span>
                <p className="text-[11px] text-blue-400">
                  检测到可能属于「<span className="font-bold">{detectedCategory}</span>」分类
                </p>
              </div>
            )}

            {/* Category selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  选择分类 {effectiveCategory && <span className="text-[var(--color-accent)]">— 已选「{effectiveCategory}」</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleCategories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c === category ? "" : c)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 ${
                      category === c
                        ? "bg-[var(--color-accent)] text-white"
                        : detectedCategory === c && !category
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
                    }`}
                  >
                    {c}
                    {detectedCategory === c && !category && " 🤖"}
                  </button>
                ))}
                {!showAllCategories && ALL_CATEGORIES.length > 15 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(true)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] border border-dashed border-[var(--color-border-subtle)] hover:text-[var(--color-accent)]"
                  >
                    +{ALL_CATEGORIES.length - 15} 更多
                  </button>
                )}
                {showAllCategories && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(false)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                  >
                    收起
                  </button>
                )}
              </div>
            </div>

            {/* Auto-suggested tags */}
            {autoTags.length > 0 && tags.length === 0 && (
              <div>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mb-1.5">💡 推荐标签（点击添加）</p>
                <div className="flex flex-wrap gap-1">
                  {autoTags.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { if (!tags.includes(t)) setTags([...tags, t]); }}
                      className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] border border-[var(--color-accent)]/20">
                    #{t}
                    <button type="button" onClick={() => setTags(tags.filter((_, j) => j !== i))} className="ml-0.5 hover:text-white">✕</button>
                  </span>
                ))}
              </div>
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === ",") && tagInput.trim() && !tags.includes(tagInput.trim())) {
                      e.preventDefault(); setTags([...tags, tagInput.trim()]); setTagInput("");
                    }
                  }}
                  placeholder="添加标签（回车确认，最多5个）"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none"
                />
              )}
            </div>

            {/* Images */}
            <div>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-bg-hover)] group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
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
                  className="w-full py-8 rounded-xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] flex flex-col items-center justify-center gap-1 text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-300 group"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-xs">点击上传图片（最多{MAX_FILES}张）</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Progress / Error */}
            {uploadProgress && !error && (
              <div className="bg-[var(--color-accent-glow)] border border-[var(--color-accent)]/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[var(--color-accent)]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <p className="text-xs text-[var(--color-accent)]">{uploadProgress}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Boost / 推流 */}
            <div className="rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-400/5 border border-blue-500/15 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">推流推广</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">付费让你的帖子排名靠前</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/donate")}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[11px] font-bold hover:bg-blue-600 transition-all"
                >
                  去推流 →
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={posting || !title.trim() || !content.trim()}
              className="btn-primary w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              {posting ? "发布中..." : isAnnouncement ? "📢 发布全站公告" : isPinned ? "📌 发布并置顶" : "发布内容"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
