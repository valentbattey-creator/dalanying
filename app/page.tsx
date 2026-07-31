"use client";
import React from "react";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import AdCard from "@/components/AdCard";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { searchUsers } from "@/lib/data";
import { TinyAvatar } from "@/components/UserAvatar";

const ALL_CATEGORIES = [
  "推荐", "月落", "浮生", "缘渡", "清谈", "修行",
  "数码", "科技", "汽车", "运动", "游戏", "健身",
  "户外", "财经", "美食", "旅游", "穿搭", "机车", "摄影",
  "宠物", "篮球", "足球", "音乐", "电影", "动漫", "格斗",
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// Traffic score: views*1 + likes*3 + comments*5, with 24h recency boost
function trafficScore(p: { views?: number; likes?: number; comments?: number; createdAt: string }): number {
  const views = p.views || 0;
  const likes = p.likes || 0;
  const comments = p.comments || 0;
  const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 72);
  return (views * 1 + likes * 3 + comments * 5) * (1 + recencyBoost);
}

export default function HomePage() {
  const router = useRouter();
  const { posts, loading, hasMore, loadMore, resetAndReload, searchQuery, setSearchQuery, likedPosts, toggleLike, savedPosts, toggleSave, deletePost } = useData();
  const { user, requireLogin, guestLikes } = useAuth();
  const FIXED_CATS = ["推荐", "月落", "浮生", "缘渡", "清谈", "修行"];
  const [customCats, setCustomCats] = useState<string[]>([...FIXED_CATS]);
  const [activeCat, setActiveCat] = useState("推荐");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showTrending, setShowTrending] = useState(false);

  // Split and sort posts
  const announcements = posts.filter((p: any) => p.isAnnouncement);
  const pinnedPosts = posts.filter((p: any) => p.isPinned && !p.isAnnouncement);
  const regularPosts = posts.filter((p: any) => !p.isPinned && !p.isAnnouncement);

  // Filter by category
  const filteredRegular = activeCat === "推荐"
    ? [...regularPosts]
    : regularPosts.filter((p: any) => p.category === activeCat);

  // Sort by creation date only
  const sorted = [...filteredRegular].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sortedPinned = [...pinnedPosts].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Trending posts - top 10 by traffic score
  const trendingPosts = useMemo(() => {
    return [...regularPosts]
      .map(p => ({ ...p, score: trafficScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [regularPosts]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);

  useEffect(() => {
    if (sortedPinned.length <= 1) return;
    const timer = setInterval(() => setPinnedIndex(prev => (prev + 1) % sortedPinned.length), 4000);
    return () => clearInterval(timer);
  }, [sortedPinned.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, [setSearchQuery]);

  const totalContent = sortedPinned.length + announcements.length + sorted.length;

  function toggleCat(cat: string) {
    if (FIXED_CATS.includes(cat)) { setActiveCat(cat); return; }
    if (cat === "推荐") {
      setCustomCats(["推荐"]);
      setActiveCat("推荐");
      return;
    }
    setActiveCat(cat);
    if (!customCats.includes(cat)) {
      setCustomCats([...customCats.filter(c => c !== "推荐"), cat]);
    }
  }

  return (
    <>
      <Navbar onSearch={handleSearch} />
      
      {/* Fixed Category Bar - 明确放在 Navbar 下面 */}
      <div className="fixed left-0 right-0 z-40" style={{ top: "48px", backgroundColor: "var(--color-bg-secondary, #121214)", borderBottom: "1px solid var(--color-border-subtle, #27272a)", WebkitTransform: "translateZ(0)", transform: "translateZ(0)", zIndex: 40 }}>
        <div className="max-w-6xl mx-auto px-2 py-2 flex items-center gap-1.5" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {customCats.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 px-5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                activeCat === cat
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
              }`}
              style={activeCat !== cat ? { backgroundColor: "var(--color-bg-card, #18181b)", border: "1px solid var(--color-border-subtle, #27272a)" } : {}}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setShowCatPicker(!showCatPicker)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all text-sm"
            style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}
          >
            {showCatPicker ? "✕" : "+"}
          </button>
        </div>

        {/* Category picker dropdown */}
        {showCatPicker && (
          <div className="max-w-6xl mx-auto px-2 pb-2 flex flex-wrap gap-1.5 animate-fade-up">
            {ALL_CATEGORIES.filter(c => !customCats.includes(c)).map(cat => (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className="px-2.5 py-1 rounded-full text-[11px] text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
                style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}
              >
                + {cat}
              </button>
            ))}
            {customCats.filter(c => c !== "推荐").length > 0 && (
              <button
                onClick={() => { setCustomCats(["推荐"]); setActiveCat("推荐"); setShowCatPicker(false); }}
                className="px-2.5 py-1 rounded-full text-[11px] text-red-400 hover:bg-red-500/10 transition-all"
                style={{ border: "1px solid rgba(248,113,113,0.3)" }}
              >
                重置
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sunshine Hero Banner */}
      <div className="mx-3 mt-3 mb-1 rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 30%, #60a5fa 60%, #93c5fd 100%)", marginTop: "100px" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-5 py-6 flex flex-col items-center text-center">
          <div>
            <p className="text-white/50 text-[9px] font-medium tracking-[0.2em] uppercase mb-2">WELCOME TO DALANYING</p>
            <h2 className="text-6xl text-white tracking-wide" style={{ fontFamily: "'Dancing Script', 'Pacifico', 'Great Vibes', cursive" }}>Sunshine</h2>
            <p className="text-white/40 text-xs mt-2">发现生活的每一种可能</p>
          </div>
        </div>
      </div>

      <main className="min-h-screen bg-[var(--color-bg-primary)]" style={{ paddingTop: "20px" }}>
        <div className="max-w-6xl mx-auto flex gap-4 px-3 sm:px-4">
          {/* Main content */}
          <section className="flex-1 min-w-0">
            {totalContent === 0 && !loading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--color-bg-card)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <p className="text-[13px] text-[var(--color-text-tertiary)] mb-0.5">
                  {searchQuery ? `没有找到"${searchQuery}"相关内容` : activeCat !== "推荐" ? `"${activeCat}"分类暂无内容` : "还没有内容"}
                </p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">成为第一个分享的人</p>
              </motion.div>
            ) : (
              <>
                {/* Pinned posts */}
                {sortedPinned.map((p) => (
                  <div key={p.id} className="px-1 pt-2">
                    <div onClick={() => router.push(`/post/${p.id}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all" style={{ background: "linear-gradient(to right, rgba(245,158,11,0.1), rgba(245,158,11,0.05), transparent)", border: "0.5px solid rgba(245,158,11,0.2)" }}>
                      <span className="text-base shrink-0">📌</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-1">{p.title}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-1 mt-0.5">{p.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                        <span>❤️{p.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Announcements */}
                {announcements.map((p) => (
                  <div key={p.id} className="px-1 pt-2">
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl overflow-hidden cursor-pointer"
                      style={{ background: "linear-gradient(to right, rgba(245,158,11,0.1), rgba(245,158,11,0.05), rgba(245,158,11,0.1))", border: "0.5px solid rgba(245,158,11,0.25)" }}
                      onClick={() => router.push(`/post/${p.id}`)}>
                      <div className="px-4 py-3 flex items-center gap-3">
                        <span className="text-xl shrink-0">📢</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>公告</span>
                            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-1">{p.title}</h3>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}

                {/* Post grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                    {sorted.map((p, i) => (
                      <React.Fragment key={p.id}>
                        <div className="mb-2.5" style={{ animation: "fadeInUp 0.3s ease both", animationDelay: `${(i % 10) * 40}ms` }}><PostCard post={p} isLiked={likedPosts.has(p.id) || guestLikes.has(p.id)} onLike={(id) => { toggleLike(id); }} onCardClick={(id) => router.push(`/post/${id}`)} isSaved={savedPosts.has(p.id)} onSave={(id) => { if (!user) { requireLogin(); return; } toggleSave(id); }} onDelete={(id) => deletePost(id)} currentUserId={user?.id} isOwner={user?.role === "owner"} isAdmin={user?.isAdmin} /></div>
                        {(i + 1) % 6 === 0 && i < sorted.length - 1 && (
                          <div><AdCard index={Math.floor(i / 6)} /></div>
                        )}
                      </React.Fragment>
                    ))}
                </div>
              </>
            )}

            <div ref={sentinelRef} className="py-6 flex justify-center">
              {loading && totalContent > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              {!hasMore && totalContent > 0 && <p className="text-[11px] text-[var(--color-text-tertiary)]">— 到底啦～ —</p>}
            </div>
          </section>

          {/* Sidebar - Trending (hidden on mobile) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 self-start">
            {/* Trending section */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-bg-card)", border: "0.5px solid var(--color-border-subtle)" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">热门榜单</span>
                </div>
                <button onClick={() => setShowTrending(!showTrending)} className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all">
                  {showTrending ? "收起" : "展开"}
                </button>
              </div>
              <div className="py-1">
                {trendingPosts.slice(0, showTrending ? 10 : 5).map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/post/${p.id}`)}
                    className="px-4 py-2.5 flex items-start gap-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-all"
                  >
                    <span className={`text-[12px] font-bold w-4 text-center shrink-0 mt-0.5 ${i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)] line-clamp-2 leading-relaxed">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">{p.author}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">·</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">❤️ {p.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {trendingPosts.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">暂无热门内容</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "var(--color-bg-card)", border: "0.5px solid var(--color-border-subtle)" }}>
              <div className="flex flex-wrap gap-1.5">
                {["月落", "浮生", "缘渡", "清谈", "修行", "数码", "汽车", "游戏"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCat(cat); if (!customCats.includes(cat)) setCustomCats(prev => [...prev, cat]); }}
                    className="px-2.5 py-1 rounded-full text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all"
                    style={{ backgroundColor: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 px-3 py-2 text-center">
              <p className="text-[10px] text-[var(--color-text-tertiary)]">大岚荧 · 发现你的兴趣世界</p>
              <p className="text-[9px] text-[var(--color-text-tertiary)] mt-1">© 2026 dalanying.work</p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
