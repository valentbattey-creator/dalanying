import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role (full access, bypasses RLS)
const DEFAULT_URL = "https://aawoajhmhvysedabncoz.supabase.co";
const DEFAULT_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
  if (!url || !key || url.includes("your-project")) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getServiceClient();
    
    if (!supabase) {
      // No Supabase, return instruction to use localStorage
      return NextResponse.json({ ok: true, stored: "local" });
    }

    const { title, content, images, category, tags, author, authorId, authorAvatar, isPinned, isAnnouncement } = body;

    // Only use columns that exist in Supabase schema
    const { data, error } = await supabase.from("posts").insert({
      title,
      content,
      image_urls: images || [],
      category: category || "digital",
      tags: tags || [],
      user_id: authorId,
    }).select().single();

    if (error) {
      console.error("API posts insert error:", error);
      return NextResponse.json({ ok: true, stored: "local" });
    }

    // Also upsert the author's profile
    await supabase.from("profiles").upsert({
      id: authorId,
      nickname: author,
      avatar_url: authorAvatar || "",
      bio: "",
    }, { onConflict: "id" }).select();

    return NextResponse.json({
      ok: true,
      stored: "supabase",
      post: {
        id: data.id,
        title: data.title,
        content: data.content,
        images: data.image_urls || [],
        category: data.category || "",
        tags: data.tags || [],
        author: author,
        authorId: authorId,
        authorAvatar: authorAvatar || "",
        createdAt: data.created_at,
        likes: 0,
        comments: 0,
        views: 0,
        isAnnouncement: isAnnouncement || false,
        isPinned: isPinned || false,
      }
    });
  } catch (e) {
    console.error("API posts error:", e);
    return NextResponse.json({ ok: true, stored: "local" });
  }
}
