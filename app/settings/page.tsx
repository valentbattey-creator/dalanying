"use client";

import { useState, useEffect } from "react";
import { useAuth, updateProfile, fetchProfile } from "@/lib/auth";
import type { AppUser } from "@/lib/auth";
import { uploadAvatar } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import AdminBadge from "@/components/AdminBadge";

export default function SettingsPage() {
  const { user, logout, updateUserProfile, checkNameAvailable } = useAuth();
  const { theme, toggle } = useTheme();

  const [nickname, setNickname] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bgImage, setBgImage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dalanying_bg_image") || "";
    }
    return "";
  });
  const [saving, setSaving] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then(p => {
      if (p) {
        setBio(p.bio || "");
        if (p.avatar_url) setAvatarPreview(p.avatar_url);
      }
    });
    // Load saved background image
    const saved = localStorage.getItem("dalanying_bg_image");
    if (saved) setBgImage(saved);
  }, [user]);

  useEffect(() => {
    if (!user || nickname.trim() === user.name || nickname.trim().length < 2) {
      setNameStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      setNameStatus("checking");
      const ok = await checkNameAvailable(nickname.trim());
      setNameStatus(ok ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [nickname, user, checkNameAvailable]);

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("图片不能超过5MB"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleActivateAdmin() {
    if (adminKey.trim() !== "dalanying2026") { toast.error("密钥错误"); return; }
    setActivating(true);
    try {
      const { supabase, hasSupabase } = await import("@/lib/supabase");
      if (hasSupabase && supabase) {
        await supabase.from("profiles").upsert({
          id: user!.id,
          nickname: user!.name,
          avatar_url: user!.avatar || "",
          bio: bio.trim(),
          is_admin: true,
        }, { onConflict: "id" });
        
        // 🔥 KEY FIX: update local state with isAdmin
        updateUserProfile({ name: user!.name, avatar: user!.avatar || "", isAdmin: true });
        toast.success("管理员已激活！");
      } else {
        const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]");
        const idx = users.findIndex((u: AppUser) => u.id === user!.id);
        if (idx >= 0) {
          users[idx].isAdmin = true;
          localStorage.setItem("dalanying_users", JSON.stringify(users));
        }
        const currentUser = JSON.parse(localStorage.getItem("dalanying_user") || "{}");
        currentUser.isAdmin = true;
        localStorage.setItem("dalanying_user", JSON.stringify(currentUser));
        updateUserProfile({ isAdmin: true });
        toast.success("管理员已激活！");
      }
      setAdminKey("");
    } catch (e: unknown) {
      toast.error("激活失败: " + (e instanceof Error ? e.message : "未知错误"));
    }
    setActivating(false);
  }

  async function handleSave() {
    if (!user) return;
    const trimmed = nickname.trim();
    if (trimmed.length < 2) { toast.error("昵称至少2个字符"); return; }
    if (nameStatus === "taken") { toast.error("昵称已被占用"); return; }
    setSaving(true);
    try {
      let avatarUrl = avatarPreview;
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(avatarFile, user.id);
        } catch {
          // Avatar upload failed, keep existing
          toast.error("头像上传失败，但其他信息已保存");
        }
      }
      // Save to Supabase (or localStorage fallback)
      await updateProfile(user.id, {
        nickname: trimmed,
        avatar_url: avatarUrl,
        bio: bio.trim(),
      });
      // Always update local state
      updateUserProfile({ name: trimmed, avatar: avatarUrl });
      // Save background image
      localStorage.setItem("dalanying_bg_image", bgImage);
      document.documentElement.style.setProperty("--user-bg-image", bgImage ? `url(${bgImage})` : "none");
      toast.success("设置已保存");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    }
    setSaving(false);
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <button type="button" onClick={() => window.location.href = "/" } className="text-sm text-[var(--color-accent)]">请先登录，点击返回首页</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button type="button" onClick={() => window.location.href = "/" } className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] pointer-events-auto z-50 relative hover:text-[var(--color-accent)] transition-all duration-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">设置</h1>
        <div className="w-[42px]" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Profile card */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          {/* Avatar + name header */}
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-4 py-8 flex flex-col items-center gap-3">
            <label className="cursor-pointer group relative">
              <UserAvatar name={user.name} avatarUrl={avatarPreview} size={72} />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </label>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-base font-bold text-white">{user.name}</span>
                {user.isAdmin && <AdminBadge size="md" />}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">{user.email || "快速登录用户"}</p>
              {user.isAdmin && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-medium border border-amber-500/20">管理员</span>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="px-4 py-4 space-y-4">
            {/* Nickname */}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className={`w-full mt-1 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] outline-none transition-all duration-200 ${
                  nameStatus === "taken" ? "border-red-400" :
                  nameStatus === "available" ? "border-green-400" :
                  "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
                }`}
              />
              {nameStatus === "checking" && <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 ml-1">检查中...</p>}
              {nameStatus === "available" && <p className="text-[10px] text-green-500 mt-1 ml-1">✓ 这个名字可以用</p>}
              {nameStatus === "taken" && <p className="text-[10px] text-red-400 mt-1 ml-1">✗ 已被占用</p>}
            </div>

            {/* Bio */}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">简介</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={100}
                rows={2}
                placeholder="介绍一下自己..."
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-200 resize-none"
              />
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 text-right">{bio.length}/100</p>
            </div>

            {/* Background Image */}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">页面背景图</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={bgImage}
                  onChange={(e) => {
                    setBgImage(e.target.value);
                    document.documentElement.style.setProperty("--user-bg-image", e.target.value ? `url(${e.target.value})` : "none");
                  }}
                  placeholder="粘贴图片链接（可选）"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] outline-none transition-all duration-200"
                />
              </div>
              {bgImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={bgImage} alt="背景预览" className="w-20 h-12 rounded-lg object-cover border border-[var(--color-border-subtle)]" />
                  <button
                    onClick={() => {
                      setBgImage("");
                      document.documentElement.style.setProperty("--user-bg-image", "none");
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    移除背景
                  </button>
                </div>
              )}
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">设置后所有页面将使用此背景，留空则使用默认纯色背景</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || nameStatus === "taken" || nameStatus === "checking"}
              className="btn-primary w-full py-2.5 rounded-lg text-sm disabled:opacity-40"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">偏好设置</p>
            
            {/* Theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{theme === "dark" ? "🌙" : "☀️"}</span>
                <div>
                  <p className="text-sm text-[var(--color-text-primary)]">深色模式</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">{theme === "dark" ? "已开启" : "已关闭"}</p>
                </div>
              </div>
              <button
                onClick={toggle}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                  theme === "dark" ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-hover)]"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow ${
                  theme === "dark" ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Admin activation - ONLY show if NOT admin */}
        {!user.isAdmin && (
          <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">申请管理员</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">输入管理员密钥获取管理权限</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                  placeholder="输入密钥"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-all duration-200"
                />
                <button onClick={handleActivateAdmin} disabled={activating || !adminKey.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-40 transition-all duration-200">
                  {activating ? "..." : "激活"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        <button
          onClick={() => window.location.href = "/feedback" }
          className="w-full py-3 rounded-xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-all duration-200"
        >
          💬 意见反馈
        </button>

        {/* Logout */}
        <button
          onClick={async () => { await logout(); toast.success("已退出"); window.location.href = "/"; }}
          className="w-full py-3 rounded-xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-sm text-red-400 hover:bg-red-400/5 transition-all duration-200"
        >
          退出登录
        </button>

        {/* About */}
        <div className="text-center pb-8">
          <p className="text-xs text-[var(--color-text-tertiary)]">大岚荧 v1.0</p>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">发现 · 分享 · 连接</p>
        </div>
      </div>
    </main>
  );
}
