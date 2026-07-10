"use client";

import { supabase, hasSupabase } from "./supabase";

// ===== Category Mapping =====
const CN_TO_EN_CATEGORY: Record<string, string> = {
  "数码": "digital", "科技": "tech", "汽车": "car", "运动": "sport",
  "游戏": "game", "健身": "fitness", "户外": "outdoor", "财经": "finance",
};
const EN_TO_CN_CATEGORY: Record<string, string> = {
  "digital": "数码", "tech": "科技", "car": "汽车", "sport": "运动",
  "game": "游戏", "fitness": "健身", "outdoor": "户外", "finance": "财经",
};

// ===== Types =====
export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  bio: string;
  is_admin: boolean;
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
  replies?: Comment[];
}

function gid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ===== localStorage helpers =====
function lsGet<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem("dalanying_" + k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(k: string, v: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dalanying_" + k, JSON.stringify(v));
}

// ===== Seed Data =====
const SEED_POSTS: Post[] = [
  {
    id: "1", title: "2025 旗舰游戏本横评：ROG vs 拯救者",
    content: "每年这个时候都是游戏本换代的高峰期。我从做工、散热、性能释放、屏幕素质四个维度做了详细对比。ROG 枪神 8 Plus 超竞版的模具确实顶级，星云屏的观感无敌。拯救者 Y9000P 性价比更高。",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80"],
    category: "数码", tags: ["游戏本", "横评", "ROG"], author: "Tech老张", authorId: "seed", authorAvatar: "",
    createdAt: new Date(Date.now() - 86400000).toISOString(), likes: 342, comments: 0, isAnnouncement: false, isPinned: false, views: 0,
  },
  {
    id: "2", title: "A股下半年策略：三个确定性的方向",
    content: "第一是半导体国产替代，大基金三期的落地会带来实质性催化。第二是新能源出海，光伏和储能海外需求回暖。第三是消费电子复苏，AI PC和AI手机换机周期已开始。",
    images: [], category: "财经", tags: ["A股", "投资"], author: "资本论", authorId: "seed", authorAvatar: "",
    createdAt: new Date(Date.now() - 129600000).toISOString(), likes: 215, comments: 0, isAnnouncement: false, isPinned: false, views: 0,
  },
  {
    id: "3", title: "户外徒步入门指南：从装备到路线一次说清",
    content: "新手徒步最容易犯的错误就是装备oversize。一双靠谱的徒步鞋，一个20L背包，加上速干衣和冲锋衣即可。",
    images: ["https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80"],
    category: "户外", tags: ["徒步", "装备"], author: "山系青年", authorId: "seed", authorAvatar: "",
    createdAt: new Date(Date.now() - 172800000).toISOString(), likes: 189, comments: 0, isAnnouncement: false, isPinned: false, views: 0,
  },
  {
    id: "4", title: "2026年家用车选购真心话",
    content: "有家充条件就上纯电；没有就插混。纯油车不建议了。",
    images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80"],
    category: "汽车", tags: ["电车", "选车"], author: "老司机阿强", authorId: "seed", authorAvatar: "",
    createdAt: new Date(Date.now() - 259200000).toISOString(), likes: 523, comments: 0, isAnnouncement: false, isPinned: false, views: 0,
  },
  {
    id: "5", title: "居家增肌最全攻略：没健身房一样好身材",
    content: "关键是要保证渐进超负荷。核心动作：俯卧撑、引体向上、深蹲。买一对可调节哑铃和引体向上杆，投资不到1000元。",
    images: ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80"],
    category: "健身", tags: ["健身", "增肌"], author: "铁馆不在家", authorId: "seed", authorAvatar: "",
    createdAt: new Date(Date.now() - 345600000).toISOString(), likes: 431, comments: 0, isAnnouncement: false, isPinned: false, views: 0,
  },
];

const SEED_COMMENTS: Comment[] = [];

// ===== Supabase row mapper =====
function mapPost(row: Record<string, unknown>): Post {
  const profile = row.profiles as { nickname?: string; avatar_url?: string } | null;
  const cat = String(row.category || "");
  return {
    id: String(row.id),
    title: String(row.title || ""),
    content: String(row.content || ""),
    images: Array.isArray(row.image_urls) ? row.image_urls as string[] : [],
    category: EN_TO_CN_CATEGORY[cat] || cat,
    tags: Array.isArray(row.tags) ? row.tags as string[] : [],
    author: profile?.nickname || "用户",
    authorId: String(row.user_id || ""),
    authorAvatar: profile?.avatar_url || "",
    createdAt: String(row.created_at || new Date().toISOString()),
    likes: 0,
    comments: 0,
    isAnnouncement: Boolean((row as Record<string, unknown>).is_announcement),
    isPinned: Boolean((row as Record<string, unknown>).is_pinned),
    views: Number((row as Record<string, unknown>).views || 0),
  };
}

// ===== Fetch posts paginated =====
async function supabaseFetchPostsPaginated(
  from: number, to: number,
  category?: string,
  search?: string
): Promise<{ posts: Post[]; total: number }> {
  if (!hasSupabase || !supabase) return { posts: [], total: 0 };

  let query = supabase.from("posts").select("*, profiles!posts_user_id_fkey(nickname, avatar_url)", { count: "exact" });

  if (category) {
    const dbCat = CN_TO_EN_CATEGORY[category] || category;
    query = query.eq("category", dbCat);
  }

  if (search && search.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) return { posts: [], total: 0 };

  const posts = (data as Record<string, unknown>[]).map(mapPost);

  // Get likes count
  if (posts.length > 0) {
    const postIds = posts.map(p => p.id);
    const { data: likeData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
    if (likeData) {
      const likeCounts = new Map<string, number>();
      for (const r of likeData) {
        const pid = String(r.post_id);
        likeCounts.set(pid, (likeCounts.get(pid) || 0) + 1);
      }
      for (const p of posts) p.likes = likeCounts.get(p.id) || 0;
    }

    // Get comments count
    const { data: commentData } = await supabase.from("comments").select("post_id").in("post_id", postIds);
    if (commentData) {
      const commentCounts = new Map<string, number>();
      for (const r of commentData) {
        const pid = String(r.post_id);
        commentCounts.set(pid, (commentCounts.get(pid) || 0) + 1);
      }
      for (const p of posts) p.comments = commentCounts.get(p.id) || 0;
    }
  }

  return { posts, total: count || 0 };
}

// ===== Fetch user posts =====
async function supabaseFetchUserPosts(userId: string): Promise<Post[]> {
  if (!hasSupabase || !supabase) return [];
  const { data } = await supabase
    .from("posts")
    .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(mapPost);
}

// ===== Fetch user liked posts =====
async function supabaseFetchUserLikedPosts(userId: string): Promise<Post[]> {
  if (!hasSupabase || !supabase) return [];
  const { data: likesData } = await supabase.from("likes").select("post_id").eq("user_id", userId);
  if (!likesData || likesData.length === 0) return [];
  const postIds = likesData.map(r => String(r.post_id));
  const { data } = await supabase
    .from("posts")
    .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
    .in("id", postIds)
    .order("created_at", { ascending: false });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(mapPost);
}
// ===== Fetch single post by ID =====
async function supabaseFetchPostById(postId: string): Promise<Post | null> {
  if (!hasSupabase || !supabase) return null;
  const { data } = await supabase
    .from("posts")
    .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
    .eq("id", postId)
    .maybeSingle();
  if (!data) return null;
  const post = mapPost(data as Record<string, unknown>);
  try {
    const { data: likeData } = await supabase.from("likes").select("post_id").in("post_id", [postId]);
    if (likeData) post.likes = likeData.length;
    const { data: commentData } = await supabase.from("comments").select("post_id").eq("post_id", postId);
    if (commentData) post.comments = commentData.length;
  } catch {}
  return post;
}



// ===== Fetch likes =====
async function supabaseFetchLikes(postIds: string[]): Promise<{ likes: Map<string, number>; userLikes: Set<string> }> {
  const likesMap = new Map<string, number>();
  const userLikes = new Set<string>();
  if (!hasSupabase || !supabase || postIds.length === 0) return { likes: likesMap, userLikes };
  const { data } = await supabase.from("likes").select("post_id, user_id").in("post_id", postIds);
  if (!data) return { likes: likesMap, userLikes };
  for (const row of data) {
    const pid = String(row.post_id);
    likesMap.set(pid, (likesMap.get(pid) || 0) + 1);
  }
  const { data: session } = await supabase.auth.getSession();
  if (session?.session?.user) {
    const uid = session.session.user.id;
    for (const row of data) {
      if (String(row.user_id) === uid) userLikes.add(String(row.post_id));
    }
  }
  return { likes: likesMap, userLikes };
}

// ===== Fetch comments =====
async function supabaseFetchComments(): Promise<Comment[]> {
  if (!hasSupabase || !supabase) return [];
  const { data } = await supabase.from("comments").select("*").order("created_at", { ascending: true });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    postId: String(r.post_id),
    parentId: r.parent_id ? String(r.parent_id) : null,
    author: String(r.author_name || ""),
    authorId: String(r.user_id || ""),
    authorAvatar: String(r.author_avatar || ""),
    content: String(r.content || ""),
    image: String(r.image_url || ""),
    createdAt: String(r.created_at || new Date().toISOString()),
  }));
}

