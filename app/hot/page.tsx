"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";

function trafficScore(p: { views?: number; likes?: number; comments?: number; createdAt: string }): number {
  const views = p.views || 0;
  const likes = p.likes || 0;
  const comments = p.comments || 0;
  const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 72);
  return (views * 1 + likes * 3 + comments * 5) * (1 + recencyBoost);
}

function heatLevel(score: number, maxScore: number): "hot" | "warm" | "new" {
  if (maxScore === 0) return "new";
  const ratio = score / maxScore;
  if (ratio > 0.6) return "hot";
  if (ratio > 0.2) return "warm";
  return "new";
}

export default function HotPage() {
  const router = useRouter();
  const { posts } = useData();

  const trending = useMemo(() => {
    const scored = posts
      .filter(p => !p.isAnnouncement)
      .map(p => ({ ...p, score: trafficScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    const maxScore = scored.length > 0 ? scored[0].score : 1;
    return scored.map(p => ({ ...p, heat: heatLevel(p.score, maxScore) }));
  }, [posts]);

  // Extract trending tags
  const trendingTags = useMemo(() => {
    const tagMap = new Map<string, { count: number; score: number }>();
    posts.filter(p => !p.isAnnouncement).forEach(p => {
      (p.tags || []).forEach(tag => {
        const existing = tagMap.get(tag) || { count: 0, score: 0 };
        tagMap.set(tag, { count: existing.count + 1, score: existing.score + trafficScore(p) });
      });
    });
    return [...tagMap.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 10)
      .map(([tag, data]) => ({ tag, ...data }));
  }, [posts]);

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]" style={{ paddingTop: "16px", paddingBottom: "80px" }}>
      <div className="max-w-lg mx-auto px-4">

        {/* Hot Search Keywords */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔥</span>
            <h1 className="text-base font-bold text-[var(--color-text-primary)]">热搜榜</h1>
          </div>
          <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
            {trending.map((post, i) => (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-all border-b border-[var(--color-border-subtle)]"
                style={{ borderBottomWidth: i === trending.length - 1 ? 0 : undefined }}
              >
                {/* Rank number */}
                <span className={`text-sm font-bold w-5 text-center shrink-0 ${
                  i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
                }`}>
                  {i + 1}
                </span>

                {/* Title and meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">{post.author}</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">·</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">❤️ {post.likes || 0}</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">👁 {post.views || 0}</span>
                  </div>
                </div>

                {/* Heat badge */}
                {post.heat === "hot" && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/15 text-red-400">热</span>
                )}
                {post.heat === "warm" && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400">温</span>
                )}
              </div>
            ))}
            {trending.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">暂无热门内容</p>
              </div>
            )}
          </div>
        </div>

        {/* Trending Tags */}
        {trendingTags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🏷</span>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">热门话题</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((t, i) => (
                <button
                  key={t.tag}
                  onClick={() => router.push(`/?q=${encodeURIComponent(t.tag)}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  style={{ backgroundColor: "var(--color-bg-card, #18181b)", border: "1px solid var(--color-border-subtle, #27272a)", color: "var(--color-text-secondary, #a1a1aa)" }}
                >
                  <span className={`text-[10px] font-bold ${i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`}>#{i + 1}</span>
                  <span>{t.tag}</span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">{t.count}篇</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
