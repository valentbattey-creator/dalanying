"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/lib/auth";

function trafficScore(p: { views?: number; likes?: number; comments?: number; createdAt: string }): number {
  const views = p.views || 0;
  const likes = p.likes || 0;
  const comments = p.comments || 0;
  const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 72);
  return (views * 1 + likes * 3 + comments * 5) * (1 + recencyBoost);
}

export default function HotPage() {
  const router = useRouter();
  const { posts, likedPosts, toggleLike, savedPosts, toggleSave, deletePost } = useData();
  const { user, requireLogin, guestLikes } = useAuth();

  const trendingPosts = useMemo(() => {
    return [...posts]
      .filter(p => !p.isAnnouncement)
      .map(p => ({ ...p, score: trafficScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [posts]);

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]" style={{ paddingTop: "16px", paddingBottom: "80px" }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔥</span>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">热门内容</h1>
          <span className="text-xs text-[var(--color-text-tertiary)] ml-auto">按互动热度排序</span>
        </div>

        {/* Posts */}
        {trendingPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm text-[var(--color-text-tertiary)]">暂无热门内容</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trendingPosts.map((post, i) => (
              <div key={post.id} className="relative">
                {/* Rank badge */}
                {i < 3 && (
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{
                      background: i === 0 ? "linear-gradient(135deg, #ffd700, #ffaa00)" : i === 1 ? "linear-gradient(135deg, #c0c0c0, #a0a0a0)" : "linear-gradient(135deg, #cd7f32, #b8860b)",
                      color: "#fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    }}>
                    {i + 1}
                  </div>
                )}
                <PostCard
                  post={post}
                  isLiked={likedPosts.has(post.id) || guestLikes.has(post.id)}
                  isSaved={savedPosts.has(post.id)}
                  onLike={() => toggleLike(post.id)}
                  onSave={() => toggleSave(post.id)}
                  onDelete={() => deletePost(post.id)}
                  onCardClick={(id) => router.push(`/post/${id}`)}
                  currentUserId={user?.id}
                  isAdmin={user?.isAdmin}
                  isOwner={user?.role === "owner"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
