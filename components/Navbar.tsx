"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import AdminBadge from "@/components/AdminBadge";
import UserAvatar from "@/components/UserAvatar";

export default function Navbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  function handleSearch() {
    if (onSearch) onSearch(searchInput.trim());
    else window.location.href = `/?q=${encodeURIComponent(searchInput.trim())}`;
    setSearchOpen(false);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass h-11">
      <div className="h-full px-3 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 shrink-0">
          <span className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            大岚荧
          </span>
        </Link>

        {/* Search bar - always visible */}
        <div className="flex-1 max-w-[200px] mx-1">
          <div className="relative">
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索..."
              className="w-full h-7 px-3 py-1 rounded-full bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all"
            />
            {searchInput && (
              <button
                onClick={handleSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-white"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={toggle}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] transition-all duration-200"
            title={theme === "dark" ? "白天模式" : "暗黑模式"}
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {user ? (
            <>
              {user.isAdmin && (
                <button onClick={() => router.push("/admin")} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)]" title="管理后台">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                </button>
              )}
              <button onClick={() => router.push("/settings")} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-tertiary)]"><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <div className="flex items-center gap-1 ml-0.5">
                <span className="text-[10px] text-[var(--color-text-tertiary)] max-w-[60px] truncate flex items-center gap-0.5">
                  {user.name}
                  {user.isAdmin && <AdminBadge size="sm" />}
                </span>
                <UserAvatar name={user.name} avatarUrl={user.avatar} size={22} />
              </div>
            </>
          ) : (
            <button onClick={requireLogin} className="btn-primary text-[11px] px-2.5 py-1 rounded-lg ml-0.5">登录</button>
          )}
        </div>
      </div>
    </header>
  );
}
