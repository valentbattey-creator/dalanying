import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Map Chinese categories to Supabase-allowed values
// TODO: After fixing the posts_category_check constraint on Supabase,
// remove this mapping and use Chinese categories directly
const CATEGORY_MAP: Record<string, string> = {
  "推荐": "tech", "数码": "tech", "科技": "tech", "汽车": "tech", 
  "运动": "fitness", "游戏": "tech", "健身": "fitness", "户外": "fitness",
  "财经": "tech", "美食": "tech", "旅游": "tech", "音乐": "tech",
  "电影": "tech", "时尚": "tech", "宠物": "tech", "摄影": "tech",
  "读书": "tech", "职场": "tech", "教育": "tech", "房产": "tech",
  "军事": "tech", "历史": "tech", "哲学": "tech", "设计": "tech",
  "动漫": "tech", "骑行": "fitness", "钓鱼": "fitness", "篮球": "fitness",
  "足球": "fitness", "跑步": "fitness", "格斗": "fitness", "穿搭": "tech",
  "机车": "tech", "思维探讨": "tech", "谈婚论嫁": "tech", "成长": "tech",
  "健康": "fitness", "手工": "tech", "家居": "tech", "天文": "tech",
  "趣闻": "tech", "科普": "tech",
};

function mapCategory(cat: string): string {
  return CATEGORY_MAP[cat] || "tech";
}

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

    if (category && category !== "推荐") {
      const mapped = mapCategory(category);
      query = query.eq("category", mapped);
    }
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    if (userId) query = query.eq("user_id", userId);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ posts: [], total: 0, error: error.message });

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

    // Reverse map categories for display
    const REVERSE_MAP: Record<string, string> = {};
    for (const [cn, en] of Object.entries(CATEGORY_MAP)) {
      if (!REVERSE_MAP[en]) REVERSE_MAP[en] = cn;
    }

    const posts = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content || "",
      images: item.image_urls || [],
      category: REVERSE_MAP[item.category] || item.category || "推荐",
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

    // Map category to valid Supabase value
    const supabaseCategory = mapCategory(category || "推荐");

    // Ensure profile exists
    if (authorId) {
      await supabaseAdmin.from("profiles").upsert(
        { id: authorId, nickname: author || "", avatar_url: authorAvatar || "", is_admin: false },
        { onConflict: "id" }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("posts")
      .insert({
        title,
        content: content || "",
        image_urls: images || [],
        category: supabaseCategory,
        tags: tags || [],
        user_id: authorId || null,
        is_pinned: isPinned || false,
        is_announcement: isAnnouncement || false,
      })
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      id: data.id,
      title: data.title,
      content: data.content || "",
      images: data.image_urls || [],
      category: category || "推荐",
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
