"use client";
import { useState, useRef } from "react";
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
  const [searchInput, setSearchInput] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  function handleSearch() {
    if (onSearch) onSearch(searchInput.trim());
    else router.push(`/?q=${encodeURIComponent(searchInput.trim())}`);
  }

  return (
    <header className="hidden md:flex fixed left-0 right-0 z-50" style={{
      top: 0,
      height: "52px",
      paddingTop: "env(safe-area-inset-top, 0px)",
      backgroundColor: "var(--color-bg-primary)",
      borderBottom: "0.5px solid var(--color-border-subtle)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: "100%", width: "100%", padding: "0 32px", display: "flex", alignItems: "center", gap: 24 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "0.02em" }}>
            dalanying
          </span>
        </Link>

        {/* Search bar - centered with margins */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 40px" }}>
          <div style={{ width: "100%", maxWidth: 400, display: "flex", alignItems: "center", height: 36, borderRadius: 18, padding: "0 16px", backgroundColor: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)", transition: "all 0.2s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索..."
              style={{ flex: 1, height: "100%", background: "transparent", marginLeft: 8, fontSize: 14, outline: "none", border: "none", color: "var(--color-text-primary)" }}
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(""); onSearch?.(""); }}
                style={{ flexShrink: 0, padding: 4, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right actions - generous spacing */}
        <div className="hidden lg:flex" style={{ alignItems: "center", gap: 28, flexShrink: 0 }}>
          {/* Hot */}
          <button onClick={() => router.push("/hot")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
            title="热门">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </button>

          {/* Messages */}
          <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/messages"); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
            title="消息">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 18, backgroundColor: "var(--color-border-subtle)" }} />

          {/* Theme toggle */}
          <button onClick={toggle}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
            title={theme === "dark" ? "切换白天模式" : "切换暗黑模式"}>
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {/* Settings */}
          <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/settings"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
            title="设置">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 18, backgroundColor: "var(--color-border-subtle)" }} />

          {/* Publish button - capsule style */}
          <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/create"); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 20, fontSize: 14, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-bg-primary)", border: "none", cursor: "pointer", transition: "all 0.2s" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            发布
          </button>
        </div>

        {/* User avatar (far right) */}
        {user ? (
          <div style={{ cursor: "pointer", marginLeft: 8, flexShrink: 0 }} onClick={() => router.push(`/user/${user.id}`)}>
            <UserAvatar name={user.name} avatarUrl={user.avatar} size={30} />
          </div>
        ) : (
          <button onClick={requireLogin}
            style={{ padding: "6px 20px", borderRadius: 20, fontSize: 14, fontWeight: 500, background: "var(--color-text-primary)", color: "var(--color-bg-primary)", border: "none", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}>
            登录
          </button>
        )}
      </div>
    </header>
  );
}
