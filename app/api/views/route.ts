import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd29hamhtaHZ5c2VkYWJuY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYwMDI4OCwiZXhwIjoyMDk5MTc2Mjg4fQ.jGRT49Be9LTmSI17dDwy9WIJy8FRzQWBcBG1NJC1fcA";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();
    
    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // First get current views
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("views")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment views
    const newViews = (post.views || 0) + 1;
    const { error: updateError } = await supabase
      .from("posts")
      .update({ views: newViews })
      .eq("id", postId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, views: newViews });
  } catch (error) {
    console.error("Error in views API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
