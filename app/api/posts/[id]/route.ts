import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, mapPost } from "@/lib/server-supabase";

// GET: Single post by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(nickname, avatar_url)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = mapPost(data as Record<string, unknown>);

    // Get likes and comments counts
    const [{ data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from("likes").select("post_id").eq("post_id", id),
      supabase.from("comments").select("post_id").eq("post_id", id),
    ]);
    post.likes = likesData?.length || 0;
    post.comments = commentsData?.length || 0;

    return NextResponse.json({ post });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Update a post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.content !== undefined) patch.content = body.content;
    if (body.category !== undefined) patch.category = body.category;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.isPinned !== undefined) patch.is_pinned = body.isPinned;
    if (body.isAnnouncement !== undefined) patch.is_announcement = body.isAnnouncement;

    const { error } = await supabase.from("posts").update(patch).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Delete a post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Get image URLs to delete from storage
    const { data: post } = await supabase.from("posts").select("image_urls").eq("id", id).single();
    if (post) {
      const urls = (post as any).image_urls as string[] | null;
      if (urls && urls.length > 0) {
        const paths = urls.map((u: string) => u.split("/").pop()).filter(Boolean) as string[];
        if (paths.length > 0) {
          await supabase.storage.from("post-images").remove(paths);
        }
      }
    }

    // Delete related data
    await supabase.from("likes").delete().eq("post_id", id);
    await supabase.from("comments").delete().eq("post_id", id);
    await supabase.from("posts").delete().eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
