"use client";
import React from "react";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import PostCard from "@/components/PostCard";
import PostDetailModal from "@/components/PostDetailModal";
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
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
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

  // Filter by category (memoized)
  const filteredRegular = useMemo(() => activeCat === "推荐"
    ? [...regularPosts]
    : regularPosts.filter((p: any) => p.category === activeCat), [activeCat, regularPosts]);

  // Sort by creation date only (stable sort with id fallback)
  const sorted = useMemo(() => [...filteredRegular].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id); // Stable fallback
  }), [filteredRegular]);

  const sortedPinned = useMemo(() => [...pinnedPosts].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  }), [pinnedPosts]);

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

  // Announcement data ready for AnnouncementBar component

  return (
    <>
      <Navbar onSearch={handleSearch} />

      {/* ── Announcement Bar ── */}
      {announcements.length > 0 && (
        <>
          {/* PC version - fixed at 48px */}
          <div className="hidden md:block" style={{ position: "fixed", left: 0, right: 0, top: "48px", zIndex: 45 }}>
            <AnnouncementBar announcements={announcements.map(a => ({ id: a.id, title: a.title, content: a.content }))} />
          </div>
          {/* Mobile version - fixed at 56px (after mobile topbar) */}
          <div className="md:hidden" style={{ position: "fixed", left: 0, right: 0, top: "56px", zIndex: 45 }}>
            <AnnouncementBar announcements={announcements.map(a => ({ id: a.id, title: a.title, content: a.content }))} />
          </div>
        </>
      )}

      {/* ── Category Bar: underline tabs ── */}
      <div className="sticky left-0 right-0 z-40" style={{
        top: announcements.length > 0 ? "80px" : "48px",
        backgroundColor: "var(--color-bg-primary)",
        borderBottom: "0.5px solid var(--color-border-subtle)",
      }}>
        <div className="max-w-7xl mx-auto px-3 flex items-center gap-0" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {customCats.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className="shrink-0 px-4 py-2.5 text-[13px] font-medium transition-all duration-200 relative"
              style={{
                color: activeCat === cat ? "var(--color-accent)" : "var(--color-text-tertiary)",
                fontWeight: activeCat === cat ? 600 : 400,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {cat}
              {activeCat === cat && (
                <span style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: "var(--color-accent)",
                }} />
              )}
            </button>
          ))}
          <button
            onClick={() => setShowCatPicker(!showCatPicker)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all text-sm ml-1"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {showCatPicker ? "✕" : "+"}
          </button>
        </div>

        {/* Category picker dropdown */}
        {showCatPicker && (
          <div className="max-w-7xl mx-auto px-3 pb-2 flex flex-wrap gap-1.5 animate-fade-up">
            {ALL_CATEGORIES.filter(c => !customCats.includes(c)).map(cat => (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className="px-2.5 py-1 rounded-full text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all"
                style={{ backgroundColor: "var(--color-bg-card)", border: "0.5px solid var(--color-border-subtle)", cursor: "pointer" }}
              >
                + {cat}
              </button>
            ))}
            {customCats.filter(c => c !== "推荐").length > 0 && (
              <button
                onClick={() => { setCustomCats(["推荐"]); setActiveCat("推荐"); setShowCatPicker(false); }}
                className="px-2.5 py-1 rounded-full text-[11px] text-red-400 hover:bg-red-500/10 transition-all"
                style={{ border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer", background: "none" }}
              >
                重置
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main Layout: 7:3 ratio ── */}
      <main style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-primary)",
        paddingTop: `calc(${announcements.length > 0 ? "88px" : "56px"} + env(safe-area-inset-top, 0px))`,
      }}>
        <div className="max-w-7xl mx-auto flex px-3 sm:px-4" style={{ gap: 20 }}>
          {/* ── Main content: 70% ── */}
          <section className="min-w-0" style={{ flex: 7, paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>

            {/* Sunshine Hero Banner - responsive */}
            {/* Mobile banner (< lg): blue gradient, rounded, side margins, centered text */}
            <div className="banner-mobile" style={{
              marginTop: 12, marginBottom: 12,
              borderRadius: 16, overflow: "hidden", position: "relative",
              background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 40%, #60a5fa 70%, #93c5fd 100%)",
            }}>
              <div style={{ position: "relative", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 100 }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>WELCOME TO DALANYING</p>
                <h2 style={{ fontSize: 42, color: "#fff", letterSpacing: "0.05em", fontFamily: "'Dancing Script', 'Pacifico', 'Great Vibes', cursive" }}>Sunshine</h2>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8 }}>发现生活的每一种可能</p>
              </div>
            </div>
            {/* PC banner (>= lg): glass-morphism, rounded, centered text */}
            <div className="banner-pc" style={{
              marginTop: 16, marginBottom: 16,
              borderRadius: 24, overflow: "hidden", position: "relative", minHeight: 120,
              background: "rgba(59, 130, 246, 0.12)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}>
              <div style={{ position: "relative", padding: "24px 48px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 120 }}>
                <p style={{ color: "var(--color-text-tertiary)", fontSize: 10, fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12 }}>WELCOME TO DALANYING</p>
                <h2 style={{ fontSize: 48, color: "var(--color-text-primary)", letterSpacing: "0.05em", marginBottom: 8, fontFamily: "'Dancing Script', 'Pacifico', 'Great Vibes', cursive" }}>Sunshine</h2>
                <p style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>发现生活的每一种可能</p>
              </div>
            </div>

            <div style={{ height: 16 }} />

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
                  <div key={p.id} className="px-1 pt-2 pb-1">
                    <div onClick={() => router.push(`/post/${p.id}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all" style={{ background: "linear-gradient(to right, rgba(245,158,11,0.08), rgba(245,158,11,0.03), transparent)", border: "0.5px solid rgba(245,158,11,0.15)" }}>
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

                {/* Post grid - CSS columns masonry */}
                <div className="post-masonry" style={{ paddingTop: 8 }}>
                  {sorted.map((p, i) => (
                    <React.Fragment key={p.id}>
                      <div style={{ breakInside: "avoid", marginBottom: 8, animation: "fadeInUp 0.3s ease both", animationDelay: `${(i % 10) * 40}ms` }}>
                        <PostCard post={p} isLiked={likedPosts.has(p.id) || guestLikes.has(p.id)} onLike={(id) => { toggleLike(id); }} onCardClick={(id) => setSelectedPostId(id)} isSaved={savedPosts.has(p.id)} onSave={(id) => { if (!user) { requireLogin(); return; } toggleSave(id); }} onDelete={(id) => deletePost(id)} currentUserId={user?.id} isOwner={user?.role === "owner"} isAdmin={user?.isAdmin} />
                      </div>
                      {(i + 1) % 6 === 0 && i < sorted.length - 1 && (
                        <div style={{ breakInside: "avoid", marginBottom: 8 }}><AdCard index={Math.floor(i / 6)} /></div>
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

          {/* ── Sidebar: 30% (hidden on mobile) ── */}
          <aside className="hidden lg:block shrink-0 sticky top-24 self-start" style={{ flex: 3, maxWidth: 320 }}>
            {/* Trending section */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-bg-card)", border: "0.5px solid var(--color-border-subtle)" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">热门榜单</span>
                </div>
                <button onClick={() => setShowTrending(!showTrending)} className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all" style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {showTrending ? "收起" : "展开"}
                </button>
              </div>
              <div className="py-1">
                {trendingPosts.slice(0, showTrending ? 10 : 5).map((p, i) => (
                  <div key={p.id} onClick={() => router.push(`/post/${p.id}`)}
                    className="px-4 py-2.5 flex items-start gap-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-all">
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
                  <button key={cat}
                    onClick={() => { setActiveCat(cat); if (!customCats.includes(cat)) setCustomCats(prev => [...prev, cat]); }}
                    className="px-2.5 py-1 rounded-full text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all"
                    style={{ backgroundColor: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)", cursor: "pointer" }}>
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

        {/* Post Detail Modal */}
        {selectedPostId && (
          <PostDetailModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
        )}
      </main>
    </>
  );
}
