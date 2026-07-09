"use client";

import { supabase, hasSupabase } from "./supabase";

// ===== Category Mapping (Chinese ↔ English DB values) =====
const CN_TO_EN_CATEGORY: Record<string, string> = {
  "数码": "digital", "科技": "tech", "汽车": "car", "运动": "sport",
  "游戏": "game", "健身": "fitness", "户外": "outdoor", "财经": "finance",
};
const EN_TO_CN_CATEGORY: Record<string, string> = {
  "digital": "数码", "tech": "科技", "car": "汽车", "sport": "运动",
  "game": "游戏", "fitness": "健身", "outdoor": "户外", "finance": "财经",
};

// ===== Types =====
export interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  category: string;
  tags: string[];
  author: string;
  authorId: string;
  createdAt: string;
  likes: number;
  comments: number;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: string;
}

function gid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ===== Seed Data (localStorage fallback only) =====
const SEED_POSTS: Post[] = [
  {
    id: "1", title: "2025 旗舰游戏本横评：ROG 枪神 vs 拯救者 Y9000P 谁更值得买",
    content: "每年这个时候都是游戏本换代的高峰期。今年 Intel 和 AMD 都拿出了看家本领，RTX 50 系列也全面铺开。\n\n我把市面上一线品牌的旗舰机型都摸了一遍，从做工、散热、性能释放、屏幕素质四个维度做了详细对比。\n\nROG 枪神 8 Plus 超竞版的模具确实顶级，星云屏的观感无敌，但价格也来到了 2W+。拯救者 Y9000P 虽然性价比更高，但在散热模组上明显做了妥协。\n\n简单来说，预算充足闭眼入 ROG，追求性价比选联想。",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80"],
    category: "数码", tags: ["游戏本", "横评", "ROG"], author: "Tech 老张", authorId: "seed",
    createdAt: new Date(Date.now() - 86400000).toISOString(), likes: 342, comments: 0,
  },
  {
    id: "2", title: "A 股下半年策略：三个确定性的方向",
    content: "上半年行情走得比较纠结，但进入下半年，有几个逻辑是比较清晰的。\n\n第一是半导体国产替代，大基金三期的落地会带来实质性催化。\n\n第二是新能源出海，光伏和储能虽然在去库存，但海外需求回暖。\n\n第三是消费电子复苏，AI PC 和 AI 手机换机周期已开始。",
    images: [], category: "财经", tags: ["A股", "投资", "策略"], author: "资本论", authorId: "seed",
    createdAt: new Date(Date.now() - 129600000).toISOString(), likes: 215, comments: 0,
  },
  {
    id: "3", title: "户外徒步入门指南：从装备到路线一次说清",
    content: "新手徒步最容易犯的错误就是装备 oversize。一天短途徒步，不需要买太多东西。\n\n一双靠谱的徒步鞋（推荐 Salomon 或 Hoka），一个 20L 背包（Osprey Daylite），加上速干衣和冲锋衣即可。",
    images: ["https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80"],
    category: "户外", tags: ["徒步", "装备", "入门"], author: "山系青年", authorId: "seed",
    createdAt: new Date(Date.now() - 172800000).toISOString(), likes: 189, comments: 0,
  },
  {
    id: "4", title: "关于 2026 年家用车选购的一些真心话",
    content: "开了十几年车，换过五六辆。有家充条件就上纯电；没有就插混。纯油车不建议了。\n\n20 万以内：比亚迪宋系列、吉利银河 L7\n30 万左右：理想 L6、Model Y",
    images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80"],
    category: "汽车", tags: ["电车", "SUV", "选车"], author: "老司机阿强", authorId: "seed",
    createdAt: new Date(Date.now() - 259200000).toISOString(), likes: 523, comments: 0,
  },
  {
    id: "5", title: "居家增肌最全攻略：没有健身房一样练出好身材",
    content: "很多人觉得增肌必须去健身房，其实未必。关键是要保证渐进超负荷。\n\n核心动作：俯卧撑（胸）、引体向上（背）、深蹲（腿）。\n\n买一对可调节哑铃（20kg+）和引体向上杆，投资不到 1000 元。",
    images: ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80"],
    category: "健身", tags: ["健身", "增肌", "居家"], author: "铁馆不在家", authorId: "seed",
    createdAt: new Date(Date.now() - 345600000).toISOString(), likes: 431, comments: 0,
  },
  {
    id: "6", title: "30 岁转行程序员，一年从零到年薪 50W+ 的真实经历",
    content: "去年这个时候，我还在银行做柜员。我用了一年时间自学，从 HTML/CSS 一路学到 React 和 Node.js。\n\n每天早上 5 点起床学 2 小时，晚上 8 点学到 12 点。现在拿到字节跳动的 offer。转行不分年龄，关键看你有多大的决心。",
    images: [], category: "科技", tags: ["转行", "程序员", "经验"], author: "逆袭的咸鱼", authorId: "seed",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), likes: 1240, comments: 0,
  },
];

