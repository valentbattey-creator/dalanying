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
  const regularPosts = posts.filter((p: { isAnnouncement?: boolean }) => !p.isAnnouncement);
  const sorted = [...regularPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Initial load with category
  const handleCategory = useCallback((cat: string) => {
    setCategory(cat);
    resetAndReload(cat);
  }, [resetAndReload]);

  // Search
  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
    setSearchOpen(false);
  }, [searchInput, setSearchQuery]);

  // Focus search input
  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-11 bg-[var(--color-bg-primary)]">
        {/* Category pills + search */}
        <div className="sticky top-11 z-40 bg-[var(--color-bg-primary)]/92 backdrop-blur-md border-b-[0.5px] border-white/[0.04]">
          <div className="px-3 py-2 flex items-center gap-1.5">
            {/* Search toggle */}
            {searchOpen ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="搜索帖子..."
                  className="flex-1 px-3 py-1.5 rounded-full bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-default)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all duration-200"
                />
                <button onClick={handleSearch} className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--color-accent)] text-white text-xs font-medium">搜索</button>
                <button onClick={() => { setSearchOpen(false); setSearchInput(""); setSearchQuery(""); }} className="shrink-0 px-2 py-1.5 text-[var(--color-text-tertiary)] text-xs">取消</button>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.v}
                      onClick={() => handleCategory(c.v)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        category === c.v
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[0.5px] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
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

        {/* Posts grid */}
        <section className="px-2 pb-20">
          {loading && (sorted.length + announcements.length) === 0 ? (
            <div className="px-1 pt-3"><FeedSkeleton /></div>
          ) : (sorted.length + announcements.length) === 0 ? (
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
            <AnimatePresence mode="wait">
              <motion.div
                key={category + searchQuery}
                variants={container}
                initial="hidden"
                animate="show"
className="grid grid-cols-2 gap-2.5 pt-3 px-1"
              >
                {/* Announcements - full width */}
                {announcements.map((p) => (
                  <motion.div key={p.id} variants={item} className="col-span-2">
                    <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-accent)]/30 rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[var(--color-accent)]/50" onClick={() => window.location.href = `/post/${p.id}`}>
                      <div className="px-3 py-2.5 flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium shrink-0">📢 公告</span>
                        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] line-clamp-1">{p.title}</h3>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {sorted.map((p, i) => (
                  <React.Fragment key={p.id}>
                    <motion.div variants={item}>
                      <PostCard post={p} />
                    </motion.div>
                    {/* Insert ad every 6 posts */}
                    {(i + 1) % 6 === 0 && i < posts.length - 1 && (
                      <motion.div variants={item}>
                        <AdCard index={Math.floor(i / 6)} />
                      </motion.div>
                    )}
                  </React.Fragment>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-6 flex justify-center">
            {loading && (sorted.length + announcements.length) > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            {!hasMore && (sorted.length + announcements.length) > 0 && (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">— 到底啦～ —</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
