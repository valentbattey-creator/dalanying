"use client";

import { supabase, hasSupabase } from "./supabase";
import { expandSearchQuery, fuzzyMatch } from "./search";

// ===== Category & Tag System =====
export const CATEGORIES = [
  "推荐", "数码", "科技", "汽车", "运动", "游戏", "健身", "户外", "财经",
  "美食", "旅游", "音乐", "电影", "时尚", "宠物", "摄影", "读书",
  "职场", "教育", "房产", "军事", "历史", "哲学", "设计", "动漫",
  "骑行", "钓鱼", "篮球", "足球", "跑步", "格斗", "穿搭", "机车",
  "思维探讨", "谈婚论嫁", "成长", "健康", "手工", "家居", "天文", "趣闻", "科普",
];

// ===== Types =====
export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  bio: string;
  is_admin: boolean;
  role: "owner" | "admin" | null;
  banned_until: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  category: string;
  tags: string[];
  author: string;
  authorId: string;
  authorAvatar: string;
  createdAt: string;
  likes: number;
  views: number;
  comments: number;
  isAnnouncement: boolean;
  isPinned: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  authorId: string;
  authorAvatar: string;
  content: string;
  image: string;
  createdAt: string;
}

// ===== Helpers =====
function gid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 10); }

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem("dalanying_" + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("dalanying_" + key, JSON.stringify(value)); } catch {}
}

// ===== Seed Data =====
const SEED_POSTS: Post[] = [
  { id: "seed1", title: "欢迎来到大岚荧", content: "这是一个属于硬汉的社区。分享你的生活、爱好和态度，和志同道合的兄弟一起交流。无论你是喜欢科技、运动、汽车还是游戏，这里都有你的位置。", images: [], category: "推荐", tags: ["公告"], author: "大岚荧官方", authorId: "system", authorAvatar: "", createdAt: "2026-07-09T00:00:00Z", likes: 42, views: 1280, comments: 8, isAnnouncement: true, isPinned: true },
  { id: "seed2", title: "NBA夏季联赛观赛指南", content: "今年夏季联赛看点颇多，各队新秀表现如何？让我们一起来分析一下。", images: [], category: "篮球", tags: ["NBA", "篮球"], author: "球场老兵", authorId: "seeduser2", authorAvatar: "", createdAt: "2026-07-08T12:00:00Z", likes: 28, views: 560, comments: 5, isAnnouncement: false, isPinned: false },
  { id: "seed3", title: "我的新车改装日记", content: "终于完成了这台车的改装，从轮毂到排气，一步步记录下这个历程。", images: [], category: "汽车", tags: ["改装", "汽车"], author: "改装达人", authorId: "seeduser3", authorAvatar: "", createdAt: "2026-07-07T08:00:00Z", likes: 35, views: 720, comments: 12, isAnnouncement: false, isPinned: false },
];
const SEED_COMMENTS: Comment[] = [
  { id: "c1", postId: "seed1", parentId: null, author: "新来的", authorId: "u1", authorAvatar: "", content: "来报道！支持一下", image: "", createdAt: "2026-07-09T01:00:00Z" },
];

// ===== API Helpers =====
let apiCache: { baseUrl: string; available: boolean | null } = { baseUrl: "", available: null };