// ===== Insert / Delete / Update =====
async function supabaseInsertPost(post: Post, userId: string): Promise<Post | null> {
  if (!hasSupabase || !supabase) return null;
  const dbCategory = CN_TO_EN_CATEGORY[post.category] || post.category;
  const { data, error } = await supabase.from("posts").insert({
    user_id: userId, title: post.title, content: post.content,
    image_urls: post.images, category: dbCategory, tags: post.tags,
    created_at: new Date().toISOString(),
  }).select("*, profiles!posts_user_id_fkey(nickname, avatar_url)").single();
  if (error || !data) return null;
  return mapPost(data as Record<string, unknown>);
}

async function supabaseDeletePost(postId: string): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  // Get image URLs to delete from storage
  const { data: post } = await supabase.from("posts").select("image_urls").eq("id", postId).single();
  if (post) {
    const urls = (post as Record<string, unknown>).image_urls as string[] | null;
    if (urls && urls.length > 0) {
      const paths = urls.map(u => u.split("/").pop()).filter(Boolean) as string[];
      if (paths.length > 0) await supabase.storage.from("post-images").remove(paths);
    }
  }
  // Delete likes and comments
  await supabase.from("likes").delete().eq("post_id", postId);
  await supabase.from("comments").delete().eq("post_id", postId);
  // Delete post
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  return !error;
}

