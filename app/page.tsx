"use client";
import React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import AdCard from "@/components/AdCard";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";

const ALL_CATEGORIES = [
  "推荐", "谈婚论嫁", "思维探讨", "数码", "科技", "汽车", "运动", "游戏", "健身",
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
  const recencyBoost = Math.max(0, 1 - ageHours / 72); // decays over 72 hours
  return (views * 1 + likes * 3 + comments * 5) * (1 + recencyBoost);
}

export default function HomePage() {
  const router = useRouter();
  const { posts, loading, hasMore, loadMore, resetAndReload, searchQuery, setSearchQuery, likedPosts, toggleLike, savedPosts, toggleSave } = useData();
  const { user, requireLogin } = useAuth();
  const FIXED_CATS = ["推荐", "思维探讨", "数码"];
  const [customCats, setCustomCats] = useState<string[]>([...FIXED_CATS]);
  const [activeCat, setActiveCat] = useState("推荐");
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Split and sort posts
  const announcements = posts.filter((p: any) => p.isAnnouncement);
  const pinnedPosts = posts.filter((p: any) => p.isPinned && !p.isAnnouncement);
  const regularPosts = posts.filter((p: any) => !p.isPinned && !p.isAnnouncement);

  // Filter by category
  const filteredRegular = activeCat === "推荐"
    ? [...regularPosts]
    : regularPosts.filter((p: any) => p.category === activeCat);

  // Sort by traffic (recommendation) or date
  const sorted = [...filteredRegular].sort((a, b) => {
    if (activeCat === "推荐") {
      return trafficScore(b) - trafficScore(a);
    }
    return trafficScore(b) - trafficScore(a);
  });

  const sortedPinned = [...pinnedPosts].sort((a, b) => trafficScore(b) - trafficScore(a));

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
      <main className="min-h-screen pt-11 bg-[var(--color-bg-primary)]">
        {/* Category pills */}
        <div className="sticky top-11 z-40 bg-[var(--color-bg-primary)]/92 backdrop-blur-md border-b-[0.5px] border-white/[0.04]">
          <div className="px-2 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {customCats.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  activeCat === cat
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]"
                    : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[0.5px] border-[var(--color-border-subtle)]"
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setShowCatPicker(!showCatPicker)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all text-sm"
            >
              {showCatPicker ? "✕" : "+"}
            </button>
          </div>

          {/* Category picker dropdown */}
          {showCatPicker && (
            <div className="px-2 pb-2 flex flex-wrap gap-1 animate-fade-up">
              {ALL_CATEGORIES.filter(c => !customCats.includes(c)).map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] border-[0.5px] border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
                >
                  + {cat}
                </button>
              ))}
              {customCats.filter(c => c !== "推荐").length > 0 && (
                <button
                  onClick={() => setCustomCats(["推荐"])}
                  className="px-2.5 py-1 rounded-full text-[10px] text-red-400 hover:bg-red-400/10 transition-all"
                >
                  重置
                </button>
              )}
            </div>
          )}
        </div>


        {/* Sunshine Hero Banner */}
        <div className="mx-3 mt-3 mb-1 rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 30%, #60a5fa 60%, #93c5fd 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative px-5 py-6 flex flex-col items-center text-center">
            <div>
              <p className="text-white/50 text-[9px] font-medium tracking-[0.2em] uppercase mb-2">WELCOME TO DALANYING</p>
              <h2 className="text-6xl font-['Dancing_Script',_'Pacifico',_'Great_Vibes',_cursive] text-white tracking-wide" style={{ fontFamily: "'Dancing Script', 'Pacifico', 'Great Vibes', cursive" }}>Sunshine</h2>
              <p className="text-white/40 text-xs mt-2">发现生活的每一种可能</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="pb-20">
          {/* Active search indicator */}
          {searchQuery && (
            <div className="px-3 py-2 flex flex-col items-center text-center bg-[var(--color-bg-card)] border-b-[0.5px] border-[var(--color-border-subtle)]">
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                搜索：<span className="font-medium text-[var(--color-text-primary)]">"{searchQuery}"</span>
                <span className="text-[var(--color-text-tertiary)] ml-1">— {totalContent} 条结果</span>
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-[var(--color-accent)] hover:underline px-2 py-1"
              >
                清除 ✕
              </button>
            </div>
          )}

          {loading && totalContent === 0 ? (
            <div className="px-2 pt-3"><FeedSkeleton /></div>
          ) : totalContent === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-28">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <p className="text-[13px] text-[var(--color-text-tertiary)] mb-0.5">
                {searchQuery ? `没有找到"${searchQuery}"相关内容` : activeCat !== "推荐" ? `"${activeCat}"分类暂无内容` : "还没有内容"}
              </p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">成为第一个分享的人</p>
            </motion.div>
          ) : (
            <>
              {/* Pinned carousel */}
              {sortedPinned.length > 0 && (
                <div className="px-2 pt-2">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-bg-card)] via-[var(--color-bg-elevated)] to-[var(--color-bg-card)] border-[0.5px] border-amber-500/20">
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-medium">
                      <span>📌</span> 置顶
                    </div>
                    {sortedPinned.map((p, i) => (
                      <div key={p.id} className={`transition-all duration-500 ${i === pinnedIndex ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}>
                        <div onClick={() => router.push(`/post/${p.id}`)} className="flex cursor-pointer">
                          {p.images?.[0] && <div className="w-[100px] h-[100px] shrink-0"><img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" /></div>}
                          <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] line-clamp-2 leading-snug">{p.title}</h3>
                            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1 line-clamp-2">{p.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-tertiary)]">
                              <span>👁 {p.views || 0}</span>
                              <span>❤️ {p.likes || 0}</span>
                              <span>💬 {p.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sortedPinned.length > 1 && (
                      <div className="flex justify-center gap-1.5 pb-2">
                        {sortedPinned.map((_, i) => (
                          <button key={i} onClick={() => setPinnedIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === pinnedIndex ? "bg-amber-400 w-4" : "bg-[var(--color-bg-hover)]"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Announcements */}
              {announcements.map((p) => (
                <div key={p.id} className="px-2 pt-2">
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[var(--color-accent)]/10 via-[var(--color-accent)]/5 to-[var(--color-accent)]/10 border-[0.5px] border-[var(--color-accent)]/30 rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/post/${p.id}`)}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <span className="text-xl shrink-0">📢</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium shrink-0">公告</span>
                          <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-1">{p.title}</h3>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}

              {/* Post grid */}
              <AnimatePresence mode="wait">
                <motion.div key={activeCat + searchQuery} variants={container} initial="hidden" animate="show" className="columns-2 gap-2.5 pt-3 px-2 [column-fill:balance]" style={{ columnFill: "balance" } as React.CSSProperties}>
                  {sorted.map((p, i) => (
                    <React.Fragment key={p.id}>
                      <motion.div variants={item} className="break-inside-avoid mb-2.5"><PostCard post={p} isLiked={likedPosts.has(p.id)} onLike={(id) => { if (!user) { requireLogin(); return; } toggleLike(id); }} onCardClick={(id) => router.push(`/post/${id}`)} isSaved={savedPosts.has(p.id)} onSave={(id) => { if (!user) { requireLogin(); return; } toggleSave(id); }} /></motion.div>
                      {(i + 1) % 6 === 0 && i < sorted.length - 1 && (
                        <motion.div variants={item}><AdCard index={Math.floor(i / 6)} /></motion.div>
                      )}
                    </React.Fragment>
                  ))}
                </motion.div>
              </AnimatePresence>
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
      </main>
    </>
  );
}