function getApiBase(): string {
  if (!apiCache.baseUrl) {
    apiCache.baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  }
  return apiCache.baseUrl;
}

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(getApiBase() + path, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(getApiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

async function apiPatch(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(getApiBase() + path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

async function apiDelete(path: string): Promise<boolean> {
  try {
    const res = await fetch(getApiBase() + path, { method: "DELETE" });
    return res.ok;
  } catch { return false; }
}

// ===== Data Service =====
export const dataService = {
  PAGE_SIZE: 10,

  async fetchPostsPaginated(from: number, category?: string, search?: string): Promise<{ posts: Post[]; total: number }> {
    // Try API route first (uses service role key to bypass RLS)
    const params = new URLSearchParams();
    params.set("from", String(from));
    params.set("to", String(from + this.PAGE_SIZE - 1));
    if (category && category !== "推荐") params.set("category", category);
    if (search) params.set("search", search);

    const apiResult = await apiGet<{ posts: Post[]; total: number; error?: string }>(`/api/posts?${params.toString()}`);

    if (apiResult && apiResult.posts && !apiResult.error) {
      // Merge with localStorage posts
      const localPosts = lsGet<Post[]>("posts", []);
      const serverIds = new Set(apiResult.posts.map(p => p.id));
      const missing = localPosts.filter(p => !serverIds.has(p.id));
      let merged = [...apiResult.posts, ...missing];

      // Apply filters to local posts
      if (category && category !== "推荐") merged = merged.filter(p => p.category === category || serverIds.has(p.id));
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        merged = merged.filter(p => {
          if (serverIds.has(p.id)) return true; // Server already filtered
          return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
        });
      }

      merged.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        posts: merged.slice(from, from + this.PAGE_SIZE),
        total: apiResult.total + missing.length,
      };
    }

    // Fallback: localStorage only
    let all = [...SEED_POSTS, ...lsGet<Post[]>("posts", [])];
    if (category && category !== "推荐") all = all.filter(p => p.category === category);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      all = all.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    all.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return { posts: all.slice(from, from + this.PAGE_SIZE), total: all.length };
  },

  async fetchPostById(postId: string): Promise<Post | null> {
    // Try API
    const apiResult = await apiGet<any>(`/api/posts/${postId}`);
    if (apiResult && !apiResult.error) {
      return apiResult as Post;
    }
    // Fallback
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].find(p => p.id === postId) || null;
  },

  async fetchUserPosts(userId: string): Promise<Post[]> {
    const params = new URLSearchParams();
    params.set("from", "0");
    params.set("to", "99");
    params.set("userId", userId);
    const apiResult = await apiGet<{ posts: Post[]; total: number }>(`/api/posts?${params.toString()}`);
    if (apiResult && apiResult.posts && apiResult.posts.length > 0) return apiResult.posts;
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].filter(p => p.authorId === userId);
  },

  async fetchUserLikedPosts(userId: string): Promise<Post[]> {
    // Try API
    const likedResult = await apiGet<{ likes: string[] }>(`/api/likes?userId=${encodeURIComponent(userId)}`);
    if (likedResult && likedResult.likes && likedResult.likes.length > 0) {
      const ids = likedResult.likes;
      // Fetch posts by IDs
      const allResult = await apiGet<{ posts: Post[] }>(`/api/posts?from=0&to=999`);
      if (allResult && allResult.posts) {
        return allResult.posts.filter(p => ids.includes(p.id));
      }
    }
    const likedKeys = lsGet<string[]>("likedPosts", []);
    const ids = likedKeys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].filter(p => ids.includes(p.id));
  },

  async fetchUserSavedPosts(userId: string): Promise<Post[]> {
    const savedKeys = lsGet<string[]>("savedPosts", []);
    const ids = savedKeys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].filter(p => ids.includes(p.id));
  },

  async createPost(post: Omit<Post, "id" | "createdAt" | "likes" | "comments" | "views">): Promise<Post> {
    // Try API first
    const apiResult = await apiPost<any>("/api/posts", {
      title: post.title,
      content: post.content,
      images: post.images || [],
      category: post.category || "推荐",
      tags: post.tags || [],
      authorId: post.authorId,
      author: post.author,
      authorAvatar: post.authorAvatar || "",
      isPinned: post.isPinned || false,
      isAnnouncement: post.isAnnouncement || false,
    });

    if (apiResult && !apiResult.error) {
      // Sync to localStorage as backup
      const posts = lsGet<Post[]>("posts", []);
      posts.unshift(apiResult);
      lsSet("posts", posts);
      return apiResult;
    }

    // Fallback: localStorage only
    const newPost: Post = {
      ...post as any,
      id: gid(),
      createdAt: new Date().toISOString(),
      likes: 0, comments: 0, views: 0,
    };
    const posts = lsGet<Post[]>("posts", []);
    posts.unshift(newPost);
    if (posts.length > 500) posts.length = 500;
    lsSet("posts", posts);
    return newPost;
  },

  async deletePost(postId: string): Promise<boolean> {
    // Try API
    const apiOk = await apiDelete(`/api/posts/${postId}`);
    // Always clean localStorage
    const posts = lsGet<Post[]>("posts", []);
    lsSet("posts", posts.filter(p => p.id !== postId));
    const comments = lsGet<Comment[]>("comments", []);
    lsSet("comments", comments.filter(c => c.postId !== postId));
    return apiOk || true;
  },

  async updatePost(postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[]; images?: string[]; isPinned?: boolean; isAnnouncement?: boolean }): Promise<boolean> {
    const apiOk = await apiPatch(`/api/posts/${postId}`, { ...updates, image_urls: updates.images });
    // Update localStorage
    const posts = lsGet<Post[]>("posts", []);
    lsSet("posts", posts.map(p => p.id === postId ? { ...p, ...updates } : p));
    return apiOk || true;
  },

  async fetchComments(postId?: string): Promise<Comment[]> {
    if (!postId) return [...SEED_COMMENTS, ...lsGet<Comment[]>("comments", [])];
    const apiResult = await apiGet<{ comments: Comment[] }>(`/api/comments?postId=${encodeURIComponent(postId)}`);
    if (apiResult && apiResult.comments) return apiResult.comments;
    return [...SEED_COMMENTS, ...lsGet<Comment[]>("comments", [])].filter(c => c.postId === postId);
  },

  async createComment(data: { postId: string; parentId: string | null; author: string; authorId: string; authorAvatar: string; content: string; image?: string }): Promise<Comment | null> {
    const apiResult = await apiPost<any>("/api/comments", data);
    if (apiResult && !apiResult.error) {
      const comments = lsGet<Comment[]>("comments", []);
      comments.push(apiResult);
      lsSet("comments", comments);
      return apiResult;
    }
    // Fallback
    const comment: Comment = {
      id: gid(), postId: data.postId, parentId: data.parentId,
      author: data.author, authorId: data.authorId, authorAvatar: data.authorAvatar,
      content: data.content, image: data.image || "", createdAt: new Date().toISOString(),
    };
    const comments = lsGet<Comment[]>("comments", []);
    comments.push(comment);
    lsSet("comments", comments);
    return comment;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    // No dedicated API route for deleting comments yet, handle locally
    const comments = lsGet<Comment[]>("comments", []);
    lsSet("comments", comments.filter(c => c.id !== commentId && c.parentId !== commentId));
    return true;
  },

  async toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<number> {
    const apiResult = await apiPost<{ count: number; error?: string }>("/api/likes", {
      postId, userId, toggle: currentlyLiked,
    });
    if (apiResult && !apiResult.error && typeof apiResult.count === "number") {
      return apiResult.count;
    }
    // Fallback: estimate
    const key = postId + "_" + userId;
    const liked = lsGet<string[]>("likedPosts", []);
    const newLiked = currentlyLiked ? liked.filter(k => k !== key) : [...liked, key];
    lsSet("likedPosts", newLiked);
    return newLiked.length;
  },

  toggleSave(postId: string, userId: string, currentlySaved: boolean): void {
    const key = postId + "_" + userId;
    const saved = lsGet<string[]>("savedPosts", []);
    const newSaved = currentlySaved ? saved.filter(k => k !== key) : [...saved, key];
    lsSet("savedPosts", newSaved);
  },

  async fetchProfile(userId: string): Promise<Profile | null> {
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (data) {
          const d = data as Record<string, unknown>;
          return { id: String(d.id), nickname: String(d.nickname || ""),
            avatar_url: String(d.avatar_url || ""), bio: String(d.bio || ""),
            is_admin: Boolean(d.is_admin), role: (d.role as "owner" | "admin" | null) ?? null,
            banned_until: d.banned_until ? String(d.banned_until) : null };
        }
      } catch {}
    }
    if (typeof window !== "undefined") {
      try { const v = localStorage.getItem("dalanying_profile_" + userId); if (v) return JSON.parse(v); } catch {}
    }
    return null;
  },

  async fetchAllProfiles(): Promise<Profile[]> {
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase.from("profiles").select("*");
        if (data) return (data as Record<string, unknown>[]).map(d => ({
          id: String(d.id), nickname: String(d.nickname || ""),
          avatar_url: String(d.avatar_url || ""), bio: String(d.bio || ""),
          is_admin: Boolean(d.is_admin), role: (d.role as "owner" | "admin" | null) ?? null,
          banned_until: d.banned_until ? String(d.banned_until) : null,
        }));
      } catch {}
    }
    return [];
  },

  async updateProfile(userId: string, updates: { nickname?: string; avatar_url?: string; bio?: string; is_admin?: boolean; role?: string; banned_until?: string | null }): Promise<boolean> {
    if (hasSupabase && supabase) {
      try {
        await supabase.from("profiles").upsert({ id: userId, ...updates as any }, { onConflict: "id" });
      } catch {}
    }
    if (typeof window !== "undefined") {
      try {
        const key = "dalanying_profile_" + userId;
        const existing = JSON.parse(localStorage.getItem(key) || "{}");
        localStorage.setItem(key, JSON.stringify({ ...existing, ...updates }));
      } catch {}
    }
    return true;
  },

  async isNicknameTaken(nickname: string, excludeUserId?: string): Promise<boolean> {
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase.from("profiles").select("id,nickname")
          .ilike("nickname", nickname);
        if (data) return (data as any[]).some((p: any) =>
          p.nickname.toLowerCase() === nickname.toLowerCase() && p.id !== excludeUserId);
      } catch {}
    }
    return false;
  },

  // ===== Upload =====
  async uploadImage(file: File, folder?: string): Promise<string | null> {
    if (!hasSupabase || !supabase) return null;
    try {
      const bytes = await file.arrayBuffer();
      const fileName = `${folder || "posts"}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage.from("post-images").upload(fileName, bytes, {
        contentType: file.type, upsert: true,
      });
      if (error) { console.warn("Upload error:", error.message); return null; }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (e) { console.warn("Upload failed:", e); return null; }
  },

  // ===== Admin =====
  async setAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
    return this.updateProfile(userId, { is_admin: isAdmin });
  },

  async banUser(userId: string, until: string): Promise<boolean> {
    return this.updateProfile(userId, { banned_until: until });
  },

  async unbanUser(userId: string): Promise<boolean> {
    return this.updateProfile(userId, { banned_until: null });
  },
// ===== Backward Compat Exports =====
export async function syncSeedToSupabase(userId: string): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  try {
    const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
    if ((count || 0) === 0) {
      for (const seed of SEED_POSTS) {
        await supabase.from("posts").insert({
          title: seed.title, content: seed.content, image_urls: seed.images,
          category: seed.category, tags: seed.tags, user_id: seed.authorId === "system" ? userId : seed.authorId,
          created_at: seed.createdAt, is_pinned: seed.isPinned, is_announcement: seed.isAnnouncement,
        });
      }
      return true;
    }
  } catch {}
  return false;
}

export async function banUser(userId: string, until: string) { return dataService.banUser(userId, until); }
export async function unbanUser(userId: string) { return dataService.unbanUser(userId); }
export async function fetchAllProfiles() { return dataService.fetchAllProfiles(); }
export async function fetchProfile(userId: string) { return dataService.fetchProfile(userId); }
export async function updateProfile(userId: string, updates: any) { return dataService.updateProfile(userId, updates); }
export async function uploadAvatar(file: File, userId: string) { return dataService.uploadImage(file, "avatars") || ""; }

export async function createAnnouncement(post: Omit<Post, "id" | "createdAt" | "likes" | "comments">): Promise<Post | null> {
  return dataService.createPost({ ...post, isAnnouncement: true, isPinned: true });
}


dataService.fetchLikes = async function (userId: string): Promise<{ userLikes: Set<string> }> {
  const liked = lsGet<string[]>("likedPosts", []);
  const ids = liked.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
  return { userLikes: new Set(ids) };
};
dataService.loadSavedPosts = function (userId: string): Set<string> {
  const saved = lsGet<string[]>("savedPosts", []);
  const ids = saved.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
  return new Set(ids);
};