async function supabaseUpdatePost(postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[] }): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.category !== undefined) patch.category = CN_TO_EN_CATEGORY[updates.category] || updates.category;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  const { error } = await supabase.from("posts").update(patch).eq("id", postId);
  return !error;
}

async function supabaseInsertComment(c: Comment): Promise<Comment | null> {
  if (!hasSupabase || !supabase) return null;
  const { data, error } = await supabase.from("comments").insert({
    post_id: c.postId, parent_id: c.parentId, user_id: c.authorId,
    author_name: c.author, author_avatar: c.authorAvatar,
    content: c.content, image_url: c.image || "",
    created_at: new Date().toISOString(),
  }).select("*").single();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id), postId: String(r.post_id), parentId: r.parent_id ? String(r.parent_id) : null,
    author: String(r.author_name || ""), authorId: String(r.user_id || ""),
    authorAvatar: String(r.author_avatar || ""), content: String(r.content || ""),
    image: String(r.image_url || ""),
    createdAt: String(r.created_at || new Date().toISOString()),
  };
}

async function supabaseToggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (!hasSupabase || !supabase) return;
  if (currentlyLiked) {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  }
}

// ===== Profile =====
export async function fetchProfile(userId: string): Promise<Profile | null> {
  // Try Supabase first
  if (hasSupabase && supabase) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) {
      const d = data as Record<string, unknown>;
      return {
        id: String(d.id), nickname: String(d.nickname || ""),
        avatar_url: String(d.avatar_url || ""), bio: String(d.bio || ""),
        is_admin: Boolean(d.is_admin),
        banned_until: d.banned_until ? String(d.banned_until) : null,
      };
    }
  }
  // localStorage fallback for anonymous users
  if (typeof window !== "undefined") {
    const key = `dalanying_profile_${userId}`;
    const local = localStorage.getItem(key);
    if (local) {
      try {
        const p = JSON.parse(local);
        return {
          id: userId,
          nickname: p.nickname || "",
          avatar_url: p.avatar_url || "",
          bio: p.bio || "",
          is_admin: p.is_admin || false,
          banned_until: p.banned_until || null,
        };
      } catch {}
    }
    // Also check the user data in localStorage
    const userData = localStorage.getItem("dalanying_user");
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u.id === userId) {
          return {
            id: userId,
            nickname: u.name || "",
            avatar_url: u.avatar || "",
            bio: "",
            is_admin: u.isAdmin || false,
            banned_until: u.bannedUntil || null,
          };
        }
      } catch {}
    }
  }
  return null;
}

