import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Sync a batch of posts from localStorage to Supabase
export async function POST(req: NextRequest) {
  try {
    const { posts } = await req.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const results = [];
    for (const post of posts.slice(0, 20)) { // Max 20 at a time
      // Check if post already exists
      const { data: existing } = await supabaseAdmin
        .from("posts")
        .select("id")
        .eq("id", post.id)
        .single();
      
      if (existing) {
        results.push({ id: post.id, status: "exists" });
        continue;
      }

      // Ensure profile exists
      if (post.authorId) {
        await supabaseAdmin.from("profiles").upsert(
          { id: post.authorId, nickname: post.author || "", avatar_url: post.authorAvatar || "" },
          { onConflict: "id" }
        );
      }

      // Insert post
      const { data, error } = await supabaseAdmin.from("posts").insert({
        title: post.title,
        content: post.content || "",
        image_urls: post.images || [],
        category: post.category || "推荐",
        tags: post.tags || [],
        user_id: post.authorId || null,
        is_pinned: post.isPinned || false,
        is_announcement: post.isAnnouncement || false,
      }).select("id").single();

      if (error) {
        results.push({ id: post.id, status: "error", error: error.message });
      } else {
        results.push({ id: post.id, status: "synced", newId: data?.id });
      }
    }

    return NextResponse.json({ synced: results.filter(r => r.status === "synced").length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
