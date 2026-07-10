"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, requireLogin } = useAuth();

  const isHome = pathname === "/";
  const isCreate = pathname === "/create";

  function handleCreate() {
    if (!user) { requireLogin(); return; }
    router.push("/create");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t-[0.5px] border-white/[0.06] safe-area-bottom">
      <div className="max-w-lg mx-auto h-14 flex items-center justify-around px-4">
        {/* 首页 */}
        <button
          onClick={() => router.push("/")}
          className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-90 ${
            isHome ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isHome ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isHome ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[10px] font-medium">首页</span>
        </button>

        {/* 发布 (突出显示，像抖音的+) */}
        <button
          onClick={handleCreate}
          className="relative -mt-5 flex flex-col items-center transition-all duration-200 active:scale-90"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#ff6b81] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/25 transition-all duration-200 hover:shadow-[var(--color-accent)]/40 hover:scale-105">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <span className="text-[10px] font-medium mt-0.5 text-[var(--color-text-tertiary)]">发布</span>
        </button>

        {/* 我的 */}
        <button
          onClick={() => {
            if (!user) { requireLogin(); return; }
            router.push(`/user/${user.id}`);
          }}
          className={`flex flex-col items-center gap-0.5 transition-all duration-200 active:scale-90 ${
            pathname.startsWith("/user")
              ? "text-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={pathname.startsWith("/user") ? "currentColor" : "none"} stroke="currentColor" strokeWidth={pathname.startsWith("/user") ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-[10px] font-medium">我的</span>
        </button>
      </div>
    </nav>
  );
}
