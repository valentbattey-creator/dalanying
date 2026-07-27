import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const { posts } = await req.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ synced: 0, message: "没有帖子需要同步" });
    }

    let synced = 0;
    let errors: string[] = [];

    for (const post of posts.slice(0, 50)) {
      try {
        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from("posts").select("id").eq("title", post.title).limit(1);
        
        if (existing && existing.length > 0) {
          continue; // Skip duplicates
        }

        // Ensure profile exists if user_id is valid UUID
        const userId = isValidUUID(post.authorId) ? post.authorId : null;
        if (userId) {
          await supabaseAdmin.from("profiles").upsert(
            { id: userId, nickname: post.author || "", avatar_url: post.authorAvatar || "" },
            { onConflict: "id" }
          );
        }

        // Insert post
        const { error } = await supabaseAdmin.from("posts").insert({
          title: post.title,
          content: post.content || "",
          image_urls: post.images || [],
          category: post.category || "推荐",
          tags: post.tags || [],
          user_id: userId,
          is_pinned: post.isPinned || false,
          is_announcement: post.isAnnouncement || false,
        });

        if (error) {
          errors.push(`${post.title}: ${error.message}`);
        } else {
          synced++;
        }
      } catch (e: any) {
        errors.push(`${post.title}: ${e.message}`);
      }
    }

    return NextResponse.json({ synced, errors: errors.length > 0 ? errors : undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
