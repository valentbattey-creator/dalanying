"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function Navbar() {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass h-11">
      <div className="h-full px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            大岚荧
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] transition-all duration-200"
            title={theme === "dark" ? "切换到白天模式" : "切换到暗黑模式"}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-400">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-500">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {user ? (
            <>
              {user.isAdmin && (
                <button onClick={() => router.push("/admin")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] transition-all duration-200" title="管理后台">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-400"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                </button>
              )}
              <button onClick={() => router.push("/settings")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] transition-all duration-200" title="设置">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--color-text-tertiary)]">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[11px] text-[var(--color-text-tertiary)] max-w-[80px] truncate">{user.name}</span>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                  {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </>
          ) : (
            <button onClick={requireLogin} className="btn-primary text-xs px-3.5 py-1.5 rounded-lg ml-1">
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
