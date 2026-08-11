"use client";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import UserAvatar from "@/components/UserAvatar";

const HIDE_ON = ["/settings", "/admin", "/create"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, requireLogin } = useAuth();

  if (HIDE_ON.includes(pathname)) return null;

  const isHome = pathname === "/";
  const isHot = pathname === "/hot";

  function handleCreate() {
    if (!user) { requireLogin(); return; }
    router.push("/create");
  }

  return (
    <nav className="md:hidden" style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      backgroundColor: "rgba(var(--color-bg-primary-rgb, 9,9,11), 0.9)",
      borderTop: "0.5px solid var(--color-border-subtle)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)"
    }}>
      <div style={{
        maxWidth: "64rem",
        margin: "0 auto",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 24px"
      }}>
        {/* Home */}
        <button onClick={() => router.push("/")} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          transition: "all 0.2s",
          color: isHome ? "var(--color-accent)" : "var(--color-text-tertiary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 16px"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isHome ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isHome ? 0 : 2} strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>首页</span>
        </button>

        {/* Hot/Discover */}
        <button onClick={() => router.push("/hot")} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          transition: "all 0.2s",
          color: isHot ? "var(--color-accent)" : "var(--color-text-tertiary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 16px"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>发现</span>
        </button>

        {/* Publish - Center button */}
        <button onClick={handleCreate} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "all 0.2s",
          background: "none",
          border: "none",
          cursor: "pointer",
          marginTop: "-20px"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-accent), #ff6b81)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(255,71,87,0.4)",
            transition: "transform 0.2s"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <span style={{ fontSize: "10px", fontWeight: 500, marginTop: "4px", color: "var(--color-text-tertiary)" }}>发布</span>
        </button>

        {/* Messages */}
        <button onClick={() => { if (!user) { requireLogin(); return; } router.push("/messages"); }} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          transition: "all 0.2s",
          color: pathname.startsWith("/messages") ? "var(--color-accent)" : "var(--color-text-tertiary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 16px"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={pathname.startsWith("/messages") ? "currentColor" : "none"} stroke="currentColor" strokeWidth={pathname.startsWith("/messages") ? 0 : 2} strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 500 }}>消息</span>
        </button>

        {/* Profile */}
        <button onClick={() => { if (!user) { requireLogin(); return; } router.push(`/user/${user.id}`); }} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          transition: "all 0.2s",
          color: pathname.startsWith("/user") ? "var(--color-accent)" : "var(--color-text-tertiary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 16px"
        }}>
          {user ? (
            <UserAvatar name={user.name} avatarUrl={user.avatar} size={24} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )}
          <span style={{ fontSize: "10px", fontWeight: 500 }}>我的</span>
        </button>
      </div>
    </nav>
  );
}
