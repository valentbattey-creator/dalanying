"use client";

import { useState, useEffect } from "react";
import { useAuth, updateProfile, fetchProfile } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/lib/auth";
import { uploadAvatar } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import AdminBadge from "@/components/AdminBadge";
import { getPaymentConfig, savePaymentConfig, uploadPaymentQR, type PaymentConfig } from "@/lib/payment";

export default function SettingsPage() {
  const { user, logout, updateUserProfile, checkNameAvailable, claimOwner, abdicateOwner } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  // Profile state
  const [nickname, setNickname] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Background image
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("dalanying_bg_image") || "";
    return "";
  });

  // Admin
  const [adminKey, setAdminKey] = useState("");
  const [activating, setActivating] = useState(false);

  // Owner
  const [ownerPassword, setOwnerPassword] = useState("");
  const [claimingOwner, setClaimingOwner] = useState(false);
  const [abdicatePassword, setAbdicatePassword] = useState("");
  const [abdicating, setAbdicating] = useState(false);

  // Payment
  const [payConfig, setPayConfig] = useState<PaymentConfig>({ alipay_qr: "", wechat_qr: "", alipay_name: "支付宝", wechat_name: "微信支付" });
  const [uploadingAlipay, setUploadingAlipay] = useState(false);
  const [uploadingWechat, setUploadingWechat] = useState(false);

  // Collapsible sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ profile: true, appearance: false, admin: false, payment: false, danger: false });

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then(p => {
      if (p) {
        setBio(p.bio || "");
        if (p.avatar_url) setAvatarPreview(p.avatar_url);
      }
    });
    const saved = localStorage.getItem("dalanying_bg_image");
    if (saved) setBgPreview(saved);
  }, [user]);

  useEffect(() => {
    getPaymentConfig().then(setPayConfig);
  }, []);

  useEffect(() => {
    if (!user || nickname.trim() === user.name || nickname.trim().length < 2) { setNameStatus("idle"); return; }
    const timer = setTimeout(async () => {
      setNameStatus("checking");
      const ok = await checkNameAvailable(nickname.trim());
      setNameStatus(ok ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [nickname, user, checkNameAvailable]);

  function toggleSection(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("图片不能超过5MB"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("图片不能超过10MB"); return; }
    setBgFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBgPreview(dataUrl);
      document.documentElement.style.setProperty("--user-bg-image", `url(${dataUrl})`);
    };
    reader.readAsDataURL(file);
  }

  function removeBg() {
    setBgFile(null);
    setBgPreview("");
    document.documentElement.style.setProperty("--user-bg-image", "none");
    localStorage.removeItem("dalanying_bg_image");
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
        try { avatarUrl = await uploadAvatar(avatarFile, user.id); setAvatarPreview(avatarUrl); }
        catch (e: unknown) { toast.error("头像上传失败"); }
      }
      // Save background as data URL
      if (bgFile) {
        localStorage.setItem("dalanying_bg_image", bgPreview);
      }
      await updateProfile(user.id, { nickname: trimmed, avatar_url: avatarUrl, bio: bio.trim() });
      updateUserProfile({ name: trimmed, avatar: avatarUrl });
      toast.success("设置已保存");
    } catch (e: unknown) { toast.error("保存失败"); }
    setSaving(false);
  }

  async function handleClaimOwner() {
    if (ownerPassword !== "050309") { toast.error("密钥错误"); return; }
    setClaimingOwner(true);
    const ok = await claimOwner(ownerPassword);
    if (ok) { toast.success("站长身份已激活！"); setOwnerPassword(""); }
    setClaimingOwner(false);
  }

  async function handleAbdicate() {
    if (abdicatePassword !== "050309") { toast.error("密钥错误"); return; }
    setAbdicating(true);
    const ok = await abdicateOwner(abdicatePassword);
    if (ok) { setAbdicatePassword(""); toast.success("已让出站长身份"); }
    setAbdicating(false);
  }

  async function handleActivateAdmin() {
    if (adminKey.trim() !== "dalanying2026") { toast.error("密钥错误"); return; }
    setActivating(true);
    try {
      const { supabase, hasSupabase } = await import("@/lib/supabase");
      if (hasSupabase && supabase) {
        await supabase.from("profiles").upsert({ id: user!.id, nickname: user!.name, avatar_url: user!.avatar || "", bio: bio.trim(), is_admin: true, role: "admin" }, { onConflict: "id" });
      }
      updateUserProfile({ name: user!.name, avatar: user!.avatar || "", isAdmin: true, role: "admin" });
      toast.success("管理员已激活！");
      setAdminKey("");
    } catch (e: unknown) { toast.error("激活失败"); }
    setActivating(false);
  }

  async function handleAlipayQR(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAlipay(true);
    try {
      const url = await uploadPaymentQR(file, "alipay");
      const updated = { ...payConfig, alipay_qr: url };
      setPayConfig(updated);
      await savePaymentConfig(updated);
      toast.success("支付宝收款码已更新");
    } catch { toast.error("上传失败"); }
    setUploadingAlipay(false);
  }

  async function handleWechatQR(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWechat(true);
    try {
      const url = await uploadPaymentQR(file, "wechat");
      const updated = { ...payConfig, wechat_qr: url };
      setPayConfig(updated);
      await savePaymentConfig(updated);
      toast.success("微信收款码已更新");
    } catch { toast.error("上传失败"); }
    setUploadingWechat(false);
  }

  return (
    <main className="min-h-screen pb-24 bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button type="button" onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-10 relative transition-all duration-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">设置</h1>
        <div className="w-[42px]" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* ============ 个人信息 ============ */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <button onClick={() => toggleSection("profile")} className="w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">个人信息</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--color-text-tertiary)] transition-transform ${expanded.profile ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {expanded.profile && (
            <div className="px-4 pb-4 space-y-4 border-t-[0.5px] border-[var(--color-border-subtle)] pt-3">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar name={user?.name || "?"} avatarUrl={avatarPreview} size={56} />
                  <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center cursor-pointer hover:bg-[var(--color-accent-hover)] transition-all text-[10px]">
                    ✎
                    <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                  </label>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{user?.name}</span>
                    {user?.role === "owner" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">👑 站长</span>}
                    {user?.isAdmin && user?.role !== "owner" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium">管理</span>}
                  </div>
                </div>
              </div>

              {/* Nickname */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">昵称</label>
                <div className="flex gap-2 mt-1">
                  <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={12}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-all"
                  />
                </div>
                {nameStatus === "checking" && <p className="text-[10px] text-yellow-400 mt-1">检查中...</p>}
                {nameStatus === "available" && <p className="text-[10px] text-green-400 mt-1">✓ 可用</p>}
                {nameStatus === "taken" && <p className="text-[10px] text-red-400 mt-1">✗ 已被占用</p>}
              </div>

              {/* Bio */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">简介</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={100} rows={2}
                  placeholder="介绍一下自己..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] resize-none transition-all"
                />
                <p className="text-[10px] text-[var(--color-text-tertiary)] text-right">{bio.length}/100</p>
              </div>

              {/* Save */}
              <button onClick={handleSave} disabled={saving || nameStatus === "taken"}
                className="btn-primary w-full py-2.5 rounded-lg text-xs disabled:opacity-40">{saving ? "保存中..." : "保存修改"}</button>
            </div>
          )}
        </div>

        {/* ============ 外观设置 ============ */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <button onClick={() => toggleSection("appearance")} className="w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">外观设置</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--color-text-tertiary)] transition-transform ${expanded.appearance ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {expanded.appearance && (
            <div className="px-4 pb-4 space-y-4 border-t-[0.5px] border-[var(--color-border-subtle)] pt-3">
              {/* Background image */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">页面背景图</label>
                <div className="mt-2">
                  {bgPreview ? (
                    <div className="relative inline-block">
                      <img src={bgPreview} alt="背景" className="w-full max-h-32 rounded-lg object-cover border border-[var(--color-border-subtle)]" />
                      <button onClick={removeBg} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                    </div>
                  ) : (
                    <label className="block border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-accent)] transition-all">
                      <div className="text-3xl mb-1">🖼️</div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">点击上传背景图</p>
                      <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                    </label>
                  )}
                  {!bgPreview && (
                    <label className="block mt-2 text-center text-[11px] text-[var(--color-accent)] hover:underline cursor-pointer">
                      选择图片
                      <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Theme toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{theme === "dark" ? "🌙" : "☀️"}</span>
                  <div>
                    <p className="text-xs text-[var(--color-text-primary)]">深色模式</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">{theme === "dark" ? "已开启" : "已关闭"}</p>
                  </div>
                </div>
                <button onClick={toggle}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 ${theme === "dark" ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-hover)]"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Font size */}
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">字体大小</label>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => {
                    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--font-scale")) || 17;
                    const n = Math.max(14, v - 1);
                    document.documentElement.style.setProperty("--font-scale", n + "px");
                    localStorage.setItem("dalanying_font_size", String(n));
                  }} className="w-7 h-7 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm font-bold hover:text-[var(--color-accent)] transition-all">A-</button>
                  <span className="text-[11px] text-[var(--color-text-tertiary)] w-8 text-center">Aa</span>
                  <button onClick={() => {
                    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--font-scale")) || 17;
                    const n = Math.min(24, v + 1);
                    document.documentElement.style.setProperty("--font-scale", n + "px");
                    localStorage.setItem("dalanying_font_size", String(n));
                  }} className="w-7 h-7 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm font-bold hover:text-[var(--color-accent)] transition-all">A+</button>
                </div>
              </div>

              {/* Save background */}
              <button onClick={handleSave} className="btn-primary w-full py-2.5 rounded-lg text-xs">保存外观设置</button>
            </div>
          )}
        </div>

        {/* ============ 权限管理 ============ */}
        <div className="bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <button onClick={() => toggleSection("admin")} className="w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">权限管理</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--color-text-tertiary)] transition-transform ${expanded.admin ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {expanded.admin && (
            <div className="px-4 pb-4 space-y-4 border-t-[0.5px] border-[var(--color-border-subtle)] pt-3">
              {/* Claim Owner */}
              {user?.role !== "owner" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">👑 认领站长</p>
                  <div className="flex gap-2">
                    <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)}
                      placeholder="输入站长密钥" className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm outline-none focus:border-[var(--color-accent)] transition-all" />
                    <button onClick={handleClaimOwner} disabled={claimingOwner || !ownerPassword.trim()}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-40 transition-all">{claimingOwner ? "..." : "认领"}</button>
                  </div>
                </div>
              )}

              {/* Abdicate Owner */}
              {user?.role === "owner" && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-red-400">⚠️ 让出站长</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">让位后失去所有站长权限，其他人可认领</p>
                  <div className="flex gap-2">
                    <input type="password" value={abdicatePassword} onChange={e => setAbdicatePassword(e.target.value)}
                      placeholder="输入密钥确认" className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-red-500/20 text-sm outline-none focus:border-red-400 transition-all" />
                    <button onClick={handleAbdicate} disabled={abdicating || !abdicatePassword.trim()}
                      className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 transition-all">{abdicating ? "..." : "让位"}</button>
                  </div>
                </div>
              )}

              {/* Apply Admin */}
              {!user?.isAdmin && user?.role !== "owner" && (
                <div className="space-y-2 pt-2 border-t-[0.5px] border-[var(--color-border-subtle)]">
                  <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">🔑 申请管理员</p>
                  <div className="flex gap-2">
                    <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                      placeholder="输入管理员密钥" className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm outline-none focus:border-[var(--color-accent)] transition-all" />
                    <button onClick={handleActivateAdmin} disabled={activating || !adminKey.trim()}
                      className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-all">{activating ? "..." : "激活"}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============ 收款码配置（仅站长） ============ */}
        {user?.role === "owner" && (
          <div className="bg-[var(--color-bg-card)] border-[0.5px] border-amber-500/20 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection("payment")} className="w-full px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">收款码配置</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">站长专属</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--color-text-tertiary)] transition-transform ${expanded.payment ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {expanded.payment && (
              <div className="px-4 pb-4 space-y-4 border-t-[0.5px] border-amber-500/10 pt-3">
                {/* Alipay */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">💙 支付宝</span>
                    <label className="text-[10px] text-[var(--color-accent)] hover:underline cursor-pointer">
                      {uploadingAlipay ? "上传中..." : "上传收款码"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAlipayQR} />
                    </label>
                  </div>
                  <div className="w-36 h-36 mx-auto bg-white rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-100">
                    {payConfig.alipay_qr ? (
                      <img src={payConfig.alipay_qr} alt="支付宝" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center"><div className="text-3xl">💙</div><p className="text-[10px] text-gray-400 mt-1">未设置</p></div>
                    )}
                  </div>
                </div>
                {/* WeChat */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">💚 微信</span>
                    <label className="text-[10px] text-[var(--color-accent)] hover:underline cursor-pointer">
                      {uploadingWechat ? "上传中..." : "上传收款码"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleWechatQR} />
                    </label>
                  </div>
                  <div className="w-36 h-36 mx-auto bg-white rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-100">
                    {payConfig.wechat_qr ? (
                      <img src={payConfig.wechat_qr} alt="微信" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center"><div className="text-3xl">💚</div><p className="text-[10px] text-gray-400 mt-1">未设置</p></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ 其他 ============ */}
        <div className="space-y-2">
          <button onClick={() => router.push("/feedback")}
            className="w-full py-3 rounded-xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-all">
            💬 意见反馈
          </button>
          <button onClick={() => router.push("/donate")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-400/5 border-[0.5px] border-amber-500/20 text-sm text-amber-400 hover:text-amber-300 hover:border-amber-400/30 transition-all">
            ☕ 支持站长 · 推流帖子
          </button>
          <button onClick={async () => { await logout(); toast.success("已退出"); router.push("/"); }}
            className="w-full py-3 rounded-xl bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-sm text-red-400 hover:bg-red-400/5 transition-all">
            退出登录
          </button>
        </div>

        <div className="text-center pb-8 pt-4">
          <p className="text-xs text-[var(--color-text-tertiary)]">dalanying v1.0</p>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">发现 · 分享 · 连接</p>
        </div>
      </div>
    </main>
  );
}
