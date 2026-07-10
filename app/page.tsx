"use client";
import React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import AdCard from "@/components/AdCard";
import { useData } from "@/lib/store";

const CATEGORIES = [
  { v: "", l: "推荐" },
  { v: "数码", l: "数码" },
  { v: "汽车", l: "汽车" },
  { v: "运动", l: "运动" },
  { v: "游戏", l: "游戏" },
  { v: "健身", l: "健身" },
  { v: "户外", l: "户外" },
  { v: "财经", l: "财经" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function HomePage() {
  const { posts, loading, hasMore, loadMore, resetAndReload, searchQuery, setSearchQuery } = useData();
  const [category, setCategory] = useState("");

  // Split posts
  const announcements = posts.filter((p: { isAnnouncement?: boolean }) => p.isAnnouncement);
  const pinnedPosts = posts.filter((p: { isPinned?: boolean; isAnnouncement?: boolean }) => p.isPinned && !p.isAnnouncement);
  const regularPosts = posts.filter((p: { isPinned?: boolean; isAnnouncement?: boolean }) => !p.isPinned && !p.isAnnouncement);
  const sorted = [...regularPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortedPinned = [...pinnedPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);

  // Auto-rotate pinned carousel
  useEffect(() => {
    if (sortedPinned.length <= 1) return;
    const timer = setInterval(() => {
      setPinnedIndex(prev => (prev + 1) % sortedPinned.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [sortedPinned.length]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleCategory = useCallback((cat: string) => {
    setCategory(cat);
    resetAndReload(cat);
  }, [resetAndReload]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
    setSearchOpen(false);
  }, [searchInput, setSearchQuery]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const totalContent = sortedPinned.length + announcements.length + sorted.length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-11 bg-[var(--color-bg-primary)]">
        {/* Category pills + search */}
        <div className="sticky top-11 z-40 bg-[var(--color-bg-primary)]/92 backdrop-blur-md border-b-[0.5px] border-white/[0.04]">
          <div className="px-3 py-2 flex items-center gap-1.5">
            {searchOpen ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="搜索帖子..."
                  className="flex-1 px-3 py-1.5 rounded-full bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-default)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
                />
                <button onClick={handleSearch} className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--color-accent)] text-white text-[12px] font-medium">搜索</button>
                <button onClick={() => { setSearchOpen(false); setSearchInput(""); }} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.v}
                      onClick={() => handleCategory(c.v)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                        category === c.v
                          ? "bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]"
                          : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border-[0.5px] border-[var(--color-border-subtle)]"
                      }`}
                    >
                      {c.l}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] transition-all duration-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--color-text-secondary)]">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <section className="pb-20">
          {loading && totalContent === 0 ? (
            <div className="px-2 pt-3"><FeedSkeleton /></div>
          ) : totalContent === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-28"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <p className="text-[13px] text-[var(--color-text-tertiary)] mb-0.5">
                {searchQuery ? `没有找到"${searchQuery}"相关内容` : category ? `"${category}"分类暂无内容` : "还没有内容"}
              </p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {searchQuery ? "换个关键词试试" : category ? "换个分类看看吧" : "成为第一个分享的人"}
              </p>
            </motion.div>
          ) : (
            <>
              {/* Pinned posts carousel - full width banner style */}
              {sortedPinned.length > 0 && (
                <div className="px-2 pt-2">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-bg-card)] via-[var(--color-bg-elevated)] to-[var(--color-bg-card)] border-[0.5px] border-amber-500/20">
                    {/* Pin indicator */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-medium">
                      <span>📌</span> 置顶
                    </div>
                    
                    {/* Carousel */}
                    <div className="relative">
                      {sortedPinned.map((p, i) => (
                        <div
                          key={p.id}
                          className={`transition-all duration-500 ${
                            i === pinnedIndex ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
                          }`}
                        >
                          <div
                            onClick={() => window.location.href = `/post/${p.id}`}
                            className="flex cursor-pointer"
                          >
                            {p.images && p.images[0] && (
                              <div className="w-[100px] h-[100px] shrink-0">
                                <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            )}
                            <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] line-clamp-2 leading-snug">
                                {p.title}
                              </h3>
                              <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1 line-clamp-2">{p.content}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-[10px] text-amber-400 font-medium">点击查看 →</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dots */}
                    {sortedPinned.length > 1 && (
                      <div className="flex justify-center gap-1.5 pb-2">
                        {sortedPinned.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPinnedIndex(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              i === pinnedIndex ? "bg-amber-400 w-4" : "bg-[var(--color-bg-hover)]"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Announcements - full width special style */}
              {announcements.map((p) => (
                <div key={p.id} className="px-2 pt-2">
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[var(--color-accent)]/10 via-[var(--color-accent)]/5 to-[var(--color-accent)]/10 border-[0.5px] border-[var(--color-accent)]/30 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-[var(--color-accent)]/50"
                    onClick={() => window.location.href = `/post/${p.id}`}
                  >
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
                        <span className="text-xl">📢</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium shrink-0">公告</span>
                          <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-1">{p.title}</h3>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">{p.content}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)] shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </motion.div>
                </div>
              ))}

              {/* Regular posts grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={category + searchQuery}
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 gap-2.5 pt-3 px-2"
                >
                  {sorted.map((p, i) => (
                    <React.Fragment key={p.id}>
                      <motion.div variants={item}>
                        <PostCard post={p} />
                      </motion.div>
                      {(i + 1) % 6 === 0 && i < sorted.length - 1 && (
                        <motion.div variants={item}>
                          <AdCard index={Math.floor(i / 6)} />
                        </motion.div>
                      )}
                    </React.Fragment>
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-6 flex justify-center">
            {loading && totalContent > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            {!hasMore && totalContent > 0 && (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">— 到底啦～ —</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
