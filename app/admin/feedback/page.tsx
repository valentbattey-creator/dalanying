"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Feedback {
  id: string;
  type: string;
  content: string;
  contact: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (!user.isAdmin && user.role !== "owner")) {
      toast.error("无权限访问");
      router.push("/");
      return;
    }
    loadFeedbacks();
  }, [user]);

  async function loadFeedbacks() {
    setLoading(true);
    try {
      const SB_URL = "https://aawoajhmhvysedabncoz.supabase.co";
      const SB_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";
      const res = await fetch(`${SB_URL}/rest/v1/feedbacks?select=*&order=created_at.desc&limit=100`, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data || []);
      }
    } catch {}
    setLoading(false);
  }

  const typeEmoji: Record<string, string> = { bug: "🐛", feature: "💡", other: "💬" };
  const typeLabel: Record<string, string> = { bug: "问题反馈", feature: "功能建议", other: "其他" };

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button onClick={() => { try { router.push("/admin"); } catch { window.location.href = "/admin"; } }} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">用户反馈</h1>
        <button onClick={loadFeedbacks} className="text-xs text-[var(--color-accent)]">刷新</button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12"><p className="text-sm text-[var(--color-text-tertiary)]">加载中...</p></div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-[var(--color-text-tertiary)]">暂无反馈</p>
          </div>
        ) : (
          feedbacks.map(f => (
            <div key={f.id} className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeEmoji[f.type] || "💬"}</span>
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">{typeLabel[f.type] || f.type}</span>
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{new Date(f.created_at).toLocaleString("zh-CN")}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{f.content}</p>
              <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--color-text-tertiary)]">
                <span>👤 {f.user_name || "匿名"}</span>
                {f.contact && <span>📧 {f.contact}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
