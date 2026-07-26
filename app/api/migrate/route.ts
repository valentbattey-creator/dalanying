import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  const results: string[] = [];
  
  try {
    // 1. Check if phone column exists
    const { error: phoneErr } = await supabaseAdmin.from("profiles").select("phone").limit(1);
    if (phoneErr && phoneErr.message?.includes("column")) {
      results.push("❌ phone 列不存在 - 需要在 Supabase SQL Editor 手动添加");
    } else {
      results.push("✅ phone 列已存在");
    }

    // 2. Check posts constraint
    const { error: catErr } = await supabaseAdmin.from("posts").insert({
      title: "__migration_test__", content: "test", category: "测试分类", user_id: "00000000-0000-0000-0000-000000000000",
    });
    if (catErr?.message?.includes("check constraint")) {
      results.push("❌ category 约束仍存在 - 需要在 SQL Editor 删除");
    } else if (catErr?.message?.includes("foreign key")) {
      results.push("✅ category 约束已删除（中文分类可用）");
    } else if (!catErr) {
      results.push("✅ category 约束已删除");
      // Clean up test
      await supabaseAdmin.from("posts").delete().eq("title", "__migration_test__");
    } else {
      results.push("⚠️ category 状态: " + catErr.message);
    }

    // 3. Check comment columns
    const { error: commErr } = await supabaseAdmin.from("comments").select("author_name").limit(1);
    if (commErr && commErr.message?.includes("column")) {
      results.push("❌ comments.author_name 列不存在");
    } else {
      results.push("✅ comments 补充列已存在");
    }

    // Summary
    const needsMigration = results.some(r => r.startsWith("❌"));
    
    return NextResponse.json({
      status: needsMigration ? "needs_migration" : "ok",
      results,
      sql: needsMigration ? `-- 在 Supabase SQL Editor 中执行此 SQL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone) WHERE phone != '';
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_avatar TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;` : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
