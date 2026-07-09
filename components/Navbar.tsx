"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, requireLogin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-sm transition-transform duration-300 group-hover:scale-105">
            蓝
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--color-text-primary)] hidden sm:inline">
            大蓝赢
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          <Link href="/" className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
            pathname === "/"
              ? "bg-[var(--color-accent-glow)] text-[var(--color-accent)] font-medium"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span className="hidden sm:inline">发现</span>
          </Link>

          {user ? (
            <>
              <button
                onClick={() => router.push("/create")}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all duration-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span className="hidden sm:inline">发布</span>
              </button>
              <Link href="/profile" className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                pathname === "/profile"
                  ? "bg-[var(--color-accent-glow)] text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
              }`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="hidden sm:inline">我的</span>
              </Link>
              <div ref={menuRef} className="relative ml-1">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#6b8cff] flex items-center justify-center text-white text-xs font-bold transition-transform duration-300 hover:scale-105"
                >
                  {user.name[0].toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] rounded-xl shadow-xl py-2 animate-fade-up">
                    <div className="px-4 py-2 border-b border-[var(--color-border-subtle)]">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">{user.email}</p>
                    </div>
                    <Link href="/profile" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-all duration-300">
                      <span>👤</span> 个人主页
                    </Link>
                    <button onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[var(--color-bg-hover)] transition-all duration-300">
                      <span>🚪</span> 退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={requireLogin}
              className="btn-primary text-xs px-4 py-2 rounded-lg transition-all duration-300"
            >
              登录 / 注册
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
