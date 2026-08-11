"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase, hasSupabase } from "./supabase";

// 站长通过设置页面认领（密码 050309）
import { moderateName } from "./moderation";
import { toast } from "sonner";
import { generateAvatar } from "./avatar";
import { fetchProfile, updateProfile } from "./data";

export { fetchProfile, updateProfile };

// ===== Types =====
export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  isAdmin: boolean;
  role: "owner" | "admin" | null;
  bannedUntil: string | null;
  isGuest?: boolean;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  requireLogin: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  quickLogin: (name: string) => Promise<{ success: boolean; error?: string }>;
  guestLikes: Set<string>;
  toggleGuestLike: (postId: string) => void;
  checkNameAvailable: (name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; avatar?: string; isAdmin?: boolean; role?: "owner" | "admin" | null }) => void;
  claimOwner: (password: string) => Promise<boolean>;
  abdicateOwner: (password: string) => Promise<boolean>;
  hasOwner: boolean;
  setShowLoginModal: (show: boolean) => void;
  showLoginModal: boolean;
  showProfileSetup: boolean;
  setShowProfileSetup: (show: boolean) => void;
  registrationCount: number | null;
  sendPhoneOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  sendEmailOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOTP: (email: string, token: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOTP: (phone: string, token: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  bindEmail: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthState | null>(null);

// ===== Email Validation =====
const BASIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com",
  "yopmail.com", "throwaway.email", "sharklashers.com", "trashmail.com",
  "temp-mail.org", "fakeinbox.com", "emailondeck.com", "spam4.me",
  "maildrop.cc", "getnada.com", "inboxkitten.com",
]);

export function isValidEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || !email.includes("@") || !BASIC_EMAIL.test(email)) {
    return { valid: false, reason: "请输入正确的邮箱格式" };
  }
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { valid: false, reason: "邮箱格式不正确" };
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: "不支持临时邮箱注册" };
  }
  return { valid: true };
}

