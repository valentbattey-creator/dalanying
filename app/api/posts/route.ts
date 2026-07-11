import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, mapPost } from "@/lib/server-supabase";

// GET: Paginated posts list
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const url = new URL(req.url);
    const from = parseInt(url.searchParams.get("from") || "0");
    const to = parseInt(url.searchParams.get("to") || "9");
    const category = url.searchParams.get("category") || "";
    const search = url.searchParams.get("search") || "";
    const userId = url.searchParams.get("userId") || "";

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

    if (error) {
      console.error("GET posts error:", error);
      return NextResponse.json({ posts: [], total: 0 });
    }

    const posts = (data as Record<string, unknown>[] || []).map(mapPost);

    // Get likes and comments counts for these posts
    if (posts.length > 0) {
      const postIds = posts.map(p => p.id);
      const [{ data: likesData }, { data: commentsData }] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
      ]);

      const likesCount = new Map<string, number>();
      const commentsCount = new Map<string, number>();
      if (likesData) likesData.forEach(r => {
        const pid = String(r.post_id);
        likesCount.set(pid, (likesCount.get(pid) || 0) + 1);
      });
      if (commentsData) commentsData.forEach(r => {
        const pid = String(r.post_id);
        commentsCount.set(pid, (commentsCount.get(pid) || 0) + 1);
      });

      posts.forEach(p => {
        p.likes = likesCount.get(p.id) || 0;
        p.comments = commentsCount.get(p.id) || 0;
      });
    }

    return NextResponse.json({ posts, total: count || posts.length });
  } catch (e) {
    console.error("API GET posts error:", e);
    return NextResponse.json({ posts: [], total: 0 });
  }
}

// POST: Create a new post
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { title, content, images, category, tags, authorId, author, authorAvatar, isPinned, isAnnouncement } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Insert post
    const insertData: Record<string, unknown> = {
      title,
      content,
      image_urls: images || [],
      category: category || "digital",
      tags: tags || [],
      user_id: authorId,
      created_at: new Date().toISOString(),
    };

    // Add optional fields if they exist in schema
    try {
      insertData.is_pinned = isPinned || false;
      insertData.is_announcement = isAnnouncement || false;
    } catch {}

    const { data, error } = await supabase
      .from("posts")
      .insert(insertData)
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
      .single();

    if (error) {
      // Try minimal insert
      const minimalInsert = {
        title, content, image_urls: images || [], category: category || "digital",
        tags: tags || [], user_id: authorId, created_at: new Date().toISOString(),
      };
      const { data: d2, error: e2 } = await supabase
        .from("posts")
        .insert(minimalInsert)
        .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
        .single();

      if (e2) {
        console.error("POST insert error:", e2);
        return NextResponse.json({ error: e2.message }, { status: 500 });
      }
      const post = mapPost(d2 as Record<string, unknown>);
      post.author = author;
      post.authorId = authorId;
      post.authorAvatar = authorAvatar || "";
      return NextResponse.json({ post, stored: "supabase" });
    }

    // Upsert profile
    if (author && authorId) {
      await supabase.from("profiles").upsert({
        id: authorId,
        nickname: author,
        avatar_url: authorAvatar || "",
        bio: "",
      }, { onConflict: "id" });
    }

    const post = mapPost(data as Record<string, unknown>);
    post.author = author || post.author;
    post.authorAvatar = authorAvatar || post.authorAvatar;

    return NextResponse.json({ post, stored: "supabase" });
  } catch (e: any) {
    console.error("API POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
