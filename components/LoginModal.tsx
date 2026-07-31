"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isValidEmail } from "@/lib/auth";
import { toast } from "sonner";

export default function LoginModal() {
  const router = useRouter();
  const { showLoginModal, setShowLoginModal, login, register, quickLogin, checkNameAvailable, registrationCount, sendPhoneOTP, verifyPhoneOTP, sendEmailOTP, verifyEmailOTP } = useAuth();
  const [mode, setMode] = useState<"phone" | "email" | "login" | "register" | "quick">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedName, setTouchedName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [celebration, setCelebration] = useState(false);
  const [localRegCount, setLocalRegCount] = useState<number | null>(null);
  const [checkingName, setCheckingName] = useState(false);

  // Debounced name check
  useEffect(() => {
    if (mode !== "quick" || name.trim().length < 2) { setNameAvailable(null); return; }
    const timer = setTimeout(async () => { setCheckingName(true); const ok = await checkNameAvailable(name.trim()); setNameAvailable(ok); setCheckingName(false); }, 400);
    return () => clearTimeout(timer);
  }, [name, mode, checkNameAvailable]);

  // OTP countdown
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  // Email OTP countdown
  useEffect(() => {
    if (emailOtpCountdown <= 0) return;
    const t = setInterval(() => setEmailOtpCountdown(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [emailOtpCountdown]);

  // Validation
  const emailCheck = useMemo(() => { if (!email) return { valid: false, reason: "" }; return isValidEmail(email); }, [email]);
  const phoneValid = /^1[3-9]\d{9}$/.test(phone.trim());
  const otpValid = /^\d{8}$/.test(otpCode.trim());
  const emailOtpValid = /^\d{8}$/.test(emailOtp.trim());
  const nameValid = name.trim().length >= 2 && name.trim().length <= 12;

  if (!showLoginModal) return null;

  // Celebration overlay
  if (celebration) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => { setCelebration(false); setShowLoginModal(false); resetForm(); }}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        <div className="relative z-10 w-full max-w-sm animate-fade-up" onClick={e => e.stopPropagation()}>
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">恭喜你！</h2>
            <p className="text-lg text-[var(--color-accent)] font-semibold mb-1">成为大岚荧第 {registrationCount || localRegCount || "???"} 位居民</p>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-2">欢迎加入这个社区 ✨</p>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-5 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📢</span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">社区须知</h3>
            </div>
            <div className="space-y-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <p>🔹 尊重每一位用户，友善交流</p>
              <p>🔹 严禁发布暴力、色情、违法内容</p>
              <p>🔹 严禁发布违反国家法律法规的内容</p>
              <p>🔹 违规内容将被删除，严重者封号处理</p>
              <p>🔹 保护个人隐私，谨防诈骗</p>
            </div>
            <div className="mt-4 space-y-2">
              <button onClick={() => { setCelebration(false); setShowLoginModal(false); resetForm(); router.push("/settings"); }}
                className="btn-primary w-full py-2.5 rounded-xl text-sm transition-all">
                🔑 设置密码（下次免验证码登录）
              </button>
              <p className="text-[10px] text-[var(--color-text-tertiary)] text-center cursor-pointer" onClick={() => { setCelebration(false); setShowLoginModal(false); resetForm(); }}>稍后再说</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setPhone(""); setOtpCode("");
    setError(""); setSuccess(""); setOtpSent(false); setOtpCountdown(0); setEmailOtp(""); setEmailOtpSent(false); setEmailOtpCountdown(0);
    setTouchedEmail(false); setTouchedPassword(false); setTouchedName(false);
  }

  function switchMode(m: typeof mode) { resetForm(); setMode(m); }

  async function handleSendOTP() {
    if (!phoneValid) { toast.error("请输入正确的手机号"); return; }
    setSubmitting(true);
    setError("");
    const result = await sendPhoneOTP(phone.trim());
    if (result.success) {
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success("验证码已发送");
    } else {
      setError(result.error || "发送失败");
    }
    setSubmitting(false);
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || !otpCode.trim()) return;
    setSubmitting(true);
    setError("");
    const result = await verifyPhoneOTP(phone.trim(), otpCode.trim(), name.trim() || undefined);
    if (result.success) {
      toast.success("登录成功");
      setCelebration(true);
    } else {
      setError(result.error || "验证失败");
    }
    setSubmitting(false);
  }

  async function handleSendEmailOTP() {
    if (!emailCheck.valid) { toast.error("请输入正确的邮箱"); return; }
    setSubmitting(true);
    setError("");
    const result = await sendEmailOTP(email.trim());
    if (result.success) {
      setEmailOtpSent(true);
      setEmailOtpCountdown(120);
      toast.success("验证码已发送到邮箱");
    } else {
      setError(result.error || "发送失败");
    }
    setSubmitting(false);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailCheck.valid || !emailOtp.trim()) return;
    setSubmitting(true);
    setError("");
    const result = await verifyEmailOTP(email.trim(), emailOtp.trim(), name.trim() || undefined);
    if (result.success) {
      toast.success("登录成功");
      setCelebration(true);
    } else {
      setError(result.error || "验证失败");
    }
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(""); setSuccess("");
    if (mode === "quick") {
      const result = await quickLogin(name.trim());
      if (result.success) { setCelebration(true); } else { setError(result.error || "失败"); }
    } else if (mode === "login") {
      const result = await login(email, password);
      if (result.success) { toast.success("登录成功"); setShowLoginModal(false); resetForm(); }
      else { setError(result.error || "登录失败"); }
    } else if (mode === "register") {
      const result = await register(name.trim(), email, password, phone.trim());
      if (result.success) {
        if (result.code === "check_email") { setSuccess("注册成功！请前往邮箱点击激活链接完成验证"); }
        else { setCelebration(true); }
      } else { setError(result.error || "注册失败"); }
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowLoginModal(false); resetForm(); }} />
      <div className="relative z-10 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-t-3xl sm:rounded-2xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button type="button" onClick={() => { setShowLoginModal(false); resetForm(); }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {mode === "phone" ? "手机登录" : mode === "email" ? "邮箱验证码登录" : mode === "login" ? "邮箱密码登录" : mode === "register" ? "注册账号" : "快速开始"}
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {mode === "phone" ? "手机号 + 验证码，一步到位" : mode === "email" ? "邮箱 + 验证码，安全便捷" : mode === "quick" ? "起个名字就能玩" : ""}
          </p>
        </div>

        {/* Phone OTP mode */}
        {mode === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-3">
            {!otpSent && (
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称 <span className="text-[10px] text-[var(--color-text-tertiary)]">（可选，首次登录自动创建）</span></label>
                <input type="text" placeholder="给自己起个名字" value={name} maxLength={12}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">手机号</label>
              <input type="tel" placeholder="请输入手机号" value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 11)); if (otpSent) { setOtpSent(false); setOtpCode(""); } }}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
            </div>
            {otpSent && (
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">验证码</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" placeholder="8位验证码" value={otpCode} maxLength={8}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all tracking-widest" />
                  <button type="button" onClick={handleSendOTP} disabled={otpCountdown > 0 || submitting}
                    className="shrink-0 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-40 transition-all">
                    {otpCountdown > 0 ? `${otpCountdown}s` : "重发"}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            {!otpSent ? (
              <button type="button" onClick={handleSendOTP} disabled={!phoneValid || submitting}
                className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {submitting ? "发送中..." : "发送验证码"}
              </button>
            ) : (
              <button type="submit" disabled={!otpValid || submitting}
                className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {submitting ? "验证中..." : "验证并登录"}
              </button>
            )}
          </form>
        )}

        {/* Email login/register mode */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称</label>
                <input type="text" placeholder="给自己起个名字" value={name} maxLength={12}
                  onChange={(e) => { setName(e.target.value); if (!touchedName) setTouchedName(true); }}
                  onBlur={() => setTouchedName(true)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">邮箱</label>
              <input type="email" placeholder="your@email.com" value={email}
                onChange={(e) => { setEmail(e.target.value); if (!touchedEmail) setTouchedEmail(true); }}
                onBlur={() => setTouchedEmail(true)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
            </div>
            {mode === "register" && (
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">手机号</label>
                <input type="tel" placeholder="11位手机号" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">密码</label>
              <input type="password" placeholder="至少 6 位密码" value={password}
                onChange={(e) => { setPassword(e.target.value); if (!touchedPassword) setTouchedPassword(true); }}
                onBlur={() => setTouchedPassword(true)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
            </div>
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                <p className="text-xs text-green-400">{success}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            <button type="submit" disabled={submitting}
              className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {submitting ? "处理中..." : mode === "login" ? "登录" : "注册"}
            </button>
          </form>
        )}

        {/* Quick mode */}
        {mode === "quick" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input type="text" placeholder="给自己起个名字（2-12字）" value={name} maxLength={12}
                onChange={(e) => { setName(e.target.value); if (!touchedName) setTouchedName(true); }}
                onBlur={() => setTouchedName(true)}
                className="w-full px-3 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
              {name.trim().length >= 2 && (
                <p className={`text-[10px] mt-1 ml-1 ${checkingName ? "text-[var(--color-text-tertiary)]" : nameAvailable === true ? "text-green-400" : nameAvailable === false ? "text-red-400" : "text-[var(--color-text-tertiary)]"}`}>
                  {checkingName ? "检查中..." : nameAvailable === true ? "✓ 名字可用" : nameAvailable === false ? "✗ 名字已被占用" : ""}
                </p>
              )}
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            <button type="submit" disabled={!nameValid || nameAvailable !== true || submitting}
              className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {submitting ? "处理中..." : "开始玩"}
            </button>
          </form>
        )}

        {/* Email OTP mode */}
        {mode === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {!emailOtpSent && (
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">昵称 <span className="text-[10px] text-[var(--color-text-tertiary)]">（可选）</span></label>
                <input type="text" placeholder="给自己起个名字" value={name} maxLength={12}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">邮箱</label>
              <input type="email" placeholder="your@email.com" value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailOtpSent) { setEmailOtpSent(false); setEmailOtp(""); } }}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all" />
            </div>
            {emailOtpSent && (
              <div>
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)] ml-1">邮箱验证码</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" placeholder="8位验证码" value={emailOtp} maxLength={8}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all tracking-widest" />
                  <button type="button" onClick={handleSendEmailOTP} disabled={emailOtpCountdown > 0 || submitting}
                    className="shrink-0 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-40 transition-all">
                    {emailOtpCountdown > 0 ? `${emailOtpCountdown}s` : "重发"}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            {!emailOtpSent ? (
              <button type="button" onClick={handleSendEmailOTP} disabled={!emailCheck.valid || submitting}
                className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {submitting ? "发送中..." : "发送验证码"}
              </button>
            ) : (
              <button type="submit" disabled={!emailOtpValid || submitting}
                className="btn-primary w-full py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {submitting ? "验证中..." : "验证并登录"}
              </button>
            )}
          </form>
        )}

        {/* Footer links */}
        <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] space-y-2.5 text-center">
          {mode === "email" && (
            <>
              <button type="button" onClick={() => switchMode("login")}
                className="block w-full text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all py-1.5">
                🔑 邮箱密码登录
              </button>
              <button type="button" onClick={() => switchMode("quick")}
                className="block w-full text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all py-1">
                🚶 先看看再说
              </button>
            </>
          )}
          {mode === "quick" && (
            <button type="button" onClick={() => switchMode("email")}
              className="block w-full text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all py-1.5">
              📧 邮箱验证码登录/注册
            </button>
          )}
          {(mode === "login" || mode === "register") && (
            <button type="button" onClick={() => switchMode("email")}
              className="block w-full text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-all py-1">
              ← 返回邮箱验证码登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
