import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aawoajhmhvysedabncoz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  try {
    // Try to add phone column by attempting an insert with phone field
    // If it fails, the column doesn't exist yet
    
    // First, try to select phone column
    const { error: selectErr } = await supabaseAdmin.from("profiles").select("phone").limit(1);
    
    if (selectErr && selectErr.message?.includes("column")) {
      // Phone column doesn't exist - we need to add it
      // Unfortunately we can't run DDL through PostgREST
      return NextResponse.json({ 
        status: "needs_migration",
        message: "phone column doesn't exist. Please run this SQL in Supabase SQL Editor:",
        sql: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''; CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone) WHERE phone != '';"
      });
    }
    
    return NextResponse.json({ 
      status: "ok",
      message: "Database is up to date"
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
