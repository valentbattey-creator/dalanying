import { createClient } from "@supabase/supabase-js";

// Default Supabase credentials (same project for all environments)
const DEFAULT_URL = "https://aawoajhmhvysedabncoz.supabase.co";
const DEFAULT_KEY = "sb_publishable_jpAnsNOd1-v5ftyOhjO09A_cnQBXjvh";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
  if (!url || !key || url.includes("your-project")) return null;
  return createClient(url, key);
}

export const supabase = getSupabase();
export const hasSupabase = !!supabase;
