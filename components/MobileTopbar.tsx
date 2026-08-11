"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function MobileTopbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  function handleSearch() {
    if (onSearch) onSearch(searchInput.trim());
    else router.push(`/?q=${encodeURIComponent(searchInput.trim())}`);
    setShowSearch(false);
  }

  return (
    <header className="md:hidden fixed left-0 right-0 z-50" style={{
      top: 0,
      height: "56px",
      paddingTop: "env(safe-area-inset-top, 0px)",
      backgroundColor: "rgba(var(--color-bg-primary-rgb, 9,9,11), 0.8)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "0.5px solid var(--color-border-subtle)"
    }}>
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "0.02em"
          }}>dalanying</span>
        </Link>

        {/* Right icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Search icon */}
          <button onClick={() => setShowSearch(!showSearch)} style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            transition: "all 0.2s"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Notification bell */}
          <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/messages"); }} style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            transition: "all 0.2s"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          {/* Settings gear */}
          <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/settings"); }} style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            transition: "all 0.2s"
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search overlay */}
      {showSearch && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          padding: "12px 16px",
          backgroundColor: "var(--color-bg-primary)",
          borderBottom: "0.5px solid var(--color-border-subtle)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            height: "40px",
            borderRadius: "20px",
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
            padding: "0 16px"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索帖子、话题..."
              autoFocus
              style={{
                flex: 1,
                height: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "var(--color-text-primary)"
              }}
            />
            <button onClick={() => setShowSearch(false)} style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-tertiary)",
              padding: "4px"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
