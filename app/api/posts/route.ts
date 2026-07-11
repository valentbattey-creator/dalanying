import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const VALID_CATEGORIES = [
  "推荐", "数码", "科技", "汽车", "运动", "游戏", "健身", "户外", "财经",
  "美食", "旅游", "音乐", "电影", "时尚", "宠物", "摄影", "读书",
  "职场", "教育", "房产", "军事", "历史", "哲学", "设计", "动漫",
  "骑行", "钓鱼", "篮球", "足球", "跑步", "格斗", "穿搭", "机车",
  "思维探讨", "谈婚论嫁", "成长", "健康", "手工", "家居", "天文", "趣闻", "科普",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = parseInt(searchParams.get("from") || "0");
    const to = parseInt(searchParams.get("to") || "9");
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const userId = searchParams.get("userId") || "";

    let query = supabaseAdmin
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)", { count: "exact" })
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (category && category !== "推荐") query = query.eq("category", category);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    if (userId) query = query.eq("user_id", userId);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ posts: [], total: 0, error: error.message });

    // Get likes/comments counts for these posts
    const postIds = (data || []).map((item: any) => item.id);
    let likesMap: Map<string, number> = new Map();
    let commentsMap: Map<string, number> = new Map();
    
    if (postIds.length > 0) {
      try {
        const [{ data: ld }, { data: cd }] = await Promise.all([
          supabaseAdmin.from("likes").select("post_id").in("post_id", postIds),
          supabaseAdmin.from("comments").select("post_id").in("post_id", postIds),
        ]);
        (ld || []).forEach((r: any) => {
          const pid = String(r.post_id);
          likesMap.set(pid, (likesMap.get(pid) || 0) + 1);
        });
        (cd || []).forEach((r: any) => {
          const pid = String(r.post_id);
          commentsMap.set(pid, (commentsMap.get(pid) || 0) + 1);
        });
      } catch {}
    }

    const posts = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content || "",
      images: item.image_urls || [],
      category: item.category || "",
      tags: item.tags || [],
      author: item.profiles?.nickname || "",
      authorId: item.user_id || "",
      authorAvatar: item.profiles?.avatar_url || "",
      createdAt: item.created_at,
      isPinned: item.is_pinned || false,
      isAnnouncement: item.is_announcement || false,
      likes: likesMap.get(String(item.id)) || 0,
      comments: commentsMap.get(String(item.id)) || 0,
      views: item.views || 0,
    }));

    return NextResponse.json({ posts, total: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ posts: [], total: 0, error: e.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { title, content, images, category, tags, authorId, author, authorAvatar, isPinned, isAnnouncement } = body;

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      category = "推荐";
    }

    // Ensure profile exists
    if (authorId) {
      await supabaseAdmin.from("profiles").upsert(
        { id: authorId, nickname: author || "", avatar_url: authorAvatar || "", is_admin: false },
        { onConflict: "id" }
      );
    }

    // Attempt insert
    let { data, error } = await supabaseAdmin
      .from("posts")
      .insert({
        title,
        content: content || "",
        image_urls: images || [],
        category,
        tags: tags || [],
        user_id: authorId || null,
        is_pinned: isPinned || false,
        is_announcement: isAnnouncement || false,
      })
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
      .single();

    // If category constraint fails, retry with "推荐"
    if (error && (error.message?.includes("category") || error.message?.includes("check"))) {
      const retry = await supabaseAdmin
        .from("posts")
        .insert({
          title,
          content: content || "",
          image_urls: images || [],
          category: "推荐",
          tags: tags || [],
          user_id: authorId || null,
          is_pinned: isPinned || false,
          is_announcement: isAnnouncement || false,
        })
        .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
        .single();
      if (!retry.error) { data = retry.data; error = null; }
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      id: data.id,
      title: data.title,
      content: data.content || "",
      images: data.image_urls || [],
      category: data.category || "",
      tags: data.tags || [],
      author: data.profiles?.nickname || author || "",
      authorId: data.user_id || "",
      authorAvatar: data.profiles?.avatar_url || authorAvatar || "",
      createdAt: data.created_at,
      isPinned: data.is_pinned || false,
      isAnnouncement: data.is_announcement || false,
      likes: 0,
      comments: 0,
      views: data.views || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