const SEED_COMMENTS: Comment[] = [
  { id: "c1", postId: "1", author: "数码控阿杰", authorId: "seed", content: "ROG 屏幕确实无敌，用了一个月非常满意", createdAt: new Date().toISOString() },
  { id: "c2", postId: "1", author: "路人甲", authorId: "seed", content: "拯救者散热没那么差吧，我用的挺好啊", createdAt: new Date().toISOString() },
  { id: "c3", postId: "6", author: "自学党", authorId: "seed", content: "太励志了，我现在也在自学前端，一起加油", createdAt: new Date().toISOString() },
];

// ===== LocalStorage helpers =====
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem("dalanying_" + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("dalanying_" + key, JSON.stringify(value));
  } catch {
    // quota exceeded, ignore
  }
}

// ===== Supabase Operations =====

async function supabaseInsertPost(post: Post, userId: string): Promise<Post | null> {
  if (!hasSupabase || !supabase) return null;
  const dbCategory = CN_TO_EN_CATEGORY[post.category] || post.category;
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const images = Array.isArray(post.images) ? post.images : [];
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      title: post.title,
      content: post.content,
      image_urls: images,
      category: dbCategory,
      tags,
    })
    .select("*, profiles:user_id(username, full_name)")
    .single();
  if (error) {
    console.error("Supabase post insert error:", error);
    return null;
  }
  return rowToPost(data);
}

async function supabaseFetchPosts(): Promise<Post[]> {
  if (!hasSupabase || !supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles:user_id(username, full_name)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase posts error:", error);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Fetch likes and comments counts
  const postIds = data.map((r: Record<string, unknown>) => String(r.id));
  const [likesRes, commentsRes] = await Promise.all([
    supabase.from("likes").select("post_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
  ]);

  const likeCounts = new Map<string, number>();
  (likesRes.data || []).forEach((r: Record<string, unknown>) => {
    const pid = String(r.post_id);
    likeCounts.set(pid, (likeCounts.get(pid) || 0) + 1);
  });
  const commentCounts = new Map<string, number>();
  (commentsRes.data || []).forEach((r: Record<string, unknown>) => {
    const pid = String(r.post_id);
    commentCounts.set(pid, (commentCounts.get(pid) || 0) + 1);
  });

  return data.map((row: Record<string, unknown>) => {
    const pid = String(row.id);
    const post = rowToPost(row);
    post.likes = likeCounts.get(pid) || 0;
    post.comments = commentCounts.get(pid) || 0;
    return post;
  });
}

function rowToPost(row: Record<string, unknown>): Post {
  const profiles = row.profiles as Record<string, unknown> | null;
  const authorName = profiles
    ? String(profiles.full_name || profiles.username || "匿名用户")
    : "匿名用户";
  const cat = String(row.category || "");
  return {
    id: String(row.id),
    title: String(row.title || ""),
    content: String(row.content || ""),
    images: Array.isArray(row.image_urls) ? row.image_urls : [],
    category: EN_TO_CN_CATEGORY[cat] || cat,
    tags: Array.isArray(row.tags) ? row.tags : [],
    author: authorName,
    authorId: String(row.user_id || ""),
    createdAt: String(row.created_at || ""),
    likes: 0,
    comments: 0,
  };
}

async function supabaseInsertComment(comment: Comment): Promise<Comment | null> {
  if (!hasSupabase || !supabase) return null;
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: comment.postId,
      user_id: comment.authorId,
      content: comment.content,
    })
    .select("*, profiles:user_id(username, full_name)")
    .single();
  if (error) {
    console.error("Supabase comment insert error:", error);
    return null;
  }
  const profiles = data.profiles as Record<string, unknown> | null;
  return {
    id: String(data.id),
    postId: String(data.post_id || ""),
    author: profiles ? String(profiles.full_name || profiles.username || "匿名用户") : comment.author,
    authorId: String(data.user_id || ""),
    content: String(data.content || ""),
    createdAt: String(data.created_at || new Date().toISOString()),
  };
}

