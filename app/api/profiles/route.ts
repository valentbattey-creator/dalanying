import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/server-supabase";

// GET: Fetch profile by userId
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "";
    const all = url.searchParams.get("all") || "";

    if (all === "true") {
      const { data } = await supabase.from("profiles").select("*");
      const profiles = (data as Record<string, unknown>[] || []).map(d => ({
        id: String(d.id),
        nickname: String(d.nickname || ""),
        avatar_url: String(d.avatar_url || ""),
        bio: String(d.bio || ""),
        is_admin: Boolean(d.is_admin),
        banned_until: d.banned_until ? String(d.banned_until) : null,
      }));
      return NextResponse.json({ profiles });
    }

    if (!userId) {
      return NextResponse.json({ profile: null });
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (!data) {
      return NextResponse.json({ profile: null });
    }

    const d = data as Record<string, unknown>;
    return NextResponse.json({
      profile: {
        id: String(d.id),
        nickname: String(d.nickname || ""),
        avatar_url: String(d.avatar_url || ""),
        bio: String(d.bio || ""),
        is_admin: Boolean(d.is_admin),
        banned_until: d.banned_until ? String(d.banned_until) : null,
      }
    });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

// PUT: Update profile
export async function PUT(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();
    const { userId, nickname, avatar_url, bio, is_admin, banned_until } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (nickname !== undefined) patch.nickname = nickname;
    if (avatar_url !== undefined) patch.avatar_url = avatar_url;
    if (bio !== undefined) patch.bio = bio;
    if (is_admin !== undefined) patch.is_admin = is_admin;
    if (banned_until !== undefined) patch.banned_until = banned_until;

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      ...patch,
    }, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