export async function updateProfile(userId: string, updates: { nickname?: string; avatar_url?: string; bio?: string }): Promise<boolean> {
  if (!hasSupabase || !supabase) {
    // localStorage fallback
    const key = `dalanying_profile_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(key, JSON.stringify({ ...existing, ...updates }));
    return true;
  }
  try {
    // Fetch existing row to preserve admin/banned state
    const { data: existing } = await supabase.from("profiles").select("is_admin, banned_until").eq("id", userId).maybeSingle();
    const merged: Record<string, unknown> = { id: userId };
    if (updates.nickname !== undefined) merged.nickname = updates.nickname;
    if (updates.avatar_url !== undefined) merged.avatar_url = updates.avatar_url;
    if (updates.bio !== undefined) merged.bio = updates.bio;
    merged.is_admin = existing?.is_admin ?? false;
    merged.banned_until = existing?.banned_until ?? null;
    const { error } = await supabase.from("profiles").upsert(merged, { onConflict: "id" });
    if (error) {
      console.warn("Supabase profile update failed, using localStorage fallback:", error.message);
      const key = `dalanying_profile_${userId}`;
      const localExisting = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...localExisting, ...updates }));
    }
    return true; // Always return true - we saved somewhere
  } catch (e) {
    console.warn("Profile update error, using localStorage:", e);
    const key = `dalanying_profile_${userId}`;
    const localExisting = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(key, JSON.stringify({ ...localExisting, ...updates }));
    return true;
  }
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (!hasSupabase || !supabase) return "";
  const ext = file.name.split(".").pop() || "jpg";
  const path = `avatars/${userId}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw new Error("头像上传失败");
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ===== Seed sync =====
let seedSynced = false;
export async function syncSeedToSupabase(userId: string): Promise<boolean> {
  if (!hasSupabase || !supabase || seedSynced) return false;
  const { posts } = await supabaseFetchPostsPaginated(0, 0);
  if (posts.length > 0) { seedSynced = true; return false; }
  let count = 0;
  for (const seed of SEED_POSTS) {
    const dbCategory = CN_TO_EN_CATEGORY[seed.category] || seed.category;
    const { error } = await supabase.from("posts").insert({
      user_id: userId, title: seed.title, content: seed.content,
      image_urls: seed.images, category: dbCategory, tags: seed.tags,
      created_at: seed.createdAt,
    });
    if (!error) count++;
  }
  seedSynced = true;
  return count > 0;
}


// ===== Admin Functions =====
export async function banUser(userId: string, until: string): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  const { error } = await supabase.from("profiles").update({ banned_until: until }).eq("id", userId);
  return !error;
}

export async function unbanUser(userId: string): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  const { error } = await supabase.from("profiles").update({ banned_until: null }).eq("id", userId);
  return !error;
}

export async function setAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  const { error } = await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  return !error;
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  if (!hasSupabase || !supabase) return [];
  const { data } = await supabase.from("profiles").select("*").order("nickname", { ascending: true });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(d => ({
    id: String(d.id), nickname: String(d.nickname || ""),
    avatar_url: String(d.avatar_url || ""), bio: String(d.bio || ""),
    is_admin: Boolean(d.is_admin),
    banned_until: d.banned_until ? String(d.banned_until) : null,
  }));
}

export async function createAnnouncement(post: Omit<Post, "id" | "createdAt" | "likes" | "comments">): Promise<Post | null> {
  if (!hasSupabase || !supabase) return null;
  const dbCategory = CN_TO_EN_CATEGORY[post.category] || post.category;
  const { data, error } = await supabase.from("posts").insert({
    user_id: post.authorId, title: post.title, content: post.content,
    image_urls: post.images, category: dbCategory, tags: post.tags,
    is_announcement: true, created_at: new Date().toISOString(),
  }).select("*, profiles!posts_user_id_fkey(nickname, avatar_url)").single();
  if (error || !data) return null;
  return mapPost(data as Record<string, unknown>);
}

