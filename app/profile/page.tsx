"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import PostCard from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import { useData } from "@/lib/store";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { posts, savedPosts, loading } = useData();
  const [tab, setTab] = useState<"posts" | "saved">("posts");

  if (authLoading) {
    return <div className="min-h-screen bg-[var(--color-bg-primary)]" />;
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  if (!user) {
    return <div className="min-h-screen bg-[var(--color-bg-primary)]" />;
  }

  const myPosts = posts.filter((p) => p.author === user.name);
  const mySaved = posts.filter((p) => savedPosts.has(p.id));
  const displayPosts = tab === "posts" ? myPosts : mySaved;

  function handleLogout() {
    logout();
    router.replace("/");
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-14 bg-[var(--color-bg-primary)]">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#6b8cff] flex items-center justify-center text-white text-xl font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-[var(--color-text-primary)] truncate">{user.name}</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">{user.email}</p>
              </div>
              <button onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-all duration-300"
              >退出</button>
            </div>
            <div className="flex gap-5 mt-5 pt-4 border-t border-[var(--color-border-subtle)]">
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{myPosts.length}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">发布</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{mySaved.length}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">收藏</p>
              </div>
            </div>
          </div>

          <div className="flex border-b border-[var(--color-border-subtle)]">
            {(["posts", "saved"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-300 ${
                  tab === t ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                }`}
              >{t === "posts" ? "发布的内容" : "收藏的内容"}</button>
            ))}
          </div>

          {loading ? <FeedSkeleton /> : displayPosts.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">{tab === "posts" ? "📝" : "🔖"}</span>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-4">
                {tab === "posts" ? "还没有发布内容" : "还没有收藏内容"}
              </p>
              {tab === "posts" && (
                <Link href="/create"
                  className="text-sm text-[var(--color-accent)] mt-3 inline-block hover:underline transition-all duration-300"
                >去发布第一条内容 →</Link>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-12">
              {displayPosts.map((p, i) => (
                <div key={p.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-up">
                  <PostCard post={p} isLiked={likedPosts.has(p.id)} onLike={(id) => { if (!currentUser) { requireLogin(); return; } toggleLike(id); }} onCardClick={(id) => router.push(`/post/${id}`)} isSaved={savedPosts.has(p.id)} onSave={(id) => { if (!currentUser) { requireLogin(); return; } toggleSave(id); }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
