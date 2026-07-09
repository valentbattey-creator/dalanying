"use client";

import { useState, useMemo } from "react";
import { useAuth, isValidEmail } from "@/lib/auth";

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  // Real-time validation with new API
  const emailCheck = useMemo(() => {
    if (!email) return { valid: false, reason: "" };
    return isValidEmail(email);
  }, [email]);
  const emailError = touchedEmail && email.trim() && !emailCheck.valid;
  const emailReason = emailError ? emailCheck.reason : "";
  const passwordError = touchedPassword && password.trim() && password.length < 6;
  const nameError = touchedName && mode === "register" && name.trim() && name.trim().length < 2;

  const canSubmit = useMemo(() => {
    if (mode === "register") {
      return emailCheck.valid && password.length >= 6 && name.trim().length >= 2 && !submitting;
    }
    return emailCheck.valid && password.length >= 6 && !submitting;
  }, [emailCheck.valid, password.length, name, mode, submitting]);

  if (!showLoginModal) return null;

  function resetForm() {
    setName(""); setEmail(""); setPassword("");
    setError(""); setSuccess("");
    setTouchedEmail(false); setTouchedPassword(false); setTouchedName(false);
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(""); setSuccess("");
    setTouchedEmail(false); setTouchedPassword(false); setTouchedName(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const check = isValidEmail(email);
    if (!check.valid) {
      setError(check.reason || "邮箱格式不正确");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      setError("昵称至少 2 个字符");
      return;
    }

    setSubmitting(true);
    const result = mode === "login"
      ? await login(email, password)
      : await register(name, email, password);

    if (result.success) {
      if (result.code === "check_email") {
        setSuccess("注册成功！请前往邮箱点击激活链接以完成验证");
      } else {
        setShowLoginModal(false);
        resetForm();
      }
    } else {
      setError(result.error || "操作失败");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up"
        onClick={() => { setShowLoginModal(false); resetForm(); }}
      />

      <div className="relative w-full max-w-sm bg-[var(--color-bg-card)] border border-[var(--color-border-default)] rounded-2xl p-6 shadow-2xl animate-fade-up z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => { setShowLoginModal(false); resetForm(); }}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all duration-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">蓝</div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {mode === "login" ? "欢迎回来" : "加入大蓝赢"}
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            {mode === "login" ? "登录后开始互动" : "注册账号开始分享"}
          </p>
        </div>

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-3 mb-4 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 9"/></svg>
            <div>
              <p className="text-xs text-green-400 font-medium">{success}</p>
              <p className="text-[10px] text-green-400/70 mt-1">没有收到邮件？请检查垃圾箱</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称</label>
              <input
                type="text" placeholder="你的昵称（至少2个字符）" value={name}
                onChange={(e) => { setName(e.target.value); if (!touchedName) setTouchedName(true); }}
                onBlur={() => setTouchedName(true)}
                required minLength={2}
                className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                  nameError ? "border-red-500/50 focus:border-red-400" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
                }`}
              />
              {nameError && <p className="text-[10px] text-red-400 mt-1 ml-1">昵称至少需要 2 个字符</p>}
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">邮箱</label>
            <input
              type="email" placeholder="your@email.com" value={email}
              onChange={(e) => { setEmail(e.target.value); if (!touchedEmail) setTouchedEmail(true); }}
              onBlur={() => setTouchedEmail(true)}
              required
              className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                emailError ? "border-red-500/50 focus:border-red-400" : emailCheck.valid && email ? "border-green-500/40 focus:border-green-400" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
              }`}
            />
            {emailError && <p className="text-[10px] text-red-400 mt-1 ml-1">{emailReason}</p>}
            {!emailError && emailCheck.valid && email && (
              <p className="text-[10px] text-green-400/70 mt-1 ml-1">✓ 邮箱格式正确</p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">密码</label>
            <input
              type="password" placeholder="至少 6 位密码" value={password}
              onChange={(e) => { setPassword(e.target.value); if (!touchedPassword) setTouchedPassword(true); }}
              onBlur={() => setTouchedPassword(true)}
              minLength={6} required
              className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                passwordError ? "border-red-500/50 focus:border-red-400" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
              }`}
            />
            {passwordError && <p className="text-[10px] text-red-400 mt-1 ml-1">密码至少需要 6 个字符</p>}
          </div>

          {error && !success && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={!canSubmit}
            className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                处理中...
              </span>
            ) : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        {!success && (
          <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-4">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              type="button"
              onClick={switchMode}
              className="text-[var(--color-accent)] hover:underline ml-1 font-medium transition-all duration-300"
            >
              {mode === "login" ? "去注册" : "去登录"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