// ===== Public API =====
export const dataService = {
  async fetchPostById(postId: string): Promise<Post | null> {
    if (hasSupabase) {
      const post = await supabaseFetchPostById(postId);
      if (post) return post;
    }
    return lsGet<Post[]>("posts", SEED_POSTS).find((p: Post) => p.id === postId) || null;
  },
  PAGE_SIZE: 10,

  async loadPostsPaginated(from: number, category?: string, search?: string): Promise<{ posts: Post[]; total: number }> {
    // Load from Supabase
    if (hasSupabase) {
      try {
        const result = await supabaseFetchPostsPaginated(from, from + this.PAGE_SIZE - 1, category, search);
        // Always merge localStorage posts (source of truth for same-device data)
        try {
          const localPosts = lsGet<Post[]>("posts", []);
          if (localPosts.length > 0) {
            const existingIds = new Set(result.posts.map(p => p.id));
            const missing = localPosts.filter(p => !existingIds.has(p.id));
            if (missing.length > 0) {
              let filtered = missing;
              if (category) filtered = filtered.filter(p => p.category === category);
              if (search) { const q = search.toLowerCase(); filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)); }
              result.posts = [...result.posts, ...filtered];
              result.total += filtered.length;
            }
          }
        } catch {}
        result.posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { posts: result.posts.slice(from, from + this.PAGE_SIZE), total: Math.max(result.total, result.posts.length) };
      } catch (e) {
        console.warn("Supabase fetch failed:", e);
      }
    }
    
    // Full localStorage fallback
    let all = lsGet<Post[]>("posts", SEED_POSTS);
    if (!Array.isArray(all)) all = [...SEED_POSTS];
    if (category) all = all.filter(p => p.category === category);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      all = all.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { posts: all.slice(from, from + this.PAGE_SIZE), total: all.length };
  },


  async loadUserPosts(userId: string): Promise<Post[]> {
    if (hasSupabase) {
      const posts = await supabaseFetchUserPosts(userId);
      if (posts.length > 0) return posts;
    }
    const nameMap: Record<string, string> = {};
    try { const m = JSON.parse(localStorage.getItem("dalanying_name_map") || "{}"); Object.assign(nameMap, m); } catch {}
    const resolvedName = nameMap[userId] || "";
    const allPosts = lsGet<Post[]>("posts", SEED_POSTS);
    return allPosts.filter(p => p.authorId === userId || (resolvedName && p.author === resolvedName));
  },

  async loadUserLikedPosts(userId: string): Promise<Post[]> {
    if (hasSupabase) return supabaseFetchUserLikedPosts(userId);
    const likedKeys = lsGet<string[]>("likedPosts", []);
    const likedPostIds = likedKeys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""));
    return lsGet<Post[]>("posts", SEED_POSTS).filter(p => likedPostIds.includes(p.id));
  },

  async loadComments(): Promise<Comment[]> {
    if (hasSupabase) {
      const c = await supabaseFetchComments();
      if (c.length > 0) return c;
    }
    return lsGet<Comment[]>("comments", SEED_COMMENTS);
  },

  async loadLikes(userId: string): Promise<{ likedPosts: Set<string>; likesMap: Map<string, number> }> {
    if (hasSupabase) {
      const { data } = await supabase!.from("likes").select("post_id");
      if (data && data.length > 0) {
        const allIds = [...new Set(data.map(r => String(r.post_id)))];
        const result = await supabaseFetchLikes(allIds);
        return { likedPosts: result.userLikes, likesMap: result.likes };
      }
    }
    const keys = lsGet<string[]>("likedPosts", []);
    return {
      likedPosts: new Set(keys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, ""))),
      likesMap: new Map(),
    };
  },

  async createPost(post: Omit<Post, "id" | "createdAt" | "likes" | "comments">): Promise<Post> {
    // Try API route first (bypasses RLS for anonymous users)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
      const result = await res.json();
      if (result.stored === "supabase" && result.post) {
        // Backup to localStorage so other accounts on same device can see it
        this._saveToLocalStore(result.post);
        return result.post;
      }
      console.log("API route returned:", result.stored);
    } catch (e) {
      console.warn("API route failed, trying Supabase direct:", e);
    }
    
    // Fallback: Supabase client (works for authenticated users)
    if (hasSupabase) {
      try {
        const result = await supabaseInsertPost(post as Post, post.authorId);
        if (result) {
          this._saveToLocalStore(result);
          return result;
        }
      } catch (e) {
        console.warn("Supabase insert failed, using localStorage:", e);
      }
    }
    
    // Always save to localStorage as backup (ensures data isn't lost between accounts)
    const newPost: Post = { ...post as Post, id: gid(), likes: 0, comments: 0, views: 0, createdAt: new Date().toISOString() };
    const posts = lsGet<Post[]>("posts", SEED_POSTS);
    posts.unshift(newPost);
    lsSet("posts", posts);
    return newPost;
  },

  async _saveToLocalStore(post: Post): Promise<void> {
    const posts = lsGet<Post[]>("posts", SEED_POSTS);
    const existing = posts.findIndex(p => p.id === post.id);
    if (existing >= 0) posts[existing] = post;
    else posts.unshift(post);
    lsSet("posts", posts);
  },

  async deletePost(postId: string): Promise<boolean> {
    if (hasSupabase) return supabaseDeletePost(postId);
    const posts = lsGet<Post[]>("posts", SEED_POSTS);
    lsSet("posts", posts.filter(p => p.id !== postId));
    const comments = lsGet<Comment[]>("comments", SEED_COMMENTS);
    lsSet("comments", comments.filter(c => c.postId !== postId));
    return true;
  },

  async updatePost(postId: string, updates: { title?: string; content?: string; category?: string; tags?: string[] }): Promise<boolean> {
    if (hasSupabase) return supabaseUpdatePost(postId, updates);
    const posts = lsGet<Post[]>("posts", SEED_POSTS);
    const idx = posts.findIndex(p => p.id === postId);
    if (idx >= 0) {
      if (updates.title !== undefined) posts[idx].title = updates.title;
      if (updates.content !== undefined) posts[idx].content = updates.content;
      if (updates.category !== undefined) posts[idx].category = updates.category;
      if (updates.tags !== undefined) posts[idx].tags = updates.tags;
      lsSet("posts", posts);
    }
    return true;
  },

  async createComment(c: { postId: string; parentId: string | null; author: string; authorId: string; authorAvatar: string; content: string; image?: string }): Promise<Comment> {
    const comment: Comment = { ...c, image: c.image || "", id: gid(), createdAt: new Date().toISOString() };
    if (hasSupabase) {
      const result = await supabaseInsertComment(comment);
      if (result) return result;
    }
    // localStorage fallback
    const comments = lsGet<Comment[]>("comments", SEED_COMMENTS);
    comments.push(comment);
    lsSet("comments", comments);
    return comment;
  },

  async toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<{ liked: boolean; likesDelta: number }> {
    if (hasSupabase) await supabaseToggleLike(postId, userId, currentlyLiked);
    const likedKeys = lsGet<string[]>("likedPosts", []);
    if (currentlyLiked) {
      const idx = likedKeys.indexOf(postId + "_" + userId);
      if (idx >= 0) likedKeys.splice(idx, 1);
      lsSet("likedPosts", likedKeys);
      return { liked: false, likesDelta: -1 };
    } else {
      likedKeys.push(postId + "_" + userId);
      lsSet("likedPosts", likedKeys);
      return { liked: true, likesDelta: 1 };
    }
  },

  loadSavedPosts(userId: string): Set<string> {
    const keys = lsGet<string[]>("savedPosts", []);
    return new Set(keys.filter(k => k.endsWith("_" + userId)).map(k => k.replace("_" + userId, "")));
  },

  toggleSave(postId: string, userId: string, currentlySaved: boolean): boolean {
    const keys = lsGet<string[]>("savedPosts", []);
    if (currentlySaved) {
      const idx = keys.indexOf(postId + "_" + userId);
      if (idx >= 0) keys.splice(idx, 1);
      lsSet("savedPosts", keys);
      return false;
    } else {
      keys.push(postId + "_" + userId);
      lsSet("savedPosts", keys);
      return true;
    }
  },
};
