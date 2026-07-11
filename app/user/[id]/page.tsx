"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData, type Post } from "@/lib/store";
import { fetchProfile, type Profile } from "@/lib/data";
import PostCard from "@/components/PostCard";

type Tab = "posts" | "liked" | "saved";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { loadUserPosts, loadUserLikedPosts, loadUserSavedPosts, likedPosts, toggleLike, savedPosts, toggleSave } = useData();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [p, userPosts] = await Promise.all([
        fetchProfile(id),
        loadUserPosts(id),
      ]);
      setProfile(p);
      setPosts(userPosts);
      setLoading(false);
    }
    load();
  }, [id, loadUserPosts]);

  async function switchTab(t: Tab) {
    setTab(t);
    setLoading(true);
    if (t === "posts") {
      setPosts(await loadUserPosts(id));
    } else if (t === "liked") {
      setPosts(await loadUserLikedPosts(id));
    } else {
      setPosts(await loadUserSavedPosts(id));
    }
    setLoading(false);
  }

  function sendMessage() {
    if (!user) return;
    const existing = JSON.parse(localStorage.getItem("dalanying_dms") || "[]");
    existing.push({
      id: Date.now().toString(36),
      fromId: user.id,
      fromName: user.name,
      fromAvatar: user.avatar || "",
      toId: id,
      toName: profile?.nickname || "用户",
      content: "你好！",
      createdAt: new Date().toISOString(),
      read: false,
    });
    localStorage.setItem("dalanying_dms", JSON.stringify(existing));
    router.push("/messages");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-zinc-800 via-zinc-750 to-zinc-900" />
        <button
          onClick={() => router.push("/") }
          className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-all duration-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="px-4 -mt-10 relative z-10">
          <div className="w-20 h-20 rounded-full border-2 border-[var(--color-bg-primary)] bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile?.avatar_url || user?.avatar ? (
              <img src={profile?.avatar_url || user?.avatar || ""} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile?.nickname || user?.name || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)] mt-2">
                {profile?.nickname || user?.name || "用户"}
              </h1>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {profile?.bio || "这个人很懒，什么都没写..."}
              </p>
            </div>
            {user && user.id !== id && (
              <button
                onClick={sendMessage}
                className="mt-2 px-4 py-1.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] font-medium hover:bg-[var(--color-accent)]/20 transition-all"
              >
                💬 发消息
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b-[0.5px] border-[var(--color-border-subtle)] mt-5">
        {(["posts", "liked", "saved"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 py-3 text-[13px] font-medium transition-all duration-200 relative ${
              tab === t ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {t === "posts" ? "发布" : t === "liked" ? "赞过" : "收藏"}
            {tab === t && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--color-accent)] rounded-full" />}
          </button>
        ))}
      </div>

      <section className="px-2 pb-20 pt-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 px-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-[10px] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[var(--color-bg-hover)]" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3.5 bg-[var(--color-bg-hover)] rounded" />
                  <div className="h-2.5 bg-[var(--color-bg-hover)] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[13px] text-[var(--color-text-tertiary)]">
              {tab === "posts" ? "还没有发布过内容" : "还没有点赞过内容"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 px-1">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} isLiked={likedPosts.has(p.id)} onLike={(id) => { if (!user) { requireLogin(); return; } toggleLike(id); }} onCardClick={(id) => router.push(`/post/${id}`)} isSaved={savedPosts.has(p.id)} onSave={(id) => { if (!user) { requireLogin(); return; } toggleSave(id); }} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
