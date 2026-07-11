import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get likes and comments counts
    let likesCount = 0, commentsCount = 0;
    try {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabaseAdmin.from("likes").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabaseAdmin.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
      ]);
      likesCount = lc || 0;
      commentsCount = cc || 0;
    } catch {}

    return NextResponse.json({
      id: data.id,
      title: data.title,
      content: data.content || "",
      images: data.image_urls || [],
      category: data.category || "",
      tags: data.tags || [],
      author: data.profiles?.nickname || "",
      authorId: data.user_id || "",
      authorAvatar: data.profiles?.avatar_url || "",
      createdAt: data.created_at,
      isPinned: data.is_pinned || false,
      isAnnouncement: data.is_announcement || false,
      likes: likesCount,
      comments: commentsCount,
      views: data.views || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Delete related likes and comments first
    await supabaseAdmin.from("likes").delete().eq("post_id", id);
    await supabaseAdmin.from("comments").delete().eq("post_id", id);
    await supabaseAdmin.from("saves").delete().eq("post_id", id);

    const { error } = await supabaseAdmin.from("posts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const patch: any = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.content !== undefined) patch.content = body.content;
    if (body.category !== undefined) patch.category = body.category;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.image_urls !== undefined) patch.image_urls = body.image_urls;
    if (body.isPinned !== undefined) patch.is_pinned = body.isPinned;
    if (body.isAnnouncement !== undefined) patch.is_announcement = body.isAnnouncement;

    const { error } = await supabaseAdmin.from("posts").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
