"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase, hasSupabase } from "./supabase";
import { moderateName } from "./moderation";
import { generateAvatar } from "./avatar";
import { fetchProfile, updateProfile } from "./data";

export { fetchProfile, updateProfile };

// ===== Types =====
export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isAdmin: boolean;
  bannedUntil: string | null;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  requireLogin: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  quickLogin: (name: string) => Promise<{ success: boolean; error?: string }>;
  checkNameAvailable: (name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; avatar?: string; isAdmin?: boolean }) => void;
  setShowLoginModal: (show: boolean) => void;
  showLoginModal: boolean;
  showProfileSetup: boolean;
  setShowProfileSetup: (show: boolean) => void;
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
  return "anon_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!hasSupabase) return;
    const { data: session } = await supabase!.auth.getSession();
    if (session?.session?.user) {
      const profile = await fetchProfile(session.session.user.id);
      setUser({
        id: session.session.user.id,
        name: profile?.nickname || session.session.user.user_metadata?.full_name || session.session.user.email!.split("@")[0],
        email: session.session.user.email!,
        avatar: profile?.avatar_url || "",
        isAdmin: profile?.is_admin || false,
        bannedUntil: profile?.banned_until || null,
      });
    }
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
            email: session.user.email!,
            avatar: profile?.avatar_url || "",
            isAdmin: profile?.is_admin || false,
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

  const updateUserProfile = useCallback((updates: { name?: string; avatar?: string; isAdmin?: boolean }) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...(updates.name ? { name: updates.name } : {}), ...(updates.avatar ? { avatar: updates.avatar } : {}), ...(updates.isAdmin !== undefined ? { isAdmin: updates.isAdmin } : {}) };
      localStorage.setItem("dalanying_user", JSON.stringify(next));
      return next;
    });
  }, []);

  // ===== Check nickname availability =====
  const checkNameAvailable = useCallback(async (name: string): Promise<boolean> => {
    if (!name.trim() || name.trim().length < 2) return false;
    const trimmed = name.trim();
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
    if (trimmed.length < 2) return { success: false, error: "名字至少需要 2 个字" };
    if (trimmed.length > 12) return { success: false, error: "名字最多 12 个字" };

    // Content moderation
    const modResult = moderateName(trimmed);
    if (!modResult.allowed) return { success: false, error: modResult.reason || "名字不合适" };

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
          avatar: storedUser.avatar || generateAvatar(trimmed),
          isAdmin: storedUser.isAdmin || false,
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
      avatar: autoAvatar,
      isAdmin: isFirst,
      bannedUntil: null,
    };

    // Store in profiles (Supabase)
    if (hasSupabase) {
      await supabase!.from("profiles").upsert({
        id: anonId,
        nickname: trimmed,
        avatar_url: autoAvatar,
        bio: "",
        is_admin: isFirst,
      }, { onConflict: "id" });
    }

    // Store in localStorage - save name→id mapping for persistent login
    nameMap[trimmed] = anonId;
    localStorage.setItem("dalanying_name_map", JSON.stringify(nameMap));
    
    const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]") as any[];
    anonUsers.push({ name: trimmed, id: anonId, avatar: autoAvatar, isAdmin: isFirst });
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
        avatar: profile?.avatar_url || "",
        isAdmin: profile?.is_admin || false,
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

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim() || !email.trim() || !password.trim()) return { success: false, error: "请填写所有字段", code: "empty" };
    if (name.trim().length < 2) return { success: false, error: "昵称至少2个字符", code: "short_name" };
    const check = isValidEmail(email);
    if (!check.valid) return { success: false, error: check.reason || "邮箱格式不正确", code: "invalid_email" };
    if (password.length < 6) return { success: false, error: "密码至少6位", code: "short_password" };

    if (hasSupabase) {
      const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) {
        if (error.message.includes("already registered")) return { success: false, error: "该邮箱已注册", code: "exists" };
        return { success: false, error: error.message, code: "unknown" };
      }
      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) return { success: false, error: "该邮箱已注册", code: "exists" };
        return { success: true, code: "check_email" };
      }
      return { success: true, code: "check_email" };
    }

    const users = JSON.parse(localStorage.getItem("dalanying_users") || "[]") as AppUser[];
    if (users.some((u: AppUser) => u.email === email)) return { success: false, error: "该邮箱已注册", code: "exists" };
    const anonUsers = JSON.parse(localStorage.getItem("dalanying_anon_users") || "[]") as string[];
    const isFirst = users.length === 0 && anonUsers.length === 0;
    const newUser: AppUser = { id: "email_" + password.split("").reduce((a, c) => a + c.charCodeAt(0), 0), name, email, avatar: "", isAdmin: isFirst, bannedUntil: null };
    users.push(newUser);
    localStorage.setItem("dalanying_users", JSON.stringify(users));
    setUser(newUser);
    localStorage.setItem("dalanying_user", JSON.stringify(newUser));
    return { success: true };
  }, []);

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
