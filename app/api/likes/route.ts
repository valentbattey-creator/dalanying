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
    const userId = searchParams.get("userId") || "";

    let query = supabaseAdmin.from("likes").select("post_id", { count: "exact" });
    if (postId) query = query.eq("post_id", postId);
    if (userId) query = query.eq("user_id", userId);

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ likes: [], count: 0 });

    return NextResponse.json({ likes: (data || []).map((l: any) => l.post_id), count: count || 0 });
  } catch {
    return NextResponse.json({ likes: [], count: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, userId, toggle } = body;

    if (toggle) {
      // Unlike
      await supabaseAdmin.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      // Like - check if already exists
      const { data: existing } = await supabaseAdmin.from("likes").select("id").eq("post_id", postId).eq("user_id", userId);
      if (!existing || existing.length === 0) {
        await supabaseAdmin.from("likes").insert({ post_id: postId, user_id: userId });
      }
    }

    // Return updated count
    const { count } = await supabaseAdmin.from("likes").select("*", { count: "exact" }).eq("post_id", postId);
    return NextResponse.json({ count: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
