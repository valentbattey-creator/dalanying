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
  phone: string;
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
function isValidUUID(id: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id); }
function safeUUID(id: string | undefined | null): string | null { return id && isValidUUID(id) ? id : null; }

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

async function apiPut<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(getApiBase() + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

// ===== Direct Supabase Fallback (bypasses Vercel API when unavailable) =====
async function directSupabaseGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  try {
    if (!supabase) return null;
    const url = new URL(path, "https://aawoajhmhvysedabncoz.supabase.co");
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: {
        "apikey": "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh",
        "Authorization": "Bearer sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh",
      },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
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
      // Auto-sync localStorage posts to Supabase in background
      this.syncLocalPosts().catch(() => {});
      
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

    // Fallback 2: Try direct Supabase (bypasses Vercel API)
    try {
      const sbUrl = "https://aawoajhmhvysedabncoz.supabase.co/rest/v1/posts";
      const sbParams = new URLSearchParams({
        select: "*,profiles!posts_user_id_fkey(nickname,avatar_url)",
        order: "is_pinned.desc,created_at.desc",
        offset: String(from),
        limit: String(from + this.PAGE_SIZE),
      });
      if (search) sbParams.set("or", `(title.ilike.%${search}%,content.ilike.%${search}%)`);
      const sbRes = await fetch(`${sbUrl}?${sbParams.toString()}`, {
        headers: {
          "apikey": "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh",
          "Authorization": "Bearer sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh",
        },
      });
      console.log("[createPost] Supabase响应:", sbRes.status, sbRes.ok);
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData) && sbData.length > 0) {
          // Get likes & comments counts
          const postIds = sbData.map((i: any) => i.id);
          let likesMap = new Map<string, number>();
          let commentsMap = new Map<string, number>();
          try {
            const [lr, cr] = await Promise.all([
              fetch(`https://aawoajhmhvysedabncoz.supabase.co/rest/v1/likes?select=post_id&post_id=in.(${postIds.join(",")})`, {
                headers: { "apikey": "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh" },
              }),
              fetch(`https://aawoajhmhvysedabncoz.supabase.co/rest/v1/comments?select=post_id&post_id=in.(${postIds.join(",")})`, {
                headers: { "apikey": "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh" },
              }),
            ]);
            if (lr.ok) { (await lr.json()).forEach((r: any) => { const k = String(r.post_id); likesMap.set(k, (likesMap.get(k)||0)+1); }); }
            if (cr.ok) { (await cr.json()).forEach((r: any) => { const k = String(r.post_id); commentsMap.set(k, (commentsMap.get(k)||0)+1); }); }
          } catch {}
          
          const REVERSE_CAT: Record<string,string> = { "tech": "推荐", "fitness": "运动" };
          let posts = sbData.map((item: any) => {
            const tags = (item.tags || []).filter((t: string) => !t.startsWith("__cat:"));
            const catTag = (item.tags || []).find((t: string) => t.startsWith("__cat:"));
            const displayCategory = catTag ? catTag.replace("__cat:", "") : (REVERSE_CAT[item.category] || item.category || "推荐");
            if (category && category !== "推荐" && displayCategory !== category) return null;
            return {
              id: item.id, title: item.title, content: item.content || "",
              images: item.image_urls || [], category: displayCategory, tags,
              author: item.profiles?.nickname || "", authorId: item.user_id || "",
              authorAvatar: item.profiles?.avatar_url || "",
              createdAt: item.created_at, isPinned: item.is_pinned || false,
              isAnnouncement: item.is_announcement || false,
              likes: likesMap.get(String(item.id)) || 0,
              comments: commentsMap.get(String(item.id)) || 0,
              views: item.views || 0,
            };
          }).filter(Boolean) as Post[];
          
          // Sync localStorage posts in background
          this.syncLocalPosts().catch(() => {});
          
          const localPosts = lsGet<Post[]>("posts", []);
          const serverIds = new Set(posts.map(p => p.id));
          const missing = localPosts.filter(p => !serverIds.has(p.id));
          posts = [...posts, ...missing];
          posts.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          return { posts: posts.slice(from, from + this.PAGE_SIZE), total: posts.length };
        }
      }
    } catch {}

    // Fallback 3: localStorage only
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


  // Sync localStorage-only posts to Supabase via dedicated sync API
  async syncLocalPosts(): Promise<void> {
    try {
      const localPosts = lsGet<Post[]>("posts", []);
      if (localPosts.length === 0) return;
      
      // Get unsynced posts (not seed posts, not system posts)
      const unsynced = localPosts.filter(p => p.authorId && p.authorId !== "system" && !p.id.startsWith("seed"));
      if (unsynced.length === 0) return;
      
      // Try sync API
      const result = await apiPost<{ synced: number }>("/api/sync", { posts: unsynced });
      if (result && result.synced > 0) {
        lsSet("hasUnsyncedPosts", false);
      }
    } catch {}
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
    console.log("[createPost] 开始发帖, authorId:", post.authorId, "isValidUUID:", isValidUUID(post.authorId || ""));
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

    console.log("[createPost] API result:", apiResult ? "success" : "failed", apiResult?.error || "");
    if (apiResult && !apiResult.error) {
      // Sync to localStorage as backup
      const posts = lsGet<Post[]>("posts", []);
      posts.unshift(apiResult);
      lsSet("posts", posts);
      return apiResult;
    }

    // Fallback 2: Direct Supabase insert (bypasses Vercel API)
    console.log("[createPost] API失败，尝试直连Supabase...");
    try {
      const SB_URL = "https://aawoajhmhvysedabncoz.supabase.co";
      const SB_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";
      const sbHeaders = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
      
      // 先确保 profile 存在（外键约束要求）
      const uid = safeUUID(post.authorId);
      if (uid) {
        await fetch(`${SB_URL}/rest/v1/profiles`, {
          method: "POST",
          headers: { ...sbHeaders, "Prefer": "resolution=merge-duplicates" },
          body: JSON.stringify({ id: uid, nickname: post.author || "", avatar_url: post.authorAvatar || "" }),
        });
      }
      
      const sbRes = await fetch(`${SB_URL}/rest/v1/posts`, {
        method: "POST",
        headers: { ...sbHeaders, "Prefer": "return=representation" },
        body: JSON.stringify({
          title: post.title,
          content: post.content || "",
          image_urls: post.images || [],
          category: post.category || "推荐",
          tags: post.tags || [],
          user_id: safeUUID(post.authorId),
          is_pinned: post.isPinned || false,
          is_announcement: post.isAnnouncement || false,
        }),
      });
      console.log("[createPost] Supabase响应:", sbRes.status, sbRes.ok);
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        const d = Array.isArray(sbData) ? sbData[0] : sbData;
        if (d && d.id) {
          const result: Post = {
            id: d.id, title: d.title, content: d.content || "",
            images: d.image_urls || [], category: post.category || "推荐",
            tags: post.tags || [], author: post.author || "",
            authorId: d.user_id || post.authorId || "",
            authorAvatar: post.authorAvatar || "",
            createdAt: d.created_at || new Date().toISOString(),
            isPinned: d.is_pinned || false, isAnnouncement: d.is_announcement || false,
            likes: 0, comments: 0, views: 0,
          };
          const posts = lsGet<Post[]>("posts", []);
          posts.unshift(result);
          lsSet("posts", posts);
          return result;
        }
      }
    } catch {}

    // Fallback 3: localStorage only (will be synced later)
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
    lsSet("hasUnsyncedPosts", true);
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
    // Try direct Supabase first (works without VPN)
    try {
      const SB_URL = "https://aawoajhmhvysedabncoz.supabase.co";
      const SB_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";
      let url = `${SB_URL}/rest/v1/comments?select=*&order=created_at.asc&limit=500`;
      if (postId) url += `&post_id=eq.${encodeURIComponent(postId)}`;
      const sbRes = await fetch(url, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
      });
      console.log("[createPost] Supabase响应:", sbRes.status, sbRes.ok);
      if (sbRes.ok) {
        const data = await sbRes.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id, postId: d.post_id, parentId: d.parent_id,
            author: d.author_name || "", authorId: d.user_id || "",
            authorAvatar: d.author_avatar || "",
            content: d.content, image: d.image_url || "", createdAt: d.created_at,
          }));
        }
      }
    } catch {}

    // Fallback: API route
    if (postId) {
      const apiResult = await apiGet<{ comments: Comment[] }>(`/api/comments?postId=${encodeURIComponent(postId)}`);
      if (apiResult && apiResult.comments) return apiResult.comments;
    }
    return [...SEED_COMMENTS, ...lsGet<Comment[]>("comments", [])].filter(c => !postId || c.postId === postId);
  },

  async createComment(data: { postId: string; parentId: string | null; author: string; authorId: string; authorAvatar: string; content: string; image?: string }): Promise<Comment | null> {
    // Try API first
    const apiResult = await apiPost<any>("/api/comments", data);
    if (apiResult && !apiResult.error) {
      const comments = lsGet<Comment[]>("comments", []);
      comments.push(apiResult);
      lsSet("comments", comments);
      return apiResult;
    }

    // Fallback: Direct Supabase insert
    try {
      const SB_URL = "https://aawoajhmhvysedabncoz.supabase.co";
      const SB_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";
      const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };
      const sbRes = await fetch(`${SB_URL}/rest/v1/comments`, {
        method: "POST", headers,
        body: JSON.stringify({
          post_id: data.postId, parent_id: data.parentId || null,
          user_id: data.authorId, author_name: data.author, author_avatar: data.authorAvatar || "",
          content: data.content, image_url: data.image || "",
        }),
      });
      console.log("[createPost] Supabase响应:", sbRes.status, sbRes.ok);
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        const d = Array.isArray(sbData) ? sbData[0] : sbData;
        if (d && d.id) {
          const comment: Comment = {
            id: d.id, postId: d.post_id, parentId: d.parent_id,
            author: d.author_name || data.author, authorId: d.user_id || data.authorId,
            authorAvatar: d.author_avatar || data.authorAvatar,
            content: d.content, image: d.image_url || "", createdAt: d.created_at || new Date().toISOString(),
          };
          const comments = lsGet<Comment[]>("comments", []);
          comments.push(comment);
          lsSet("comments", comments);
          return comment;
        }
      }
    } catch {}

    // Fallback: localStorage only
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
    // Try API first
    const apiResult = await apiPost<{ count: number; error?: string }>("/api/likes", {
      postId, userId, toggle: currentlyLiked,
    });
    if (apiResult && !apiResult.error && typeof apiResult.count === "number") {
      return apiResult.count;
    }

    // Fallback: Direct Supabase
    try {
      const SB_URL = "https://aawoajhmhvysedabncoz.supabase.co";
      const SB_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";
      const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
      
      if (currentlyLiked) {
        // Unlike
        await fetch(`${SB_URL}/rest/v1/likes?post_id=eq.${postId}&user_id=eq.${userId}`, {
          method: "DELETE", headers,
        });
      } else {
        // Like
        await fetch(`${SB_URL}/rest/v1/likes`, {
          method: "POST", headers,
          body: JSON.stringify({ post_id: postId, user_id: userId }),
        });
      }
      // Get updated count
      const countRes = await fetch(`${SB_URL}/rest/v1/likes?select=id&post_id=eq.${postId}`, { headers });
      if (countRes.ok) {
        const data = await countRes.json();
        return data.length;
      }
    } catch {}

    // Fallback: localStorage estimate
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
            phone: String((d as any).phone || ""),
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
          phone: String((d as any).phone || ""),
          is_admin: Boolean(d.is_admin), role: (d.role as "owner" | "admin" | null) ?? null,
          banned_until: d.banned_until ? String(d.banned_until) : null,
        }));
      } catch {}
    }
    return [];
  },

  async updateProfile(userId: string, updates: { nickname?: string; avatar_url?: string; bio?: string; is_admin?: boolean; role?: string; banned_until?: string | null }): Promise<boolean> {
    // Use API route (service role key, bypasses RLS)
    const apiResult = await apiPut("/api/profiles", { userId, ...updates });
    if (!apiResult) {
      // Fallback: direct Supabase client
      if (hasSupabase && supabase) {
        try { await supabase.from("profiles").upsert({ id: userId, ...updates as any }, { onConflict: "id" }); } catch {}
      }
    }
    // Always save to localStorage as backup
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

  async fetchLikes(userId: string): Promise<{ userLikes: Set<string> }> {
    // Try direct Supabase first
    try {
      const SB_URL = "https://aawoajhmhvysedabncoz.supabase.co";
      const SB_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";
      const sbRes = await fetch(`${SB_URL}/rest/v1/likes?select=post_id&user_id=eq.${encodeURIComponent(userId)}`, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
      });
      console.log("[createPost] Supabase响应:", sbRes.status, sbRes.ok);
      if (sbRes.ok) {
        const data = await sbRes.json();
        if (Array.isArray(data)) {
          const postIds = data.map((r: any) => r.post_id);
          // Sync to localStorage
          const existing = lsGet<string[]>("likedPosts", []);
          const keys = postIds.map((pid: string) => pid + "_" + userId);
          const merged = [...new Set([...existing, ...keys])];
          lsSet("likedPosts", merged);
          return { userLikes: new Set(postIds) };
        }
      }
    } catch {}

    // Fallback: API route
    const apiResult = await apiGet<{ likes: string[] }>(`/api/likes?userId=${userId}`);
    if (apiResult && apiResult.likes && apiResult.likes.length > 0) {
      const existing = lsGet<string[]>("likedPosts", []);
      const keys = apiResult.likes.map(pid => pid + "_" + userId);
      const merged = [...new Set([...existing, ...keys])];
      lsSet("likedPosts", merged);
      return { userLikes: new Set(apiResult.likes) };
    }
    // Fallback: localStorage
    const liked = lsGet<string[]>("likedPosts", []);
    const ids = liked.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
    return { userLikes: new Set(ids) };
  },

  loadSavedPosts(userId: string): Set<string> {
    const saved = lsGet<string[]>("savedPosts", []);
    const ids = saved.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
    return new Set(ids);
  },
};

// ===== Backward Compat Exports =====
export async function syncSeedToSupabase(userId: string): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  try {
    const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
    if ((count || 0) === 0) {
      // Use API route which handles category mapping
      for (const seed of SEED_POSTS) {
        await apiPost("/api/posts", {
          title: seed.title, content: seed.content, images: seed.images,
          category: seed.category, tags: seed.tags,
          authorId: seed.authorId === "system" ? userId : seed.authorId,
          author: seed.author, authorAvatar: seed.authorAvatar || "",
          isPinned: seed.isPinned, isAnnouncement: seed.isAnnouncement,
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

