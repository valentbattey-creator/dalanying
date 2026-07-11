import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/server-supabase";

// POST: Toggle like
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { postId, userId, action } = body; // action: "like" | "unlike"

    if (!postId || !userId) {
      return NextResponse.json({ error: "postId and userId required" }, { status: 400 });
    }

    if (action === "unlike") {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    }

    // Return updated count
    const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);

    return NextResponse.json({ ok: true, likes: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Get likes for posts, and user's liked posts
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const url = new URL(req.url);
    const postIds = url.searchParams.get("postIds") || "";
    const userId = url.searchParams.get("userId") || "";

    if (!postIds) {
      return NextResponse.json({ likesMap: {}, userLikes: [] });
    }

    const ids = postIds.split(",");
    const { data } = await supabase.from("likes").select("post_id, user_id").in("post_id", ids);

    const likesMap: Record<string, number> = {};
    const userLikes: string[] = [];

    if (data) {
      data.forEach(r => {
        const pid = String(r.post_id);
        likesMap[pid] = (likesMap[pid] || 0) + 1;
        if (userId && String(r.user_id) === userId) {
          userLikes.push(pid);
        }
      });
    }

    return NextResponse.json({ likesMap, userLikes });
  } catch (e: any) {
    return NextResponse.json({ likesMap: {}, userLikes: [] });
  }
}
