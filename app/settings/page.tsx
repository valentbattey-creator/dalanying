"use client";

import { useState, useEffect } from "react";
import { useAuth, updateProfile, fetchProfile } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/lib/auth";
import { uploadAvatar } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { supabase as sharedSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";

import AdminBadge from "@/components/AdminBadge";
import { getPaymentConfig, savePaymentConfig, uploadPaymentQR, type PaymentConfig } from "@/lib/payment";

export default function SettingsPage() {
  const { user, logout, updateUserProfile, checkNameAvailable, claimOwner, abdicateOwner, hasOwner, bindEmail, sendEmailOTP, deleteAccount } = useAuth();
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

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  // Email binding
  const [bindEmailAddr, setBindEmailAddr] = useState("");
  const [bindEmailOtp, setBindEmailOtp] = useState("");
  const [bindEmailSent, setBindEmailSent] = useState(false);
  const [bindEmailCountdown, setBindEmailCountdown] = useState(0);
  const [bindingEmail, setBindingEmail] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Owner
  const [ownerPassword, setOwnerPassword] = useState("");
  const [claimingOwner, setClaimingOwner] = useState(false);
  const [abdicatePassword, setAbdicatePassword] = useState("");
  const [abdicating, setAbdicating] = useState(false);

  // Active tab for sidebar nav
  const [activeTab, setActiveTab] = useState("profile");

  // Payment
  const [payConfig, setPayConfig] = useState<PaymentConfig>({ alipay_qr: "", wechat_qr: "", alipay_name: "支付宝", wechat_name: "微信支付" });
  const [uploadingAlipay, setUploadingAlipay] = useState(false);
  const [uploadingWechat, setUploadingWechat] = useState(false);

  // Password OTP verification
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState("");
  const [passwordOtpCountdown, setPasswordOtpCountdown] = useState(0);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [sendingPasswordOtp, setSendingPasswordOtp] = useState(false);

  // Collapsible sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ profile: true, appearance: false, admin: false, payment: false, danger: false, bindEmail: false, password: true });

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

  // Email binding countdown
  useEffect(() => {
    if (bindEmailCountdown <= 0) return;
    const t = setInterval(() => setBindEmailCountdown(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [bindEmailCountdown]);

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

  // Email binding handlers
  async function handleSendBindOtp() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindEmailAddr)) {
      toast.error("请输入正确的邮箱");
      return;
    }
    setBindingEmail(true);
    const result = await sendEmailOTP(bindEmailAddr.trim());
    if (result.success) {
      setBindEmailSent(true);
      setBindEmailCountdown(120);
      toast.success("验证码已发送到邮箱");
    } else {
      toast.error(result.error || "发送失败");
    }
    setBindingEmail(false);
  }

  async function handleBindEmail() {
    if (!bindEmailAddr.trim() || !bindEmailOtp.trim()) return;
    setBindingEmail(true);
    const result = await bindEmail(bindEmailAddr.trim(), bindEmailOtp.trim());
    if (result.success) {
      toast.success("🎉 邮箱绑定成功！你已升级为正式用户");
      setBindEmailAddr("");
      setBindEmailOtp("");
      setBindEmailSent(false);
    } else {
      toast.error(result.error || "绑定失败");
    }
    setBindingEmail(false);
  }

  // Delete account handler
  async function handleDeleteAccount() {
    setDeleting(true);
    const result = await deleteAccount();
    if (result.success) {
      toast.success("账户已注销");
      router.push("/");
    } else {
      toast.error(result.error || "注销失败");
    }
    setDeleting(false);
  }

  async function handleSave() {
    if (!user) return;
    const trimmed = nickname.trim();
    if (trimmed.length < 2) { toast.error("昵称至少2个字符"); return; }
    if (nameStatus === "taken") { toast.error("昵称已被占用"); return; }
    setSaving(true);
    try {
      let avatarUrl: string | null = avatarPreview;
      if (avatarFile) {
        try { avatarUrl = await uploadAvatar(avatarFile, user.id); setAvatarPreview(avatarUrl ?? ""); }
        catch (e: unknown) { toast.error("头像上传失败"); }
      }
      // Save background as data URL
      if (bgFile) {
        localStorage.setItem("dalanying_bg_image", bgPreview);
      }
      await updateProfile(user.id, { nickname: trimmed, avatar_url: avatarUrl ?? "", bio: bio.trim() });
      updateUserProfile({ name: trimmed, avatar: avatarUrl ?? "" });
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

  // Sidebar nav items
  const NAV_ITEMS = [
    { key: "profile", label: "个人资料", icon: "👤" },
    { key: "security", label: "账号安全", icon: "🔒" },
    { key: "appearance", label: "主题外观", icon: "🎨" },
  ];
  if (user?.isAdmin || user?.role === "owner") {
    NAV_ITEMS.push({ key: "admin", label: "管理功能", icon: "⚙️" });
  }
  NAV_ITEMS.push({ key: "danger", label: "账号操作", icon: "⚠️" });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: 14,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1.5px solid var(--color-border-subtle)",
    borderRadius: 10, color: "var(--color-text-primary)",
    outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
  };
  const inputFocusStyle = "var(--color-accent)";
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, display: "block" };
  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--color-bg-card)", borderRadius: 16,
    border: "0.5px solid var(--color-border-subtle)", padding: 24, marginBottom: 16,
  };
  const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 };
  const cardDesc: React.CSSProperties = { fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 20 };

  // Toggle switch component
  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button type="button" onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, position: "relative", cursor: "pointer", border: "none", padding: 0,
          backgroundColor: checked ? "var(--color-accent)" : "var(--color-bg-hover)",
          transition: "background-color 0.2s",
        }}>
        <span style={{
          width: 18, height: 18, borderRadius: "50%", backgroundColor: "#fff", position: "absolute",
          top: 3, left: checked ? 23 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    );
  }

  // Render content for active tab
  function renderContent() {
    switch (activeTab) {
      case "profile": return (
        <>
          {/* Basic Info Card */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>基本信息</h3>
            <p style={cardDesc}>管理你的公开个人信息</p>

            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <UserAvatar name={user?.name || "?"} avatarUrl={avatarPreview} size={64} />
                <label style={{
                  position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%",
                  backgroundColor: "var(--color-accent)", color: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12,
                }}>
                  ✎
                  <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
                </label>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>{user?.name}</span>
                  {user?.role === "owner" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>👑 站长</span>}
                  {user?.isAdmin && user?.role !== "owner" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, backgroundColor: "var(--color-accent-glow)", color: "var(--color-accent)", fontWeight: 600 }}>管理</span>}
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>点击头像更换</p>
              </div>
            </div>

            {/* Nickname */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>昵称</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={12}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
              />
              {nameStatus === "checking" && <p style={{ fontSize: 11, color: "#eab308", marginTop: 4 }}>检查中...</p>}
              {nameStatus === "available" && <p style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>✓ 可用</p>}
              {nameStatus === "taken" && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>✗ 已被占用</p>}
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>个人简介</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={100} rows={3}
                placeholder="介绍一下自己..."
                style={{ ...inputStyle, resize: "none" as const }}
                onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
              />
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4, textAlign: "right" }}>{bio.length}/100</p>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: "none", cursor: saving ? "not-allowed" : "pointer",
                backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600,
                opacity: saving ? 0.6 : 1, transition: "all 0.2s",
              }}>
              {saving ? "保存中..." : "保存修改"}
            </button>
          </div>

          {/* Background Image Card */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>自定义背景</h3>
            <p style={cardDesc}>设置页面背景图片，彰显个性</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{
                flex: 1, padding: "12px 16px", borderRadius: 12, border: "1.5px dashed var(--color-border-subtle)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-bg-secondary)", transition: "all 0.2s",
              }}>
                📷 {bgPreview ? "更换背景" : "上传背景图"}
                <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: "none" }} />
              </label>
              {bgPreview && (
                <button onClick={removeBg}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1.5px solid #ef4444", backgroundColor: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>
                  移除
                </button>
              )}
            </div>
          </div>
        </>
      );

      case "security": return (
        <>
          {/* Password Card */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>密码设置</h3>
            <p style={cardDesc}>设置密码后可使用邮箱+密码登录</p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>新密码</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="至少6位" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>确认密码</label>
              <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="再次输入密码" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <button onClick={async () => {
              if (newPassword.length < 6) { toast.error("密码至少6位"); return; }
              if (newPassword !== confirmNewPassword) { toast.error("两次密码不一致"); return; }
              setSettingPassword(true);
              const { supabase, hasSupabase } = await import("@/lib/supabase");
              if (hasSupabase && supabase) {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) { toast.error(error.message); }
                else { toast.success("密码设置成功"); setNewPassword(""); setConfirmNewPassword(""); }
              }
              setSettingPassword(false);
            }} disabled={settingPassword}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
                cursor: settingPassword ? "not-allowed" : "pointer",
                backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600,
                opacity: settingPassword ? 0.6 : 1, transition: "all 0.2s",
              }}>
              {settingPassword ? "设置中..." : "设置密码"}
            </button>
          </div>

          {/* Email Card */}
          {user?.email ? (
            <div style={cardStyle}>
              <h3 style={cardTitle}>绑定邮箱</h3>
              <p style={cardDesc}>你的登录邮箱</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, backgroundColor: "var(--color-bg-secondary)" }}>
                <span style={{ fontSize: 20 }}>📧</span>
                <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{user.email}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 8, backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 600 }}>已绑定</span>
              </div>
            </div>
          ) : (
            <div style={cardStyle}>
              <h3 style={cardTitle}>绑定邮箱</h3>
              <p style={cardDesc}>绑定邮箱后升级为正式用户，支持密码登录</p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>邮箱地址</label>
                <input value={bindEmailAddr} onChange={e => setBindEmailAddr(e.target.value)}
                  placeholder="your@email.com" type="email" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              {bindEmailSent && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>验证码</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={bindEmailOtp} onChange={e => setBindEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="输入8位验证码" style={{ ...inputStyle, flex: 1 }}
                      onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                      onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
                    />
                    <button onClick={handleSendBindOtp} disabled={bindEmailCountdown > 0 || bindingEmail}
                      style={{ padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--color-border-subtle)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {bindEmailCountdown > 0 ? `${bindEmailCountdown}s` : "重发"}
                    </button>
                  </div>
                </div>
              )}
              {!bindEmailSent ? (
                <button onClick={handleSendBindOtp} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindEmailAddr) || bindingEmail}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600, opacity: (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindEmailAddr) || bindingEmail) ? 0.5 : 1 }}>
                  {bindingEmail ? "发送中..." : "发送验证码"}
                </button>
              ) : (
                <button onClick={handleBindEmail} disabled={bindEmailOtp.length < 6 || bindingEmail}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600, opacity: (bindEmailOtp.length < 6 || bindingEmail) ? 0.5 : 1 }}>
                  {bindingEmail ? "绑定中..." : "确认绑定"}
                </button>
              )}
            </div>
          )}
        </>
      );

      case "appearance": return (
        <div style={cardStyle}>
          <h3 style={cardTitle}>主题外观</h3>
          <p style={cardDesc}>自定义你的界面风格</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>深色模式</p>
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{theme === "dark" ? "当前为深色模式" : "当前为浅色模式"}</p>
            </div>
            <Toggle checked={theme === "dark"} onChange={() => toggle()} />
          </div>
        </div>
      );

      case "admin": return (
        <>
          {(user?.isAdmin || user?.role === "owner") && (
            <div style={cardStyle}>
              <h3 style={cardTitle}>管理后台</h3>
              <p style={cardDesc}>进入管理后台管理帖子和用户</p>
              <button onClick={() => router.push("/admin")}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1.5px solid var(--color-accent)", backgroundColor: "var(--color-accent-glow)", color: "var(--color-accent)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                🛠️ 进入管理后台
              </button>
            </div>
          )}
          {!user?.isAdmin && (
            <div style={cardStyle}>
              <h3 style={cardTitle}>激活管理员</h3>
              <p style={cardDesc}>输入管理员密钥获取管理权限</p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>管理员密钥</label>
                <input value={adminKey} onChange={e => setAdminKey(e.target.value)} type="password"
                  placeholder="输入密钥" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <button onClick={handleActivateAdmin} disabled={activating || !adminKey.trim()}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: "var(--color-accent)", color: "#fff", fontSize: 14, fontWeight: 600, opacity: (activating || !adminKey.trim()) ? 0.5 : 1 }}>
                {activating ? "激活中..." : "激活管理员"}
              </button>
            </div>
          )}
          {user?.role === "owner" && (
            <div style={cardStyle}>
              <h3 style={cardTitle}>站长操作</h3>
              <p style={cardDesc}>让出站长身份给其他管理员</p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>确认密钥</label>
                <input value={abdicatePassword} onChange={e => setAbdicatePassword(e.target.value)} type="password"
                  placeholder="输入密钥确认" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = inputFocusStyle; e.target.style.boxShadow = `0 0 0 3px ${inputFocusStyle}20`; }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border-subtle)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <button onClick={handleAbdicate} disabled={abdicating}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1.5px solid #eab308", backgroundColor: "rgba(234,179,8,0.05)", color: "#eab308", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {abdicating ? "处理中..." : "让出站长身份"}
              </button>
            </div>
          )}
        </>
      );

      case "danger": return (
        <>
          <div style={cardStyle}>
            <h3 style={cardTitle}>退出登录</h3>
            <p style={cardDesc}>退出当前账号</p>
            <button onClick={async () => { await logout(); toast.success("已退出"); router.push("/"); }}
              style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1.5px solid var(--color-border-subtle)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              退出登录
            </button>
          </div>

          <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.2)" }}>
            <h3 style={{ ...cardTitle, color: "#ef4444" }}>危险区域</h3>
            <p style={cardDesc}>以下操作不可逆，请谨慎操作</p>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1.5px dashed #ef4444", backgroundColor: "rgba(239,68,68,0.03)", color: "#ef4444", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                注销账户
              </button>
            ) : (
              <div style={{ padding: 20, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", marginBottom: 8 }}>⚠️ 确认注销？</p>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 16, lineHeight: 1.5 }}>昵称将变为"已注销用户"，发布内容保留，此操作不可逆。</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowDeleteConfirm(false)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--color-border-subtle)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                    取消
                  </button>
                  <button onClick={handleDeleteAccount} disabled={deleting}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                    {deleting ? "注销中..." : "确认注销"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      );

      default: return null;
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-primary)", paddingBottom: "max(6rem, calc(4rem + env(safe-area-inset-bottom, 0px)))", paddingTop: "56px" }}>
      {/* Mobile header - positioned below MobileTopbar */}
      <div className="lg:hidden" style={{ position: "sticky", top: "56px", zIndex: 49, height: 44, paddingTop: "env(safe-area-inset-top, 0px)", display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: "var(--color-bg-primary)", borderBottom: "0.5px solid var(--color-border-subtle)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginRight: 26 }}>设置</h1>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", gap: 24 }}>
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden lg:block" style={{ width: 220, flexShrink: 0, position: "sticky", top: 80, alignSelf: "flex-start" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24, paddingLeft: 12 }}>设置</h2>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left",
                  backgroundColor: activeTab === item.key ? "var(--color-bg-hover)" : "transparent",
                  color: activeTab === item.key ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 40, paddingLeft: 12 }}>
            <p style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>大岚荧 v1.0</p>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="lg:hidden" style={{ display: "flex", overflowX: "auto", gap: 6, marginBottom: 8, paddingBottom: 4 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
                backgroundColor: activeTab === item.key ? "var(--color-accent)" : "var(--color-bg-card)",
                color: activeTab === item.key ? "#fff" : "var(--color-text-tertiary)",
                transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <section style={{ flex: 1, minWidth: 0 }}>
          {/* PC back button */}
          <div className="hidden lg:flex" style={{ alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "0.5px solid var(--color-border-subtle)", backgroundColor: "var(--color-bg-card)", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              返回
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {NAV_ITEMS.find(n => n.key === activeTab)?.label}
            </h2>
          </div>

          {renderContent()}
        </section>
      </div>
    </main>
  );
}
