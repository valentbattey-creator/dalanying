"use client";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const HIDE_ON = ["/settings", "/admin", "/create"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, requireLogin } = useAuth();

  if (HIDE_ON.includes(pathname)) return null;

  const isHome = pathname === "/";
  const isMessages = pathname.startsWith("/messages");
  const isUser = pathname.startsWith("/user");

  function handleCreate() {
    if (!user) { requireLogin(); return; }
    router.push("/create");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--color-border-subtle)] safe-area-bottom">
      <div className="max-w-6xl mx-auto h-14 flex items-center justify-around px-4">
        <button onClick={() => router.push("/")}
          className={`flex flex-col items-center gap-0.5 transition-all active:scale-95 ${isHome ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isHome ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isHome ? 0 : 2} strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-medium">首页</span>
        </button>

        <button onClick={handleCreate}
          className="relative -mt-4 flex flex-col items-center transition-all active:scale-95">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#ff6b81] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20 hover:shadow-[var(--color-accent)]/40 transition-all hover:scale-105">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <span className="text-[10px] font-medium mt-0.5 text-[var(--color-text-tertiary)]">发布</span>
        </button>

        <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/messages"); }}
          className={`flex flex-col items-center gap-0.5 transition-all active:scale-95 ${isMessages ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isMessages ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isMessages ? 0 : 2} strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="text-[10px] font-medium">消息</span>
        </button>

        <button onClick={() => { if (!user) { requireLogin(); return; } router.push(`/user/${user.id}`); }}
          className={`flex flex-col items-center gap-0.5 transition-all active:scale-95 ${isUser ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isUser ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isUser ? 0 : 2} strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-[10px] font-medium">我的</span>
        </button>
      </div>
    </nav>
  );
}
