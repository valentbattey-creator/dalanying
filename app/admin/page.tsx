"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { type Profile } from "@/lib/data";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { banUser, unbanUser, fetchAllProfiles, createAnnouncement } = useData();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceContent, setAnnounceContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) { router.replace("/"); return; }
    loadUsers();
  }, [user]);

  async function loadUsers() {
    const all = await fetchAllProfiles();
    setUsers(all);
    setLoading(false);
  }

  async function handleBan(userId: string, days: number) {
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const ok = await banUser(userId, until);
    if (ok) { toast.success(`已禁言 ${days} 天`); loadUsers(); }
    else toast.error("操作失败");
  }

  async function handleUnban(userId: string) {
    const ok = await unbanUser(userId);
    if (ok) { toast.success("已解禁"); loadUsers(); }
    else toast.error("操作失败");
  }

  async function handleAnnounce(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !announceTitle.trim() || !announceContent.trim()) return;
    setPosting(true);
    const post = await createAnnouncement({
      title: announceTitle.trim(),
      content: announceContent.trim(),
      images: [], category: "数码", tags: ["公告"],
      author: user.name, authorId: user.id, authorAvatar: user.avatar, isPinned: true, isAnnouncement: true,
    });
    if (post) {
      toast.success("公告已发布！");
      setAnnounceTitle("");
      setAnnounceContent("");
      setShowAnnounce(false);
    } else {
      toast.error("发布失败");
    }
    setPosting(false);
  }

  if (!user?.isAdmin) return null;

  const now = Date.now();

  return (
    <main className="min-h-screen pb-24 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all duration-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">管理后台</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Announcement */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          {showAnnounce ? (
            <form onSubmit={handleAnnounce} className="p-4 space-y-3">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">发布公告</p>
              <input
                value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)}
                placeholder="公告标题" maxLength={50}
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-all duration-200"
              />
              <textarea
                value={announceContent} onChange={e => setAnnounceContent(e.target.value)}
                placeholder="公告内容..." rows={3} maxLength={500}
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-all duration-200 resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={posting || !announceTitle.trim()}
                  className="btn-primary flex-1 py-2 rounded-lg text-xs disabled:opacity-40">发布公告</button>
                <button type="button" onClick={() => setShowAnnounce(false)}
                  className="flex-1 py-2 rounded-lg bg-[var(--color-bg-hover)] text-xs text-[var(--color-text-secondary)]">取消</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAnnounce(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-[var(--color-bg-hover)] transition-all duration-200">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-lg">📢</div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">发布公告</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">公告将置顶显示在首页</p>
              </div>
            </button>
          )}
        </div>

        {/* User management */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b-[0.5px] border-[var(--color-border-subtle)]">
            <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              用户管理 ({users.length}人)
            </p>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-[var(--color-text-tertiary)]">加载中...</div>
          ) : (
            <div className="divide-y-[0.5px] divide-[var(--color-border-subtle)] max-h-[60vh] overflow-y-auto">
              {users.map(u => {
                const isBanned = u.banned_until && new Date(u.banned_until).getTime() > now;
                return (
                  <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.nickname.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{u.nickname}</p>
                          {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium">管理</span>}
                          {isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">禁言</span>}
                        </div>
                      </div>
                    </div>
                    {!u.is_admin && (
                      isBanned ? (
                        <button onClick={() => handleUnban(u.id)}
                          className="text-[11px] text-green-400 hover:underline shrink-0">解禁</button>
                      ) : (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleBan(u.id, 1)}
                            className="text-[11px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">禁言1天</button>
                          <button onClick={() => handleBan(u.id, 7)}
                            className="text-[11px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">7天</button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className="p-6 text-center text-sm text-[var(--color-text-tertiary)]">暂无用户</div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
