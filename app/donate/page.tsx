"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData, type Post } from "@/lib/store";
import { toast } from "sonner";

export default function DonatePage() {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { posts } = useData();
  const [tab, setTab] = useState<"boost" | "about">("boost");
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState("");
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    if (user) {
      setUserPosts(posts.filter(p => p.authorId === user.id && !p.isAnnouncement));
    }
  }, [user, posts]);

  async function handleBoost() {
    if (!user) { requireLogin(); return; }
    if (!selectedPost) { toast.error("请选择要推流的帖子"); return; }
    setBoosting(true);
    try {
      // Pin the post for 7 days
      const { dataService } = await import("@/lib/data");
      const pinnedUntil = new Date(Date.now() + 7 * 86400000).toISOString();
      const ok = await dataService.updatePost(selectedPost, { isPinned: true });
      if (ok) {
        toast.success("推流成功！帖子已置顶7天");
        setSelectedPost("");
      } else {
        toast.error("推流失败，请稍后重试");
      }
    } catch (e: any) {
      toast.error("操作失败: " + (e.message || "未知错误"));
    }
    setBoosting(false);
  }

  return (
    <main className="min-h-screen pb-20 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(9,9,11,0.85)", borderBottom: "0.5px solid var(--color-border-subtle)" }} className="h-11 flex items-center px-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">推流帖子</h1>
        <div className="w-[42px]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Tab */}
        <div className="flex gap-2 bg-[var(--color-bg-card)] rounded-xl p-1 border border-[var(--color-border-subtle)]">
          {[["boost", "🚀 推流"], ["about", "ℹ️ 说明"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === key ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "boost" && (
          <div className="space-y-4 animate-fade-up">
            {!user ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">🔐</p>
                <p className="text-sm text-[var(--color-text-tertiary)]">请先登录后再操作</p>
                <button onClick={requireLogin} className="btn-primary px-6 py-2 rounded-xl text-sm">去登录</button>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">📝</p>
                <p className="text-sm text-[var(--color-text-tertiary)]">你还没有发过帖子</p>
                <button onClick={() => router.push("/create")} className="btn-primary px-6 py-2 rounded-xl text-sm">去发帖</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">选择要推流的帖子</label>
                  <div className="mt-2 space-y-2">
                    {userPosts.map(p => (
                      <div key={p.id}
                        onClick={() => setSelectedPost(p.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border ${
                          selectedPost === p.id
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                            : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
                        }`}>
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] line-clamp-1">{p.title}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">{p.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPost && (
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">推流详情</span>
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                      <p>📌 推流后帖子将在首页置顶展示 7 天</p>
                      <p>👀 获得更多曝光和互动</p>
                    </div>
                    <button onClick={handleBoost} disabled={boosting}
                      className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all">
                      {boosting ? "处理中..." : "确认推流"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "about" && (
          <div className="animate-fade-up space-y-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">什么是推流？</h3>
              <div className="text-xs text-[var(--color-text-secondary)] space-y-2 leading-relaxed">
                <p>推流是大岚荧的帖子置顶功能。推流后，你的帖子会在首页置顶展示，获得更多曝光。</p>
                <p>每个用户可以推流自己的帖子，置顶时间为 7 天。</p>
              </div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">支持站长</h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                如果你喜欢大岚荧，可以通过打赏支持站长继续维护社区。打赏金额不影响推流功能。
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
