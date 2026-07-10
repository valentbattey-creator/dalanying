"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth, isValidEmail } from "@/lib/auth";
import { toast } from "sonner";

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, login, register, quickLogin, checkNameAvailable } = useAuth();
  const [mode, setMode] = useState<"quick" | "login" | "register">("quick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedName, setTouchedName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);

  // Debounced name check
  useEffect(() => {
    if (mode !== "quick" || name.trim().length < 2) {
      setNameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingName(true);
      const ok = await checkNameAvailable(name.trim());
      setNameAvailable(ok);
      setCheckingName(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [name, mode, checkNameAvailable]);

  // Validation
  const emailCheck = useMemo(() => {
    if (!email) return { valid: false, reason: "" };
    return isValidEmail(email);
  }, [email]);
  const emailError = touchedEmail && email.trim() && !emailCheck.valid;
  const emailReason = emailError ? emailCheck.reason : "";
  const passwordError = touchedPassword && password.trim() && password.length < 6;
  const nameError = touchedName && (mode === "register" || mode === "quick") && name.trim() && name.trim().length < 2;

  const canSubmit = useMemo(() => {
    if (mode === "quick") {
      return name.trim().length >= 2 && name.trim().length <= 12 && nameAvailable === true && !submitting;
    }
    if (mode === "register") {
      return emailCheck.valid && password.length >= 6 && name.trim().length >= 2 && !submitting;
    }
    return emailCheck.valid && password.length >= 6 && !submitting;
  }, [emailCheck.valid, password.length, name, mode, submitting, nameAvailable]);

  if (!showLoginModal) return null;

  function resetForm() {
    setName(""); setEmail(""); setPassword("");
    setError(""); setSuccess("");
    setTouchedEmail(false); setTouchedPassword(false); setTouchedName(false);
    setNameAvailable(null);
  }

  function switchMode(m: "quick" | "login" | "register") {
    setMode(m);
    setError(""); setSuccess("");
    setTouchedEmail(false); setTouchedPassword(false); setTouchedName(false);
    setNameAvailable(null);
  }

  async function handleQuickStart(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) { setError("名字至少 2 个字"); return; }
    if (name.trim().length > 12) { setError("名字最多 12 个字"); return; }
    if (nameAvailable === false) { setError("这个名字被占用了，换一个吧"); return; }
    setSubmitting(true);
    const result = await quickLogin(name.trim());
    if (result.success) {
      toast.success(`欢迎，${name.trim()}！`);
      setShowLoginModal(false);
      resetForm();
    } else {
      setError(result.error || "注册失败");
    }
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register" && name.trim().length < 2) { setError("昵称至少 2 个字符"); return; }
    const check = isValidEmail(email);
    if (!check.valid) { setError(check.reason || "邮箱格式不正确"); return; }
    if (password.length < 6) { setError("密码至少 6 位"); return; }

    setSubmitting(true);
    const result = mode === "login"
      ? await login(email, password)
      : await register(name, email, password);

    if (result.success) {
      if (result.code === "check_email") {
        setSuccess("注册成功！请前往邮箱点击激活链接以完成验证");
      } else {
        toast.success(mode === "login" ? "登录成功" : "注册成功");
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

      <div className="relative w-full max-w-sm bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-default)] rounded-2xl p-5 shadow-2xl animate-fade-up z-10 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={() => { setShowLoginModal(false); resetForm(); }}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Success message */}
        {success ? (
          <div className="py-10 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">验证邮件已发送</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6 leading-relaxed">{success}</p>
            <button
              onClick={() => { setShowLoginModal(false); resetForm(); }}
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              知道了
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#6b8cff] flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-lg font-bold">蓝</span>
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {mode === "quick" ? "快速开始" : mode === "login" ? "欢迎回来" : "创建账号"}
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {mode === "quick" ? "输入一个独一无二的名字就能开始" : "发现科技、汽车、运动、游戏等精彩内容"}
              </p>
            </div>

            {/* Quick Start Form */}
            {mode === "quick" && (
              <form onSubmit={handleQuickStart} className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">取个名字</label>
                  <div className="relative">
                    <input
                      type="text" placeholder="你的独特名字（2-12个字）" value={name}
                      onChange={(e) => { setName(e.target.value); if (!touchedName) setTouchedName(true); }}
                      onBlur={() => setTouchedName(true)}
                      maxLength={12}
                      className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                        nameError ? "border-red-500/50" :
                        nameAvailable === true ? "border-green-500/40" :
                        nameAvailable === false ? "border-red-500/50" :
                        "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
                      }`}
                    />
                    {checkingName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[var(--color-text-tertiary)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 ml-1 min-h-[16px]">
                    {nameError && <p className="text-[10px] text-red-400">名字至少需要 2 个字符</p>}
                    {checkingName && <p className="text-[10px] text-[var(--color-text-tertiary)]">正在检查名字...</p>}
                    {!checkingName && nameAvailable === true && name.trim().length >= 2 && (
                      <p className="text-[10px] text-green-500">✓ 这个名字可以用！</p>
                    )}
                    {!checkingName && nameAvailable === false && (
                      <p className="text-[10px] text-red-400">✗ 这个名字已经被占用了，换个试试</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit" disabled={!canSubmit}
                  className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {submitting ? "正在进入..." : "开始使用"}
                </button>

                <p className="text-center text-[10px] text-[var(--color-text-tertiary)]">
                  后续可以在设置中绑定邮箱，解锁更多功能
                </p>
              </form>
            )}

            {/* Login/Register Form */}
            {mode !== "quick" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {(mode === "register") && (
                  <div>
                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称</label>
                    <input
                      type="text" placeholder="你的昵称（至少2个字符）" value={name}
                      onChange={(e) => { setName(e.target.value); if (!touchedName) setTouchedName(true); }}
                      onBlur={() => setTouchedName(true)}
                      className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                        nameError ? "border-red-500/50" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
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
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                      emailError ? "border-red-500/50" : emailCheck.valid && email ? "border-green-500/40" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
                    }`}
                  />
                  {emailError && <p className="text-[10px] text-red-400 mt-1 ml-1">{emailReason}</p>}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">密码</label>
                  <input
                    type="password" placeholder="至少 6 位密码" value={password}
                    onChange={(e) => { setPassword(e.target.value); if (!touchedPassword) setTouchedPassword(true); }}
                    onBlur={() => setTouchedPassword(true)}
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-300 ${
                      passwordError ? "border-red-500/50" : "border-[var(--color-border-subtle)] focus:border-[var(--color-accent)]"
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
                  {submitting ? "处理中..." : mode === "login" ? "登录" : "注册"}
                </button>
              </form>
            )}

            {/* Footer links */}
            {mode !== "quick" && (
              <>
                <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-4">
                  {mode === "login" ? "还没有账号？" : "已有账号？"}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "login" ? "register" : "login")}
                    className="text-[var(--color-accent)] hover:underline ml-1 font-medium transition-all duration-300"
                  >
                    {mode === "login" ? "去注册" : "去登录"}
                  </button>
                </p>
                <p className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => switchMode("quick")}
                    className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all duration-200"
                  >
                    不想注册？快速开始 →
                  </button>
                </p>
              </>
            )}

            {mode === "quick" && (
              <p className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all duration-200"
                >
                  已有账号？邮箱登录 →
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
