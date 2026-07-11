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
    else router.push(`/?q=${encodeURIComponent(searchInput.trim())}`);
    setSearchOpen(false);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass h-11">
      <div className="h-full px-3 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 shrink-0">
          <span className="text-xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            dalanying
          </span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-[240px] ml-auto mr-1">
          <div className="flex items-center gap-2 h-7 rounded-full bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] focus-within:border-[var(--color-accent)] transition-all overflow-hidden">
            <span className="pl-4 pr-5 text-[var(--color-text-tertiary)] shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索"
              className="flex-1 h-full bg-transparent pl-1 text-[11px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none border-none"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); onSearch?.(""); }}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full mr-0.5 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] transition-colors"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] transition-all duration-200"
            title={theme === "dark" ? "白天模式" : "暗黑模式"}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {user ? (
            <>
              {user.isAdmin && (
                <button onClick={() => router.push("/admin")} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)]" title={user.role === "owner" ? "管理后台 (站长)" : "管理后台"}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={user.role === "owner" ? "text-amber-400" : "text-[var(--color-text-tertiary)]"}><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                </button>
              )}
              <button onClick={() => router.push("/settings")} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-tertiary)]"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <div className="flex items-center gap-1 ml-0.5">
                <span className="text-[13px] text-[var(--color-text-secondary)] max-w-[80px] truncate flex items-center gap-0.5 font-medium">
                  {user.role === "owner" && <span title="站长" className="text-[14px]">👑</span>}
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
