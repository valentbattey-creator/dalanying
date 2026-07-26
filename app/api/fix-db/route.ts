import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  try {
    // Try to insert a test post with Chinese category to check constraint
    const testId = "00000000-0000-0000-0000-000000000001";
    
    // First, try inserting with Chinese category
    const { error: testErr } = await supabaseAdmin.from("posts").insert({
      title: "__test__", content: "__test__", category: "推荐", user_id: testId,
    });
    
    let constraintExists = false;
    if (testErr && testErr.message?.includes("check constraint")) {
      constraintExists = true;
    }
    
    // Clean up test post if it was inserted
    if (!testErr) {
      await supabaseAdmin.from("posts").delete().eq("title", "__test__");
    }
    
    // Also ensure views column exists
    const { error: viewsErr } = await supabaseAdmin.from("posts").select("views").limit(1);
    const hasViews = !viewsErr;
    
    return NextResponse.json({
      constraintExists,
      hasViews,
      message: constraintExists 
        ? "约束存在，需要在 Supabase SQL Editor 手动执行: ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;"
        : "约束已不存在，中文分类可以正常使用"
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