function anonymousId(): string {
  // Generate valid UUID v4 for Supabase compatibility
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasOwner, setHasOwner] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [registrationCount, setRegistrationCount] = useState<number | null>(null);
  const [guestLikes, setGuestLikes] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("dalanying_guest_likes");
        if (stored) return new Set(JSON.parse(stored));
      } catch {}
    }
    return new Set();
  });
  const [hydrated, setHydrated] = useState(false);
  const [localOTP, setLocalOTP] = useState<{ phone: string; code: string; expires: number } | null>(null);

  const toggleGuestLike = useCallback((postId: string) => {
    setGuestLikes(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      try { localStorage.setItem("dalanying_guest_likes", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!hasSupabase) return;
    const { data: session } = await supabase!.auth.getSession();
    if (session?.session?.user) {
      const profile = await fetchProfile(session.session.user.id);
      setUser({
        id: session.session.user.id,
        name: profile?.nickname || session.session.user.user_metadata?.full_name || session.session.user.email!.split("@")[0],
        email: session.session.user.email!,
        phone: (profile as any)?.phone || "",
        avatar: profile?.avatar_url || "",
        isAdmin: profile?.is_admin || false,
        role: (profile?.role as "owner" | "admin" | null) ?? null,
        bannedUntil: profile?.banned_until || null,
      });
    }
  }, []);

  // Check if owner exists in Supabase
  useEffect(() => {
    (async () => {
      try {
        if (hasSupabase) {
          const { data } = await supabase!.from("profiles").select("id").eq("role", "owner").limit(1);
          if (data && data.length > 0) setHasOwner(true);
        }
        const all = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]");
        if (all.some((u: any) => u.role === "owner")) setHasOwner(true);
      } catch {}
    })();
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dalanying_user");
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch {}
      }
      if (hasSupabase) refreshUser();
      setHydrated(true);
      setLoading(false);
    }
  }, [refreshUser]);

  // Listen to Supabase auth changes
  useEffect(() => {
    if (!hasSupabase) return;
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id).then(profile => {
          const u: AppUser = {
            id: session.user.id,
            name: profile?.nickname || session.user.user_metadata?.full_name || session.user.email!.split("@")[0],
            phone: profile?.phone || "",
            email: session.user.email!,
            avatar: profile?.avatar_url || "",
            isAdmin: profile?.is_admin || false,
            role: (profile?.role as "owner" | "admin" | null) ?? null,
            bannedUntil: profile?.banned_until || null,
          };
          setUser(u);
          localStorage.setItem("dalanying_user", JSON.stringify(u));
          if (!profile?.nickname || profile.nickname === session.user.email?.split("@")[0]) {
            setShowProfileSetup(true);
          }
        });
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const requireLogin = useCallback(() => {
    if (!user) setShowLoginModal(true);
  }, [user]);

  const updateUserProfile = useCallback((updates: { name?: string; avatar?: string; isAdmin?: boolean; role?: "owner" | "admin" | null }) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...(updates.name ? { name: updates.name } : {}), ...(updates.avatar ? { avatar: updates.avatar } : {}), ...(updates.isAdmin !== undefined ? { isAdmin: updates.isAdmin } : {}), ...(updates.role !== undefined ? { role: updates.role } : {}) };
      localStorage.setItem("dalanying_user", JSON.stringify(next));
      return next;
    });
  }, []);

  // ===== Claim owner with password =====
  const claimOwner = useCallback(async (password: string): Promise<boolean> => {
    if (!user) return false;
    if (password !== "dalanying2026owner") return false;
    try {
      // Check if another owner already exists (try Supabase, fallback to localStorage)
      let ownerExists = false;
      if (hasSupabase) {
        try {
          const { data: existing } = await supabase!.from("profiles").select("id").eq("role", "owner").neq("id", user.id).limit(1);
          ownerExists = !!(existing && existing.length > 0);
        } catch { /* role column might not exist yet */ }
      }
      if (!ownerExists) {
        const all = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]");
        ownerExists = all.some((u: any) => u.role === "owner" && u.id !== user.id);
      }
      if (ownerExists) {
        toast.error("站长已存在，无法重复认领");
        return false;
      }
      
      // Try Supabase upsert (ignore if column doesn't exist)
      if (hasSupabase) {
        try {
          await supabase!.from("profiles").upsert({
            id: user.id, nickname: user.name, avatar_url: user.avatar || "",
            is_admin: true, role: "owner",
          }, { onConflict: "id" });
        } catch { /* column might not exist yet, localStorage fallback below */ }
      }
      
      // Update local state (always works)
      setUser(prev => {
        if (!prev) return prev;
        const next = { ...prev, isAdmin: true, role: "owner" as const };
        localStorage.setItem("dalanying_user", JSON.stringify(next));
        return next;
      });
      
      // Also update anon users
      const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]");
      const idx = anonUsers.findIndex((u: any) => u.id === user.id);
      if (idx >= 0) {
        anonUsers[idx].isAdmin = true;
        anonUsers[idx].role = "owner";
        localStorage.setItem("dalanying_anon_users", JSON.stringify(anonUsers));
      }
      
      // Also update user list
      const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]");
      const uidx = users.findIndex((u: any) => u.id === user.id);
      if (uidx >= 0) {
        users[uidx].isAdmin = true;
        users[uidx].role = "owner";
        localStorage.setItem("dalanying_users", JSON.stringify(users));
      }
      
      setHasOwner(true);
      toast.success("站长身份已激活！");
      return true;
    } catch (e) { 
      console.error("claimOwner error:", e);
      return false; 
    }
  }, [user]);

  // ===== Abdicate owner =====
  const abdicateOwner = useCallback(async (password: string): Promise<boolean> => {
    if (!user || user.role !== "owner") return false;
    if (password !== "dalanying2026owner") return false;
    try {
      if (hasSupabase) {
        await supabase!.from("profiles").update({
          is_admin: false,
          role: null,
        }).eq("id", user.id);
      }
      setUser(prev => {
        if (!prev) return prev;
        const next = { ...prev, isAdmin: false, role: null as null };
        localStorage.setItem("dalanying_user", JSON.stringify(next));
        return next;
      });
      toast?.success?.("已让出站长身份");
      return true;
    } catch { return false; }
  }, [user]);

  // ===== Check nickname availability =====
  const checkNameAvailable = useCallback(async (name: string): Promise<boolean> => {
    if (!name.trim() || name.trim().length < 2) return false;
    const trimmed = name.trim();
    // Reserved names
    const RESERVED = ["大岚荧官方", "大岚荧", "admin", "管理员", "系统"];
    if (RESERVED.some(r => r.toLowerCase() === trimmed.toLowerCase())) return false;
    // Check Supabase profiles
    if (hasSupabase) {
      const { data, error } = await supabase!.from("profiles").select("id").eq("nickname", trimmed).limit(1);
      if (!error && data && data.length > 0) return false;
      return true;
    }
    // Check localStorage
    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]") as any[];
    const nameMap = JSON.parse(localStorage.getItem("dalanying_name_map") || "{}");
    // Allow if: not in email users AND (not in anon users OR it's the same browser's account)
    const inAnonUsers = anonUsers.some((u: any) => u.name === trimmed || u === trimmed);
    const isSameBrowser = !!nameMap[trimmed];
    return !users.some((u: AppUser) => u.name === trimmed) && (!inAnonUsers || isSameBrowser);
  }, []);

  // ===== Helper: check if this is the first user (becomes admin) =====
  const checkIsFirstUser = useCallback(async (): Promise<boolean> => {
    try {
      if (hasSupabase) {
        const { count, error } = await supabase!.from("profiles").select("*", { count: "exact", head: true });
        if (!error && count !== null && count === 0) return true;
        return false;
      }
    } catch {}
    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]") as any[];
    return users.length === 0 && anonUsers.length === 0;
  }, []);

  // ===== Quick login (name only) with persistent identity =====
  const quickLogin = useCallback(async (name: string) => {
    const trimmed = name.trim();
    // Reserved names
    const RESERVED = ["大岚荧官方", "大岚荧", "admin", "管理员", "系统"];
    if (RESERVED.some(r => r.toLowerCase() === trimmed.toLowerCase())) return { success: false, error: "该名字不可使用" };
    if (trimmed.length < 2) return { success: false, error: "名字至少需要 2 个字" };
    if (trimmed.length > 12) return { success: false, error: "名字最多 12 个字" };

    // Content moderation
    const modResult = moderateName(trimmed);
    if (!modResult.passed) return { success: false, error: modResult.reason || "名字不合适" };

    // Check if this browser already has this user (same name → restore)
    const nameMap = JSON.parse(localStorage.getItem("dalanying_name_map") || "{}");
    const existingId = nameMap[trimmed];
    
    if (existingId) {
      // Restore existing user from this browser
      const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]");
      const storedUser = anonUsers.find((u: { name: string; id: string }) => u.id === existingId);
      if (storedUser) {
        const restored: AppUser = {
          id: existingId,
          name: trimmed,
          email: "",
          phone: "",
          avatar: storedUser.avatar || generateAvatar(trimmed),
          isAdmin: storedUser.isAdmin || false,
          role: storedUser.role || null,
          bannedUntil: null,
        };
        setUser(restored);
        localStorage.setItem("dalanying_user", JSON.stringify(restored));
        return { success: true };
      }
    }

    // Check global uniqueness
    const available = await checkNameAvailable(trimmed);
    if (!available) return { success: false, error: "这个名字已经被占用了，换一个吧" };

    // Check if first user → auto admin
    const isFirst = await checkIsFirstUser();

    // Generate avatar
    const autoAvatar = generateAvatar(trimmed);

    // Create anonymous user
    const anonId = anonymousId();
    const newUser: AppUser = {
      id: anonId,
      name: trimmed,
      email: "",
      phone: "",
      avatar: autoAvatar,
      isAdmin: false,
      role: null,
      bannedUntil: null,
      isGuest: true,
    };

    // Store in profiles (Supabase)
    if (hasSupabase) {
      await supabase!.from("profiles").upsert({
        id: anonId,
        nickname: trimmed,
        avatar_url: autoAvatar,
        bio: "",
        is_admin: false,
        role: null,
      }, { onConflict: "id" });
    }

    // Store in localStorage - save name→id mapping for persistent login
    nameMap[trimmed] = anonId;
    localStorage.setItem("dalanying_name_map", JSON.stringify(nameMap));
    
    const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]") as any[];
    anonUsers.push({ name: trimmed, id: anonId, avatar: autoAvatar, isAdmin: false, role: null });
    localStorage.setItem("dalanying_anon_users", JSON.stringify(anonUsers));

    setUser(newUser);
    localStorage.setItem("dalanying_user", JSON.stringify(newUser));
    return { success: true };
  }, [checkNameAvailable]);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) return { success: false, error: "请输入邮箱和密码", code: "empty" };
    const check = isValidEmail(email);
    if (!check.valid) return { success: false, error: check.reason || "邮箱格式不正确", code: "invalid_email" };
    if (password.length < 6) return { success: false, error: "密码至少6位", code: "short_password" };

    if (hasSupabase) {
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login")) return { success: false, error: "邮箱或密码错误", code: "wrong_credentials" };
        if (error.message.includes("Email not confirmed")) return { success: false, error: "账号未激活，请先前往邮箱点击验证链接", code: "not_confirmed" };
        return { success: false, error: error.message, code: "unknown" };
      }
      const profile = await fetchProfile(data.user.id);
      const u: AppUser = {
        id: data.user.id,
        name: profile?.nickname || data.user.user_metadata?.full_name || email.split("@")[0],
        email,
        phone: profile?.phone || "",
        avatar: profile?.avatar_url || "",
        isAdmin: profile?.is_admin || false,
            role: (profile?.role as "owner" | "admin" | null) ?? null,
        bannedUntil: profile?.banned_until || null,
      };
      setUser(u);
      localStorage.setItem("dalanying_user", JSON.stringify(u));
      if (!profile?.nickname || profile.nickname === email.split("@")[0]) setShowProfileSetup(true);
      return { success: true };
    }

    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    const existing = users.find((u: AppUser) => u.email === email);
    if (!existing) return { success: false, error: "该邮箱未注册", code: "not_found" };
    // Simple password check for localStorage users
    if (existing.id.split("_")[0] !== "anon" && existing.id !== password.split("").reduce((a, c) => a + c.charCodeAt(0), 0).toString()) {
      return { success: false, error: "密码错误", code: "wrong_password" };
    }
    setUser(existing);
    localStorage.setItem("dalanying_user", JSON.stringify(existing));
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    if (!name.trim() || !email.trim() || !password.trim()) return { success: false, error: "请填写所有字段", code: "empty" };
    // Validate phone if provided
    if (phone && !/^1[3-9]\d{9}$/.test(phone.trim())) {
      return { success: false, error: "请输入正确的手机号", code: "invalid_phone" };
    }
    if (name.trim().length < 2) return { success: false, error: "昵称至少2个字符", code: "short_name" };
    const check = isValidEmail(email);
    if (!check.valid) return { success: false, error: check.reason || "邮箱格式不正确", code: "invalid_email" };
    if (password.length < 6) return { success: false, error: "密码至少6位", code: "short_password" };

    if (hasSupabase) {
      const { data, error } = await supabase!.auth.signUp({
        email, password,
        options: {
          data: { full_name: name, phone: phone || "" },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) {
        if (error.message.includes("already registered")) return { success: false, error: "该邮箱已注册", code: "exists" };
        return { success: false, error: error.message, code: "unknown" };
      }
      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) return { success: false, error: "该邮箱已注册", code: "exists" };
        // Fetch registration count
        try {
          const res = await fetch("/api/profiles?count=true");
          const countData = await res.json();
          if (countData.count > 0) setRegistrationCount(countData.count);
        } catch {}
        return { success: true, code: "check_email" };
      }
      return { success: true, code: "check_email" };
    }

    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    if (users.some((u: AppUser) => u.email === email)) return { success: false, error: "该邮箱已注册", code: "exists" };
    const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]") as string[];
    const isFirst = users.length === 0 && anonUsers.length === 0;
    const newUser: AppUser = { id: "email_" + password.split("").reduce((a, c) => a + c.charCodeAt(0), 0), name, email, phone: phone || "", avatar: "", isAdmin: false, role: null, bannedUntil: null };
    users.push(newUser);
    localStorage.setItem("dalanying_users", JSON.stringify(users));
    setUser(newUser);
    localStorage.setItem("dalanying_user", JSON.stringify(newUser));
    return { success: true };
  }, []);


  // ===== Phone OTP Auth =====
  const sendPhoneOTP = useCallback(async (phone: string): Promise<{ success: boolean; error?: string }> => {
    const formatted = phone.startsWith("+") ? phone : "+86" + phone;
    // Try Supabase phone OTP first
    if (hasSupabase) {
      try {
        const { error } = await supabase!.auth.signInWithOtp({ phone: formatted });
        if (!error) return { success: true };
        // If Supabase SMS fails, fall through to local OTP
        console.log("Supabase SMS failed, using local OTP fallback:", error.message);
      } catch {}
    }
    // Supabase SMS not configured — inform user to use email login instead
    toast.error("短信服务未配置，请使用邮箱验证码登录");
    return { success: false, error: "短信服务未配置，请使用邮箱验证码登录" };
  }, []);

  const verifyPhoneOTP = useCallback(async (phone: string, token: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    const formatted = phone.startsWith("+") ? phone : "+86" + phone;

    // Try local OTP first (fallback mode)
    if (localOTP && localOTP.phone === formatted) {
      if (Date.now() > localOTP.expires) { setLocalOTP(null); return { success: false, error: "验证码已过期，请重新发送" }; }
      if (token !== localOTP.code) return { success: false, error: "验证码错误" };
      setLocalOTP(null);
      // Create local user
      const uid = "phone_" + formatted.replace(/\D/g, "");
      const nick = name || "用户" + Date.now().toString(36).slice(-4);
      // Check if user exists in localStorage
      const existingProfile = localStorage.getItem("dalanying_profile_" + uid);
      let userNick = nick;
      if (existingProfile) {
        try { const p = JSON.parse(existingProfile); if (p.nickname) userNick = p.nickname; } catch {}
      }
      const newUser: AppUser = { id: uid, name: userNick, email: "", phone: formatted, avatar: "", isAdmin: false, role: null, bannedUntil: null };
      setUser(newUser);
      localStorage.setItem("dalanying_user", JSON.stringify(newUser));
      localStorage.setItem("dalanying_profile_" + uid, JSON.stringify({ id: uid, nickname: userNick, phone: formatted }));
      // Registration count
      try {
        const users = JSON.parse(localStorage.getItem("dalanying_phone_users") || "[]");
        if (!users.includes(uid)) { users.push(uid); localStorage.setItem("dalanying_phone_users", JSON.stringify(users)); }
        setRegistrationCount(users.length);
      } catch {}
      setShowProfileSetup(true);
      return { success: true };
    }

    // Try Supabase OTP
    if (hasSupabase) {
      try {
        const { data, error } = await supabase!.auth.verifyOtp({ phone: formatted, token, type: "sms" });
        if (error) {
          if (error.message.includes("invalid")) return { success: false, error: "验证码错误或已过期" };
          return { success: false, error: error.message };
        }
        if (data.user) {
          const profile = await fetchProfile(data.user.id);
          if (!profile || !profile.nickname) {
            const nick = name || "用户" + Date.now().toString(36).slice(-4);
            await supabase!.from("profiles").upsert({
              id: data.user.id, nickname: nick, avatar_url: "", phone: formatted,
            }, { onConflict: "id" });
            try {
              const { count } = await supabase!.from("profiles").select("*", { count: "exact", head: true });
              setRegistrationCount(count || null);
            } catch {}
            setShowProfileSetup(true);
          }
          await refreshUser();
        }
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || "验证失败" };
      }
    }

    return { success: false, error: "验证失败" };
  }, [refreshUser, localOTP]);


  // ===== Email OTP Auth =====
  const sendEmailOTP = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!hasSupabase) return { success: false, error: "系统未配置 Supabase" };
    
    try {
      // 15秒超时，防止网络问题导致按钮一直卡在"发送中"
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("请求超时，请检查网络")), 15000)
      );
      const otpPromise = supabase!.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      const { error } = await Promise.race([otpPromise, timeoutPromise]);
      
      if (error) {
        console.error("发送验证码失败:", error.message);
        if (error.message.includes("rate limit") || error.message.includes("429") || error.message.includes("after")) {
          // 提取等待秒数
          const match = error.message.match(/after (\d+) seconds/);
          const secs = match ? match[1] : "60";
          return { success: false, error: `发送太频繁，请${secs}秒后再试` };
        }
        if (error.message.includes("超时")) {
          return { success: false, error: "网络超时，请检查网络后重试" };
        }
        return { success: false, error: "发送失败，请稍后重试" };
      }
      
      console.log("验证码已发送到邮箱:", email);
      return { success: true };
    } catch (e: any) {
      console.error("发送验证码异常:", e);
      if (e.message?.includes("超时") || e.message?.includes("timeout")) {
        return { success: false, error: "网络超时，请检查网络后重试" };
      }
      return { success: false, error: "发送失败，请稍后重试" };
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!hasSupabase) return { success: false, error: "系统未配置 Supabase" };
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, error: error.message.includes("rate") ? "发送太频繁，请稍后再试" : "发送失败" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "网络错误，请稍后重试" };
    }
  }, []);

  const verifyEmailOTP = useCallback(async (email: string, token: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    if (!hasSupabase) return { success: false, error: "未配置 Supabase" };
    
    try {
      const { data, error } = await supabase!.auth.verifyOtp({ 
        email, 
        token, 
        type: "email" 
      });
      
      if (error) {
        console.error("验证码验证失败:", error.message);
        if (error.message.includes("Token has expired") || error.message.includes("expired")) {
          return { success: false, error: "验证码已过期，请重新发送" };
        }
        if (error.message.includes("invalid") || error.message.includes("OTP")) {
          return { success: false, error: "验证码错误，请检查邮箱中的8位数字" };
        }
        return { success: false, error: "验证失败，请重新发送验证码" };
      }
      
      if (data.user) {
        console.log("验证码验证成功，用户:", data.user.id);
        
        // 检查并创建用户资料
        const profile = await fetchProfile(data.user.id);
        const isNewUser = !profile || !profile.nickname;
        if (isNewUser) {
          const nick = name || "用户" + Date.now().toString(36).slice(-4);
          await supabase!.from("profiles").upsert({
            id: data.user.id, 
            nickname: nick, 
            avatar_url: "", 
            phone: "",
          }, { onConflict: "id" });
        }
        
        // Always fetch registration count (for both new and returning users)
        try {
          const res = await fetch("/api/profiles?count=true");
          const countData = await res.json();
          if (countData.count > 0) setRegistrationCount(countData.count);
        } catch {}
        
        await refreshUser();
        
        if (isNewUser) {
          setShowProfileSetup(true);
        }
      }
      
      return { success: true };
    } catch (e: any) {
      console.error("验证码验证异常:", e);
      return { success: false, error: e.message || "验证失败" };
    }
  }, [refreshUser]);

  // ===== Bind Email (for guest users) =====
  const bindEmail = useCallback(async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
    if (!hasSupabase) return { success: false, error: "未配置 Supabase" };
    if (!user) return { success: false, error: "未登录" };

    try {
      // Verify the OTP
      const { data, error } = await supabase!.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) {
        if (error.message.includes("invalid") || error.message.includes("expired")) {
          return { success: false, error: "验证码错误或已过期" };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Update profile with the new email and supabase user id
        // Migrate: copy old profile data to new supabase user id
        const oldId = user.id;
        const newId = data.user.id;
        const oldProfile = await fetchProfile(oldId);

        // Create/update profile under new supabase user id
        await supabase!.from("profiles").upsert({
          id: newId,
          nickname: user.name,
          avatar_url: user.avatar,
          bio: oldProfile?.bio || "",
          phone: user.phone || "",
        }, { onConflict: "id" });

        // Migrate posts: update author_id from old to new
        try {
          await supabase!.from("posts").update({ user_id: newId }).eq("user_id", oldId);
        } catch {}

        // Migrate comments
        try {
          await supabase!.from("comments").update({ user_id: newId }).eq("user_id", oldId);
        } catch {}

        // Migrate likes
        try {
          await supabase!.from("likes").update({ user_id: newId }).eq("user_id", oldId);
        } catch {}

        // Delete old anonymous profile
        try {
          if (oldId.startsWith("anon_") || oldId.startsWith("phone_") || oldId.startsWith("email_")) {
            await supabase!.from("profiles").delete().eq("id", oldId);
          }
        } catch {}

        // Update local user state
        const updatedUser: AppUser = {
          ...user,
          id: newId,
          email,
          isGuest: false,
        };
        setUser(updatedUser);
        localStorage.setItem("dalanying_user", JSON.stringify(updatedUser));

        // Update name map
        try {
          const nameMap = JSON.parse(localStorage.getItem("dalanying_name_map") || "{}");
          delete nameMap[user.name];
          localStorage.setItem("dalanying_name_map", JSON.stringify(nameMap));
        } catch {}

        console.log("邮箱绑定成功:", email, "新ID:", newId);
      }

      return { success: true };
    } catch (e: any) {
      console.error("绑定邮箱异常:", e);
      return { success: false, error: e.message || "绑定失败" };
    }
  }, [user]);

  // ===== Delete Account =====
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "未登录" };

    try {
      if (hasSupabase) {
        // Mark profile as deleted (soft delete) - posts stay visible
        await supabase!.from("profiles").update({
          nickname: "已注销用户",
          avatar_url: "",
          bio: "",
          deleted: true,
        }).eq("id", user.id);
      }

      // Clear local state
      setUser(null);
      localStorage.removeItem("dalanying_user");

      // Clear name map entry
      try {
        const nameMap = JSON.parse(localStorage.getItem("dalanying_name_map") || "{}");
        delete nameMap[user.name];
        localStorage.setItem("dalanying_name_map", JSON.stringify(nameMap));
      } catch {}

      // Clear from anon users list
      try {
        const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]");
        const filtered = anonUsers.filter((u: { id: string }) => u.id !== user.id);
        localStorage.setItem("dalanying_anon_users", JSON.stringify(filtered));
      } catch {}

      console.log("账户已注销:", user.id);
      return { success: true };
    } catch (e: any) {
      console.error("注销账户异常:", e);
      return { success: false, error: e.message || "注销失败" };
    }
  }, [user]);

  const logout = useCallback(async () => {
    if (hasSupabase) {
      const { data: session } = await supabase!.auth.getSession();
      if (session?.session) await supabase!.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem("dalanying_user");
  }, []);

  if (!hydrated) return <div style={{ minHeight: "100vh", background: "#0c0c0e" }} />;

  return (
    <AuthContext.Provider value={{
      user, loading, requireLogin, login, register, logout,
      quickLogin, checkNameAvailable,
      refreshUser, updateUserProfile,
      showLoginModal, setShowLoginModal,
      showProfileSetup, setShowProfileSetup,
      claimOwner, abdicateOwner, hasOwner,
      registrationCount,
      guestLikes, toggleGuestLike,
      sendPhoneOTP, verifyPhoneOTP, sendEmailOTP, verifyEmailOTP, resetPassword,
      bindEmail, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
