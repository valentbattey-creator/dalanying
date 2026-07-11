"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { supabase, hasSupabase } from "@/lib/supabase";
import { moderateContent, getViolationLevel } from "@/lib/moderation";
import { toast } from "sonner";
import type { Comment } from "@/lib/store";

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return "刚刚";
  if (d < 3600) return `${Math.floor(d / 60)}分钟前`;
  if (d < 86400) return `${Math.floor(d / 3600)}小时前`;
  if (d < 2592000) return `${Math.floor(d / 86400)}天前`;
  return new Date(s).toLocaleDateString("zh-CN");
}

interface DM {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  toName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem("dalanying_" + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet<T>(key: string, value: T) {
  try { localStorage.setItem("dalanying_" + key, JSON.stringify(value)); } catch {}
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const { posts, comments } = useData();
  const [tab, setTab] = useState<"notifications" | "chats">("notifications");
  const [dms, setDms] = useState<DM[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    // Load DMs
    const all = lsGet<DM[]>("dms", []);
    const mine = all.filter(d => d.toId === user.id || d.fromId === user.id);
    setDms(mine);
  }, [user]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat, dms]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)]">
        <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
          <button type="button" onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-10 relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">消息</h1>
          <div className="w-[42px]" />
        </div>
        <div className="flex items-center justify-center h-[80vh]">
          <button type="button" onClick={requireLogin} className="text-sm text-[var(--color-accent)]">请先登录</button>
        </div>
      </main>
    );
  }

  // Comment notifications: comments on user's posts
  const myPostIds = new Set(posts.filter(p => p.authorId === user.id).map(p => p.id));
  const commentNotifications = comments.filter(c => myPostIds.has(c.postId) && c.authorId !== user.id);

  // DM conversations grouped by partner
  const chatPartners = new Map<string, { name: string; avatar: string; lastMsg: string; time: string; unread: number }>();
  for (const d of dms) {
    const partnerId = d.fromId === user.id ? d.toId : d.fromId;
    const partnerName = d.fromId === user.id ? d.toName : d.fromName;
    const partnerAvatar = d.fromId === user.id ? "" : d.fromAvatar;
    const existing = chatPartners.get(partnerId);
    if (!existing || new Date(d.createdAt) > new Date(existing.time)) {
      chatPartners.set(partnerId, {
        name: partnerName,
        avatar: partnerAvatar,
        lastMsg: d.content.substring(0, 30),
        time: d.createdAt,
        unread: (existing?.unread || 0) + (d.toId === user.id && !d.read ? 1 : 0),
      });
    }
  }

  // Messages in selected chat
  const chatMessages = selectedChat
    ? dms.filter(d => (d.fromId === user.id && d.toId === selectedChat) || (d.toId === user.id && d.fromId === selectedChat))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const selectedPartner = selectedChat ? chatPartners.get(selectedChat) : null;

  async function sendDM() {
    if (!msgText.trim() || !selectedChat || !user || sending) return;
    
    // Content moderation
    const modResult = moderateContent(msgText.trim());
    if (!modResult.passed) {
      toast.error("消息违规：" + modResult.reason);
      return;
    }
    
    setSending(true);
    const dm: DM = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fromId: user.id,
      fromName: user.name,
      fromAvatar: user.avatar,
      toId: selectedChat,
      toName: selectedPartner?.name || "",
      content: msgText.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Save
    const all = lsGet<DM[]>("dms", []);
    all.push(dm);
    lsSet("dms", all);
    
    // Try Supabase
    if (hasSupabase && supabase) {
      try {
        await supabase.from("private_messages").insert({
          id: dm.id, from_id: dm.fromId, from_name: dm.fromName,
          to_id: dm.toId, to_name: dm.toName, content: dm.content,
          created_at: dm.createdAt,
        });
      } catch {}
    }

    setDms(prev => [...prev, dm]);
    setMsgText("");
    setSending(false);
  }

  function markRead(partnerId: string) {
    const all = lsGet<DM[]>("dms", []);
    let changed = false;
    for (const d of all) {
      if (d.toId === user!.id && d.fromId === partnerId && !d.read) {
        d.read = true;
        changed = true;
      }
    }
    if (changed) {
      lsSet("dms", all);
      const mine = all.filter(d => d.toId === user!.id || d.fromId === user!.id);
      setDms(mine);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      {/* Header */}
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4 shrink-0">
        <button type="button" onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer z-10 relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">
          {selectedChat && selectedPartner ? selectedPartner.name : "消息"}
        </h1>
        {selectedChat && (
          <button onClick={() => setSelectedChat(null)} className="text-xs text-[var(--color-text-secondary)]">
            返回
          </button>
        )}
        {!selectedChat && <div className="w-[42px]" />}
      </div>

      {/* Chat view */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-xs text-[var(--color-text-tertiary)]">暂无消息，发送第一条私信吧</p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isMine = msg.fromId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isMine ? "order-1" : ""}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-[var(--color-accent)] text-white rounded-br-md"
                        : "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border-[0.5px] border-[var(--color-border-subtle)] rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                    <p className={`text-[10px] text-[var(--color-text-tertiary)] mt-1 ${isMine ? "text-right" : "text-left"}`}>
                      {timeAgo(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-4 py-3 border-t-[0.5px] border-[var(--color-border-subtle)] glass">
            <div className="flex gap-2">
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDM(); } }}
                placeholder="输入消息... Enter发送"
                maxLength={500}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-all"
              />
              <button
                onClick={sendDM}
                disabled={!msgText.trim() || sending}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-bold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-all active:scale-95"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b-[0.5px] border-[var(--color-border-subtle)]">
            <button
              onClick={() => setTab("notifications")}
              className={`flex-1 py-3 text-xs font-medium transition-all border-b-2 ${
                tab === "notifications" ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--color-text-tertiary)]"
              }`}
            >
              🔔 评论通知 {commentNotifications.length > 0 && `(${commentNotifications.length})`}
            </button>
            <button
              onClick={() => setTab("chats")}
              className={`flex-1 py-3 text-xs font-medium transition-all border-b-2 ${
                tab === "chats" ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--color-text-tertiary)]"
              }`}
            >
              💬 私信
            </button>
          </div>

          {/* Notifications */}
          {tab === "notifications" && (
            <div className="divide-y-[0.5px] divide-[var(--color-border-subtle)]">
              {commentNotifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className="text-sm text-[var(--color-text-tertiary)]">暂无评论通知</p>
                </div>
              ) : (
                commentNotifications.map(c => {
                  const post = posts.find(p => p.id === c.postId);
                  return (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/post/${c.postId}`)}
                      className="px-4 py-4 hover:bg-[var(--color-bg-hover)] cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.authorAvatar ? <img src={c.authorAvatar} alt="" className="w-full h-full object-cover rounded-full" /> : c.author.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{c.author}</span>
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-1">
                            评论了你的帖子「{post?.title || "已删除"}」: {c.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Chat list */}
          {tab === "chats" && (
            <div className="divide-y-[0.5px] divide-[var(--color-border-subtle)]">
              {chatPartners.size === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-sm text-[var(--color-text-tertiary)]">暂无私信</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">在他人主页点击「发消息」开始对话</p>
                </div>
              ) : (
                Array.from(chatPartners.entries()).map(([id, info]) => (
                  <div
                    key={id}
                    onClick={() => { setSelectedChat(id); markRead(id); }}
                    className="px-4 py-4 hover:bg-[var(--color-bg-hover)] cursor-pointer transition-all duration-200 flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {info.avatar ? <img src={info.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : info.name.charAt(0)}
                      </div>
                      {info.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                          {info.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{info.name}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">{timeAgo(info.time)}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">{info.lastMsg}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