async function supabaseFetchComments(): Promise<Comment[]> {
  if (!hasSupabase || !supabase) return [];
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles:user_id(username, full_name)")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Supabase comments error:", error);
    return [];
  }
  return (data || []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as Record<string, unknown> | null;
    return {
      id: String(row.id),
      postId: String(row.post_id || ""),
      author: profiles ? String(profiles.full_name || profiles.username || "匿名用户") : "匿名用户",
      authorId: String(row.user_id || ""),
      content: String(row.content || ""),
      createdAt: String(row.created_at || new Date().toISOString()),
    };
  });
}

async function supabaseLikePost(postId: string, userId: string, liked: boolean): Promise<boolean> {
  if (!hasSupabase || !supabase) return false;
  if (liked) {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  }
  return true;
}

// ===== Sync seed data to Supabase on first login =====
let seedSynced = false;
export async function syncSeedToSupabase(userId: string): Promise<boolean> {
  if (!hasSupabase || !supabase || seedSynced) return false;
  const existing = await supabaseFetchPosts();
  if (existing.length > 0) { seedSynced = true; return false; }

  let count = 0;
  for (const seed of SEED_POSTS) {
    const dbCategory = CN_TO_EN_CATEGORY[seed.category] || seed.category;
    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        title: seed.title,
        content: seed.content,
        image_urls: seed.images,
        category: dbCategory,
        tags: seed.tags,
        created_at: seed.createdAt,
      });
    if (!error) count++;
  }
  seedSynced = true;
  console.log(`Synced ${count} seed posts to Supabase`);
  return count > 0;
}

// ===== Public API =====
export const dataService = {
  async loadPosts(): Promise<Post[]> {
    if (hasSupabase) {
      const posts = await supabaseFetchPosts();
      if (posts.length > 0) return posts;
    }
    return lsGet<Post[]>("posts", SEED_POSTS);
  },

  async loadComments(): Promise<Comment[]> {
    if (hasSupabase) {
      const comments = await supabaseFetchComments();
      if (comments.length > 0) return comments;
    }
    return lsGet<Comment[]>("comments", SEED_COMMENTS);
  },

  async createPost(post: Omit<Post, "id" | "createdAt" | "likes" | "comments">): Promise<Post> {
    if (hasSupabase) {
      const result = await supabaseInsertPost(post as Post, post.authorId);
      if (result) return result;
    }

    // Local fallback
    const newPost: Post = {
      ...post as Post,
      id: gid(),
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    };
    const posts = lsGet<Post[]>("posts", SEED_POSTS);
    posts.unshift(newPost);
    lsSet("posts", posts);
    return newPost;
  },

  async createComment(postId: string, author: string, authorId: string, content: string): Promise<Comment> {
    const comment: Comment = {
      id: gid(),
      postId,
      author,
      authorId,
      content,
      createdAt: new Date().toISOString(),
    };

    if (hasSupabase) {
      const result = await supabaseInsertComment(comment);
      if (result) return result;
    }

    const comments = lsGet<Comment[]>("comments", SEED_COMMENTS);
    comments.push(comment);
    lsSet("comments", comments);
    return comment;
  },

  async toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<{ liked: boolean; likes: number }> {
    if (hasSupabase) {
      await supabaseLikePost(postId, userId, currentlyLiked);
    }

    const likedKeys = lsGet<string[]>("likedPosts", []);
    const posts = lsGet<Post[]>("posts", SEED_POSTS);
    const idx = posts.findIndex((p) => p.id === postId);
    let newLiked: boolean;
    let newLikes: number;

    if (currentlyLiked) {
      const keyIdx = likedKeys.indexOf(postId + "_" + userId);
      if (keyIdx >= 0) likedKeys.splice(keyIdx, 1);
      newLiked = false;
      newLikes = idx >= 0 ? Math.max(0, posts[idx].likes - 1) : 0;
    } else {
      likedKeys.push(postId + "_" + userId);
      newLiked = true;
      newLikes = idx >= 0 ? posts[idx].likes + 1 : 1;
    }

    if (idx >= 0) posts[idx].likes = newLikes;
    lsSet("likedPosts", likedKeys);
    lsSet("posts", posts);

    return { liked: newLiked, likes: newLikes };
  },

  loadLikedPosts(userId: string): Set<string> {
    const keys = lsGet<string[]>("likedPosts", []);
    return new Set(keys.filter((k) => k.endsWith("_" + userId)).map((k) => k.replace("_" + userId, "")));
  },

  loadSavedPosts(userId: string): Set<string> {
    const keys = lsGet<string[]>("savedPosts", []);
    return new Set(keys.filter((k) => k.endsWith("_" + userId)).map((k) => k.replace("_" + userId, "")));
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
