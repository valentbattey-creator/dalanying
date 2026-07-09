"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import { useData } from "@/lib/store";

const CATEGORIES = [
  { v: "", l: "全部" }, { v: "数码", l: "数码" },
  { v: "科技", l: "科技" }, { v: "汽车", l: "汽车" },
  { v: "运动", l: "运动" }, { v: "游戏", l: "游戏" },
  { v: "健身", l: "健身" }, { v: "户外", l: "户外" },
  { v: "财经", l: "财经" },
];

export default function HomePage() {
  const { posts, getPostsByCategory, loading } = useData();
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "hot">("latest");

  const filtered = getPostsByCategory(category);
  const sorted = [...filtered].sort((a, b) =>
    sortBy === "latest"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : b.likes - a.likes
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-14 bg-[var(--color-bg-primary)]">
        {/* Header */}
        <section className="max-w-3xl mx-auto px-5 pt-8 pb-2">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">发现</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {loading ? "正在加载..." : `共 ${sorted.length} 条内容`}
          </p>
        </section>

        {/* Filters */}
        <div className="max-w-3xl mx-auto px-5 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.v}
                onClick={() => setCategory(c.v)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  category === c.v
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
                }`}
              >
                {c.l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-[var(--color-bg-card)] rounded-lg p-0.5 w-fit border border-[var(--color-border-subtle)]">
            {(["latest", "hot"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all duration-300 ${
                  sortBy === s
                    ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-medium"
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                {s === "latest" ? "最新" : "最热"}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <section className="max-w-2xl mx-auto px-5 pb-12 space-y-4">
          {loading ? (
            <FeedSkeleton />
          ) : sorted.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-tertiary)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-1">
                {category ? `"${category}"分类下暂无内容` : "暂无内容"}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {category ? "换个分类看看？" : "成为第一个分享的人吧"}
              </p>
            </div>
          ) : (
            sorted.map((p, i) => (
              <div key={p.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-up">
                <PostCard post={p} />
              </div>
            ))
          )}
        </section>

        <footer className="text-center py-8 text-[11px] text-[var(--color-text-tertiary)]">
          大蓝赢 © 2026
        </footer>
      </main>
    </>
  );
}
