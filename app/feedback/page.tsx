"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function FeedbackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [type, setType] = useState("bug");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { toast.error("请填写反馈内容"); return; }
    setSubmitting(true);
    
    // Store in localStorage for now
    const feedbacks = JSON.parse(localStorage.getItem("dalanying_feedbacks") || "[]");
    feedbacks.push({
      id: Date.now().toString(36),
      type,
      content: content.trim(),
      contact: contact.trim(),
      userId: user?.id || "anonymous",
      userName: user?.name || "匿名",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("dalanying_feedbacks", JSON.stringify(feedbacks));
    
    // Also try to save to Supabase
    try {
      const { supabase, hasSupabase } = await import("@/lib/supabase");
      if (hasSupabase && supabase) {
        await supabase.from("feedbacks").insert({
          type, content: content.trim(), contact: contact.trim(),
          user_id: user?.id, user_name: user?.name,
        });
      }
    } catch {}

    toast.success("感谢反馈！我们会尽快处理");
    setContent("");
    setContact("");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button type="button" onClick={() => router.push("/") } className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-10 relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">意见反馈</h1>
        <div className="w-[42px]" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">反馈类型</p>
            <div className="flex gap-2">
              {[
                { v: "bug", l: "🐛 问题反馈" },
                { v: "feature", l: "💡 功能建议" },
                { v: "other", l: "💬 其他" },
              ].map(t => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    type === t.v
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="请详细描述你的问题或建议..."
              rows={6}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all resize-none"
            />
            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 text-right">{content.length}/1000</p>
          </div>

          {/* Contact */}
          <div>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="联系方式（选填，方便我们回复）"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="btn-primary w-full py-3 rounded-xl text-sm disabled:opacity-40"
          >
            {submitting ? "提交中..." : "提交反馈"}
          </button>
        </form>
      </div>
    </main>
  );
}
