import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Generate deterministic UUID from any string
function toUUID(str: string): string {
  const hash = createHash("md5").update(str).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join("-");
}

// Fixed guest UUID for posts with no valid author
const GUEST_UUID = "00000000-0000-4000-8000-000000000000";

export async function POST(req: NextRequest) {
  try {
    const { posts } = await req.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ synced: 0, message: "没有帖子需要同步" });
    }

    // Ensure guest profile exists
    await supabaseAdmin.from("profiles").upsert(
      { id: GUEST_UUID, nickname: "游客", avatar_url: "" },
      { onConflict: "id" }
    );

    let synced = 0;
    let errors: string[] = [];

    for (const post of posts.slice(0, 50)) {
      try {
        // Check if already exists by title + author to avoid duplicates
        const { data: existing } = await supabaseAdmin
          .from("posts").select("id").eq("title", post.title).limit(1);
        
        if (existing && existing.length > 0) {
          continue;
        }

        // Determine user_id: valid UUID -> use it, otherwise generate from authorId or use guest
        let userId: string;
        if (isValidUUID(post.authorId)) {
          userId = post.authorId;
        } else if (post.authorId) {
          userId = toUUID(post.authorId);
        } else {
          userId = GUEST_UUID;
        }

        // Ensure profile exists
        await supabaseAdmin.from("profiles").upsert(
          { id: userId, nickname: post.author || "游客", avatar_url: post.authorAvatar || "" },
          { onConflict: "id" }
        );

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
