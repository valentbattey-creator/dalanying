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
  const isHot = pathname === "/hot";
  const isMessages = pathname.startsWith("/messages");
  const isUser = pathname.startsWith("/user");

  function handleCreate() {
    if (!user) { requireLogin(); return; }
    router.push("/create");
  }

  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "var(--color-bg-primary, rgba(255,255,255,0.85))", borderTop: "0.5px solid var(--color-border-subtle, #e5e7eb)", paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
      <div style={{ maxWidth: "64rem", margin: "0 auto", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 16px" }}>
        {/* 首页 */}
        <button onClick={() => router.push("/")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "all 0.2s", color: isHome ? "var(--color-accent, #ff4757)" : "var(--color-text-tertiary, #9ca3af)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isHome ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isHome ? 0 : 2} strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>首页</span>
        </button>

        {/* 热门 */}
        <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/hot"); }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "all 0.2s", color: isHot ? "var(--color-accent, #ff4757)" : "var(--color-text-tertiary, #9ca3af)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isHot ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isHot ? 0 : 2} strokeLinecap="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>热门</span>
        </button>

        {/* 发布 (center button) */}
        <button onClick={handleCreate}
          style={{ position: "relative", marginTop: "-16px", display: "flex", flexDirection: "column", alignItems: "center", transition: "all 0.2s", background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, var(--color-accent, #ff4757), #ff6b81)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(255,71,87,0.3)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <span style={{ fontSize: "10px", fontWeight: 500, marginTop: "2px", color: "var(--color-text-tertiary, #9ca3af)" }}>发布</span>
        </button>

        {/* 消息 */}
        <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/messages"); }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "all 0.2s", color: isMessages ? "var(--color-accent, #ff4757)" : "var(--color-text-tertiary, #9ca3af)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isMessages ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isMessages ? 0 : 2} strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>消息</span>
        </button>

        {/* 我的 */}
        <button onClick={() => { if (!user) { requireLogin(); return; } router.push(`/user/${user.id}`); }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "all 0.2s", color: isUser ? "var(--color-accent, #ff4757)" : "var(--color-text-tertiary, #9ca3af)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isUser ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isUser ? 0 : 2} strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>我的</span>
        </button>
      </div>
    </nav>
  );
}
