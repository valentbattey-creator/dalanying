"use client";

import { supabase, hasSupabase } from "./supabase";
import { expandSearchQuery, fuzzyMatch } from "./search";

// ===== Category & Tag System =====
export const CATEGORIES = [
  "推荐", "数码", "科技", "汽车", "运动", "游戏", "健身", "户外", "财经",
  "美食", "旅游", "音乐", "电影", "时尚", "宠物", "摄影", "读书",
  "职场", "教育", "房产", "军事", "历史", "哲学", "设计", "动漫",
  "骑行", "钓鱼", "篮球", "足球", "跑步", "格斗", "穿搭", "机车",
  "思维探讨", "成长", "健康", "手工", "家居", "天文", "趣闻", "科普",
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

// ===== Supabase Helpers =====
function mapPost(data: Record<string, unknown>): Post {
  return {
    id: String(data.id || ""),
    title: String(data.title || ""),
    content: String(data.content || ""),
    images: (data.image_urls as string[]) || [],
    category: String(data.category || ""),
    tags: (data.tags as string[]) || [],
    author: String((data as any).profiles?.nickname || data.author_name || ""),
    authorId: String(data.user_id || ""),
    authorAvatar: String((data as any).profiles?.avatar_url || data.author_avatar || ""),
    createdAt: String(data.created_at || new Date().toISOString()),
    likes: 0, comments: 0, views: 0,
    isAnnouncement: Boolean(data.is_announcement),
    isPinned: Boolean(data.is_pinned),
  };
}

async function sbFetchPosts(from: number, to: number, category?: string, search?: string, userId?: string) {
  if (!hasSupabase || !supabase) return { posts: [] as Post[], total: 0 };
  try {
    let query = supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)", { count: "exact" })
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (category) query = query.eq("category", category);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    if (userId) query = query.eq("user_id", userId);

    const { data, error, count } = await query;
    if (error || !data) return { posts: [] as Post[], total: 0 };

    const posts = (data as Record<string, unknown>[]).map(mapPost);

    // Get likes/comments counts
    if (posts.length > 0) {
      const postIds = posts.map(p => p.id);
      try {
        const [{ data: ld }, { data: cd }] = await Promise.all([
          supabase.from("likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
        ]);
        const lc = new Map<string, number>();
        const cc = new Map<string, number>();
        if (ld) ld.forEach((r: any) => { const pid = String(r.post_id); lc.set(pid, (lc.get(pid) || 0) + 1); });
        if (cd) cd.forEach((r: any) => { const pid = String(r.post_id); cc.set(pid, (cc.get(pid) || 0) + 1); });
        posts.forEach(p => {
          const sl = lc.get(p.id);
          const sc = cc.get(p.id);
          if (sl !== undefined) p.likes = sl;
          if (sc !== undefined) p.comments = sc;
        });
      } catch {}
    }

    return { posts, total: count || posts.length };
  } catch {
    return { posts: [] as Post[], total: 0 };
  }
}

// ===== Data Service =====
export const dataService = {
  PAGE_SIZE: 10,

  async fetchPostsPaginated(from: number, category?: string, search?: string): Promise<{ posts: Post[]; total: number }> {
    // Try Supabase first
    if (hasSupabase && supabase) {
      const result = await sbFetchPosts(from, from + this.PAGE_SIZE - 1, category, search);
      if (result.posts.length > 0 || result.total > 0) {
        // Merge with localStorage
        const localPosts = lsGet<Post[]>("posts", []);
        const serverIds = new Set(result.posts.map(p => p.id));
        const missing = localPosts.filter(p => !serverIds.has(p.id));
        let merged = [...result.posts, ...missing];
        if (category) merged = merged.filter(p => p.category === category);
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          merged = merged.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
        }
        merged.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return { posts: merged.slice(from, from + this.PAGE_SIZE), total: merged.length };
      }
    }

    // Full localStorage fallback
    let all = [...SEED_POSTS, ...lsGet<Post[]>("posts", [])];
    if (category) all = all.filter(p => p.category === category);
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
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase.from("posts")
          .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
          .eq("id", postId).single();
        if (data) {
          const post = mapPost(data as Record<string, unknown>);
          const [{ data: ld }, { data: cd }] = await Promise.all([
            supabase.from("likes").select("post_id").eq("post_id", postId),
            supabase.from("comments").select("post_id").eq("post_id", postId),
          ]);
          post.likes = ld?.length || 0;
          post.comments = cd?.length || 0;
          return post;
        }
      } catch {}
    }
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].find(p => p.id === postId) || null;
  },

  async fetchUserPosts(userId: string): Promise<Post[]> {
    if (hasSupabase && supabase) {
      const result = await sbFetchPosts(0, 99, undefined, undefined, userId);
      if (result.posts.length > 0) return result.posts;
    }
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].filter(p => p.authorId === userId);
  },

  async fetchUserLikedPosts(userId: string): Promise<Post[]> {
    if (hasSupabase && supabase) {
      try {
        const { data: ld } = await supabase.from("likes").select("post_id").eq("user_id", userId);
        if (ld && ld.length > 0) {
          const ids = ld.map((r: any) => String(r.post_id));
          const { data } = await supabase.from("posts")
            .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
            .in("id", ids).order("created_at", { ascending: false });
          if (data) return (data as Record<string, unknown>[]).map(mapPost);
        }
      } catch {}
    }
    const likedKeys = lsGet<string[]>("likedPosts", []);
    const ids = likedKeys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
    return [...SEED_POSTS, ...lsGet<Post[]>("posts", [])].filter(p => ids.includes(p.id));
  },

  async createPost(post: Omit<Post, "id" | "createdAt" | "likes" | "comments" | "views">): Promise<Post> {
    let supabasePost: Post | null = null;

    // Try Supabase
    if (hasSupabase && supabase) {
      try {
        const insertData: Record<string, unknown> = {
          title: post.title, content: post.content, image_urls: post.images || [],
          category: post.category || "推荐", tags: post.tags || [], user_id: post.authorId,
          created_at: new Date().toISOString(),
        };
        try { insertData.is_pinned = post.isPinned || false; insertData.is_announcement = post.isAnnouncement || false; } catch {}

        const { data, error } = await supabase.from("posts").insert(insertData)
          .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)").single();

        if (!error && data) {
          supabasePost = mapPost(data as Record<string, unknown>);
          supabasePost.author = post.author;
          supabasePost.authorId = post.authorId;
          supabasePost.authorAvatar = post.authorAvatar || "";
        }
      } catch (e) { console.warn("Supabase insert failed:", e); }
    }

    // Always create local copy
    const newPost: Post = {
      ...post as any, id: supabasePost?.id || gid(),
      createdAt: supabasePost?.createdAt || new Date().toISOString(),
      likes: 0, comments: 0, views: 0,
    };

    const posts = lsGet<Post[]>("posts", []);
    posts.unshift(newPost);
    if (posts.length > 500) posts.length = 500;
    lsSet("posts", posts);

    return supabasePost || newPost;
  },

  async deletePost(postId: string): Promise<boolean> {
    if (hasSupabase && supabase) {
      try {
        const { data: post } = await supabase.from("posts").select("image_urls").eq("id", postId).single();
        if (post) {
          const urls = (post as any).image_urls as string[];
          if (urls?.length > 0) {
            const paths = urls.map((u: string) => u.split("/").pop()).filter(Boolean);
            if (paths.length > 0) await supabase.storage.from("post-images").remove(paths);
          }
        }
        await supabase.from("likes").delete().eq("post_id", postId);
        await supabase.from("comments").delete().eq("post_id", postId);
        await supabase.from("posts").delete().eq("id", postId);
      } catch {}
    }
    const posts = lsGet<Post[]>("posts", []);
    lsSet("posts", posts.filter(p => p.id !== postId));
    const comments = lsGet<Comment[]>("comments", []);
    lsSet("comments", comments.filter(c => c.postId !== postId));
    return true;
  },

  async updatePost(postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[]; isPinned?: boolean; isAnnouncement?: boolean }): Promise<boolean> {
    if (hasSupabase && supabase) {
      try {
        const patch: Record<string, unknown> = {};
        if (updates.title !== undefined) patch.title = updates.title;
        if (updates.content !== undefined) patch.content = updates.content;
        if (updates.category !== undefined) patch.category = updates.category;
        if (updates.tags !== undefined) patch.tags = updates.tags;
        if (updates.isPinned !== undefined) patch.is_pinned = updates.isPinned;
        if (updates.isAnnouncement !== undefined) patch.is_announcement = updates.isAnnouncement;
        await supabase.from("posts").update(patch).eq("id", postId);
      } catch {}
    }
    const posts = lsGet<Post[]>("posts", []);
    const idx = posts.findIndex(p => p.id === postId);
    if (idx >= 0) {
      if (updates.title !== undefined) posts[idx].title = updates.title;
      if (updates.content !== undefined) posts[idx].content = updates.content;
      if (updates.category !== undefined) posts[idx].category = updates.category;
      if (updates.tags !== undefined) posts[idx].tags = updates.tags;
      if (updates.isPinned !== undefined) posts[idx].isPinned = updates.isPinned;
      if (updates.isAnnouncement !== undefined) posts[idx].isAnnouncement = updates.isAnnouncement;
      lsSet("posts", posts);
    }
    return true;
  },

  // ===== Comments =====
  async fetchComments(postId?: string): Promise<Comment[]> {
    if (hasSupabase && supabase) {
      try {
        let query = supabase.from("comments").select("*").order("created_at", { ascending: true });
        if (postId) query = query.eq("post_id", postId);
        const { data } = await query;
        if (data && data.length > 0) {
          return (data as Record<string, unknown>[]).map(r => ({
            id: String(r.id), postId: String(r.post_id),
            parentId: r.parent_id ? String(r.parent_id) : null,
            author: String(r.author_name || ""), authorId: String(r.user_id || ""),
            authorAvatar: String(r.author_avatar || ""), content: String(r.content || ""),
            image: String(r.image_url || ""), createdAt: String(r.created_at || ""),
          }));
        }
      } catch {}
    }
    const local = lsGet<Comment[]>("comments", SEED_COMMENTS);
    return postId ? local.filter(c => c.postId === postId) : local;
  },

  async createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment | null> {
    let supabaseComment: Comment | null = null;
    if (hasSupabase && supabase) {
      try {
        const { data, error } = await supabase.from("comments").insert({
          post_id: comment.postId, parent_id: comment.parentId, user_id: comment.authorId,
          author_name: comment.author, author_avatar: comment.authorAvatar,
          content: comment.content, image_url: comment.image || "",
          created_at: new Date().toISOString(),
        }).select("*").single();
        if (!error && data) {
          const r = data as Record<string, unknown>;
          supabaseComment = {
            id: String(r.id), postId: String(r.post_id),
            parentId: r.parent_id ? String(r.parent_id) : null,
            author: String(r.author_name || ""), authorId: String(r.user_id || ""),
            authorAvatar: String(r.author_avatar || ""), content: String(r.content || ""),
            image: String(r.image_url || ""), createdAt: String(r.created_at || ""),
          };
        }
      } catch {}
    }

    const newComment: Comment = {
      ...comment as any, id: supabaseComment?.id || gid(),
      createdAt: supabaseComment?.createdAt || new Date().toISOString(),
    };
    const comments = lsGet<Comment[]>("comments", []);
    comments.push(newComment);
    lsSet("comments", comments);
    return newComment;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    if (hasSupabase && supabase) {
      try {
        await supabase.from("comments").delete().eq("parent_id", commentId);
        await supabase.from("comments").delete().eq("id", commentId);
      } catch {}
    }
    const comments = lsGet<Comment[]>("comments", []);
    lsSet("comments", comments.filter(c => c.id !== commentId && c.parentId !== commentId));
    return true;
  },

  // ===== Likes =====
  async toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<number> {
    if (hasSupabase && supabase) {
      try {
        if (currentlyLiked) {
          await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
        } else {
          await supabase.from("likes").insert({ post_id: postId, user_id: userId });
        }
        const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
        let count2 = count ?? -1;
        if (count2 < 0) {
          const allPosts = lsGet<Post[]>("posts", []);
          const found = allPosts.find(p => p.id === postId);
          count2 = found ? found.likes + (currentlyLiked ? -1 : 1) : 0;
        }
        // Update localStorage
        const liked = lsGet<string[]>("likedPosts", []);
        const key = postId + "_" + userId;
        if (currentlyLiked) lsSet("likedPosts", liked.filter(k => k !== key));
        else lsSet("likedPosts", [...liked, key]);
        return count2;
      } catch {}
    }
    // localStorage fallback
    const liked = lsGet<string[]>("likedPosts", []);
    const key = postId + "_" + userId;
    if (currentlyLiked) lsSet("likedPosts", liked.filter(k => k !== key));
    else lsSet("likedPosts", [...liked, key]);
    const posts = lsGet<Post[]>("posts", []);
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.likes += currentlyLiked ? -1 : 1;
      lsSet("posts", posts);
      return post.likes;
    }
    return 0;
  },

  async fetchLikes(userId: string): Promise<{ userLikes: Set<string>; likesMap: Map<string, number> }> {
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase.from("likes").select("post_id, user_id");
        if (data) {
          const likesMap = new Map<string, number>();
          const userLikes = new Set<string>();
          data.forEach((r: any) => {
            const pid = String(r.post_id);
            likesMap.set(pid, (likesMap.get(pid) || 0) + 1);
            if (String(r.user_id) === userId) userLikes.add(pid);
          });
          return { userLikes, likesMap };
        }
      } catch {}
    }
    const keys = lsGet<string[]>("likedPosts", []);
    return {
      userLikes: new Set(keys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""))),
      likesMap: new Map(),
    };
  },

  // ===== Saved Posts =====
  loadSavedPosts(userId: string): Set<string> {
    const keys = lsGet<string[]>("savedPosts", []);
    return new Set(keys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, "")));
  },

  toggleSave(postId: string, userId: string, currentlySaved: boolean): boolean {
    const keys = lsGet<string[]>("savedPosts", []);
    const key = postId + "_" + userId;
    if (currentlySaved) { lsSet("savedPosts", keys.filter(k => k !== key)); return false; }
    else { lsSet("savedPosts", [...keys, key]); return true; }
  },

  // ===== Profiles =====
  async fetchProfile(userId: string): Promise<Profile | null> {
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) {
          const d = data as Record<string, unknown>;
          return { id: String(d.id), nickname: String(d.nickname || ""),
            avatar_url: String(d.avatar_url || ""), bio: String(d.bio || ""),
            is_admin: Boolean(d.is_admin), role: d.role || null, banned_until: d.banned_until ? String(d.banned_until) : null };
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
          is_admin: Boolean(d.is_admin), banned_until: d.banned_until ? String(d.banned_until) : null,
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
};

// ===== Backward Compat Exports =====
export async function syncSeedToSupabase(userId: string): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  try {
    const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
    if ((count || 0) === 0) {
      for (const seed of SEED_POSTS) {
        await supabase.from("posts").insert({
          title: seed.title, content: seed.content, image_urls: seed.images,
          category: seed.category, tags: seed.tags, user_id: seed.authorId,
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
