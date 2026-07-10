"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, updateProfile, fetchProfile } from "@/lib/auth";
import type { AppUser } from "@/lib/auth";
import { uploadAvatar } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, updateUserProfile, checkNameAvailable } = useAuth();
  const { theme, toggle } = useTheme();

  const [nickname, setNickname] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Load full profile
  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then(p => {
      if (p) {
        setBio(p.bio || "");
        if (p.avatar_url) setAvatarPreview(p.avatar_url);
        if (user.name === user.email?.split("@")[0] && p.nickname) {
          setNickname(p.nickname);
        }
      }
    });
  }, [user]);

  // Debounced name check
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
        // First ensure profile exists
        await supabase.from("profiles").upsert({
          id: user!.id,
          nickname: user!.name,
          avatar_url: user!.avatar || "",
          bio: "",
          is_admin: true,
        }, { onConflict: "id" });
        
        // Force refresh user state
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
        if (profile) {
          updateUserProfile({ name: profile.nickname || user!.name, avatar: profile.avatar_url || user!.avatar || "" });
        }
        toast.success("管理员已激活！请刷新页面");
      } else {
        // localStorage mode
        const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]");
        const idx = users.findIndex((u: AppUser) => u.id === user!.id);
        if (idx >= 0) {
          users[idx].isAdmin = true;
          localStorage.setItem("dalanying_users", JSON.stringify(users));
        }
        updateUserProfile({});
        toast.success("管理员已激活！请刷新页面");
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
        avatarUrl = await uploadAvatar(avatarFile, user.id);
      }
      const ok = await updateProfile(user.id, {
        nickname: trimmed,
        avatar_url: avatarUrl,
        bio: bio.trim(),
      });
      if (ok) {
        updateUserProfile({ name: trimmed, avatar: avatarUrl });
        toast.success("设置已保存");
      } else {
        toast.error("保存失败");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    }
    setSaving(false);
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">请先登录</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all duration-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">设置</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3">
          <label className="cursor-pointer group relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-2 ring-[var(--color-border-subtle)] group-hover:ring-[var(--color-accent)] transition-all duration-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              <span className="text-white text-xs">更换</span>
            </div>
            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </label>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {/* Theme */}
          <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{theme === "dark" ? "🌙" : "☀️"}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">主题模式</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    {theme === "dark" ? "暗黑模式" : "白天模式"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggle}
                className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                  theme === "light" ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-hover)]"
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                  theme === "light" ? "left-6" : "left-1"
                }`} />
              </button>
            </div>
          </div>

          {/* Profile settings */}
          <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-4 space-y-4">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">个人资料</p>

              {/* Nickname */}
              <div>
                <label className="text-[11px] text-[var(--color-text-secondary)] ml-1">昵称</label>
                <div className="relative">
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
                  {nameStatus === "checking" && (
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 ml-1">检查中...</p>
                  )}
                  {nameStatus === "available" && (
                    <p className="text-[10px] text-green-500 mt-1 ml-1">✓ 这个名字可以用</p>
                  )}
                  {nameStatus === "taken" && (
                    <p className="text-[10px] text-red-400 mt-1 ml-1">✗ 已被占用</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[11px] text-[var(--color-text-secondary)] ml-1">简介</label>
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

              <button
                onClick={handleSave}
                disabled={saving || nameStatus === "taken" || nameStatus === "checking"}
                className="btn-primary w-full py-2.5 rounded-lg text-sm disabled:opacity-40"
              >
                {saving ? "保存中..." : "保存修改"}
              </button>
            </div>
          </div>

          {/* Admin Activation */}
          {!user?.isAdmin && (
            <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl px-4 py-4 space-y-3">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">管理员激活</p>
              <div className="flex gap-2">
                <input
                  type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                  placeholder="输入管理员密钥"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-all duration-200"
                />
                <button onClick={handleActivateAdmin} disabled={activating || !adminKey.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-40 transition-all duration-200">
                  {activating ? "激活中..." : "激活"}
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">输入正确的管理员密钥即可获得管理权限</p>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={async () => { await logout(); toast.success("已退出"); router.push("/"); }}
            className="w-full py-3 rounded-xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-sm text-red-400 hover:bg-red-400/5 transition-all duration-200"
          >
            退出登录
          </button>

          {/* About */}
          <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl px-4 py-4 text-center">
            <p className="text-xs text-[var(--color-text-tertiary)]">大岚荧 v1.0</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">发现 · 分享 · 连接</p>
          </div>
        </div>
      </div>
    </main>
  );
}
