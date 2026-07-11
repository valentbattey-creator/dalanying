import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://aawoajhmhvysedabncoz.supabase.co";
const DEFAULT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd29hamhtaHZ5c2VkYWJuY296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYwMDI4OCwiZXhwIjoyMDk5MTc2Mjg4fQ.jGRT49Be9LTmSI17dDwy9WIJy8FRzQWBcBG1NJC1fcA";

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY;
  return createClient(url, key);
}

export function mapPost(data: Record<string, unknown>): any {
  return {
    id: String(data.id || ""),
    title: String(data.title || ""),
    content: String(data.content || ""),
    images: (data.image_urls as string[]) || [],
    category: String(data.category || ""),
    tags: (data.tags as string[]) || [],
    author: String((data as any).profiles?.nickname || data.author_name || ""),
    authorId: String(data.user_id || ""),
    authorAvatar: String((data as any).profiles?.avatar_url || data.author_avatar || ""),
    createdAt: String(data.created_at || new Date().toISOString()),
    likes: Number(data.likes || 0),
    comments: Number(data.comments || 0),
    views: Number(data.views || 0),
    isAnnouncement: Boolean(data.is_announcement),
    isPinned: Boolean(data.is_pinned),
  };
}
