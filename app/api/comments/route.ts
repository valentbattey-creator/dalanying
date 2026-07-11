import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/server-supabase";

// GET: Fetch all comments (optionally filtered by postId)
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const url = new URL(req.url);
    const postId = url.searchParams.get("postId") || "";

    let query = supabase.from("comments").select("*").order("created_at", { ascending: true });
    if (postId) query = query.eq("post_id", postId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ comments: [] });

    const comments = (data as Record<string, unknown>[] || []).map(r => ({
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

    return NextResponse.json({ comments });
  } catch (e: any) {
    return NextResponse.json({ comments: [] });
  }
}

// POST: Create a comment
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { postId, parentId, authorId, author, authorAvatar, content, image } = body;

    if (!postId || !content) {
      return NextResponse.json({ error: "postId and content required" }, { status: 400 });
    }

    const { data, error } = await supabase.from("comments").insert({
      post_id: postId,
      parent_id: parentId || null,
      user_id: authorId,
      author_name: author,
      author_avatar: authorAvatar || "",
      content,
      image_url: image || "",
      created_at: new Date().toISOString(),
    }).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const r = data as Record<string, unknown>;
    return NextResponse.json({
      comment: {
        id: String(r.id),
        postId: String(r.post_id),
        parentId: r.parent_id ? String(r.parent_id) : null,
        author: String(r.author_name || ""),
        authorId: String(r.user_id || ""),
        authorAvatar: String(r.author_avatar || ""),
        content: String(r.content || ""),
        image: String(r.image_url || ""),
        createdAt: String(r.created_at || new Date().toISOString()),
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Delete a comment (expects id in body)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Delete child comments first
    await supabase.from("comments").delete().eq("parent_id", id);
    await supabase.from("comments").delete().eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
