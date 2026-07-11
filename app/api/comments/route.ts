import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId") || "";

    let query = supabaseAdmin.from("comments").select("*").order("created_at", { ascending: true });
    if (postId) query = query.eq("post_id", postId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ comments: [] });

    const comments = (data || []).map((c: any) => ({
      id: c.id,
      postId: c.post_id,
      parentId: c.parent_id || null,
      author: c.author_name || "",
      authorId: c.user_id || "",
      authorAvatar: c.author_avatar || "",
      content: c.content || "",
      image: c.image_url || "",
      createdAt: c.created_at,
    }));

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, parentId, author, authorId, authorAvatar, content, image } = body;

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert({
        post_id: postId,
        parent_id: parentId || null,
        user_id: authorId,
        author_name: author || "",
        author_avatar: authorAvatar || "",
        content,
        image_url: image || "",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      id: data.id,
      postId: data.post_id,
      parentId: data.parent_id || null,
      author: data.author_name || "",
      authorId: data.user_id || "",
      authorAvatar: data.author_avatar || "",
      content: data.content || "",
      image: data.image_url || "",
      createdAt: data.created_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
