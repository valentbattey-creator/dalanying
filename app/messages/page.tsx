"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface Message {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return "刚刚";
  if (d < 3600) return `${Math.floor(d / 60)}分钟前`;
  return `${Math.floor(d / 3600)}小时前`;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Map<string, Message[]>>(new Map());
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    const allMsgs: Message[] = JSON.parse(localStorage.getItem("dalanying_messages") || "[]");
    // Get conversations involving this user
    const myMsgs = allMsgs.filter(m => m.fromId === user.id || m.toId === user.id);
    const convs = new Map<string, Message[]>();
    for (const m of myMsgs) {
      const peerId = m.fromId === user.id ? m.toId : m.fromId;
      if (!convs.has(peerId)) convs.set(peerId, []);
      convs.get(peerId)!.push(m);
    }
    // Sort each conversation by time
    for (const [key, msgs] of convs) {
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    setConversations(convs);
    if (!activeChat && convs.size > 0) setActiveChat([...convs.keys()][0]);
  }, [user]);

  function sendMessage() {
    if (!user || !activeChat || !newMsg.trim()) return;
    const allMsgs: Message[] = JSON.parse(localStorage.getItem("dalanying_messages") || "[]");
    const convMsgs = conversations.get(activeChat) || [];
    const peerName = convMsgs[0]?.fromId === user.id ? convMsgs[0].toName : convMsgs[0]?.fromName || "";
    const msg: Message = {
      id: Date.now().toString(36),
      fromId: user.id,
      fromName: user.name,
      toId: activeChat,
      toName: peerName,
      content: newMsg.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    allMsgs.push(msg);
    localStorage.setItem("dalanying_messages", JSON.stringify(allMsgs));
    const updated = new Map(conversations);
    if (!updated.has(activeChat)) updated.set(activeChat, []);
    updated.get(activeChat)!.push(msg);
    setConversations(updated);
    setNewMsg("");
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <button onClick={() => router.push("/")} className="text-sm text-[var(--color-accent)]">请先登录</button>
      </main>
    );
  }

  const activeMsgs = activeChat ? (conversations.get(activeChat) || []) : [];
  const peerName = activeMsgs[0]?.fromId === user.id ? activeMsgs[0].toName : activeMsgs[0]?.fromName || "用户";

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="glass sticky top-0 z-50 h-11 flex items-center px-4">
        <button onClick={() => window.location.href = "/" } className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-[var(--color-text-primary)] -ml-6">消息</h1>
        <div className="w-[42px]" />
      </div>

      {conversations.size === 0 ? (
        <div className="text-center py-20">
          <span className="text-4xl">💬</span>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-3">暂无消息</p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">在用户主页点击"发消息"开始对话</p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-44px)]">
          {/* Conversation list */}
          <div className="w-32 border-r-[0.5px] border-[var(--color-border-subtle)] overflow-y-auto">
            {[...conversations.keys()].map(peerId => {
              const msgs = conversations.get(peerId) || [];
              const lastMsg = msgs[msgs.length - 1];
              const name = lastMsg?.fromId === user.id ? lastMsg.toName : lastMsg.fromName;
              const unread = msgs.filter(m => m.toId === user.id && !m.read).length;
              return (
                <button
                  key={peerId}
                  onClick={() => setActiveChat(peerId)}
                  className={`w-full px-3 py-3 text-left border-b-[0.5px] border-[var(--color-border-subtle)] transition-colors ${
                    activeChat === peerId ? "bg-[var(--color-bg-hover)]" : "hover:bg-[var(--color-bg-hover)]"
                  }`}
                >
                  <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate flex items-center gap-1">
                    {name}
                    {unread > 0 && <span className="w-4 h-4 rounded-full bg-[var(--color-accent)] text-white text-[9px] flex items-center justify-center">{unread}</span>}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] truncate mt-0.5">{lastMsg?.content}</p>
                </button>
              );
            })}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-2 border-b-[0.5px] border-[var(--color-border-subtle)]">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{peerName}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {activeMsgs.map(m => (
                <div key={m.id} className={`flex ${m.fromId === user.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] ${
                    m.fromId === user.id
                      ? "bg-[var(--color-accent)] text-white rounded-br-md"
                      : "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border-[0.5px] border-[var(--color-border-subtle)] rounded-bl-md"
                  }`}>
                    <p>{m.content}</p>
                    <p className={`text-[9px] mt-0.5 ${m.fromId === user.id ? "text-white/60" : "text-[var(--color-text-tertiary)]"}`}>{timeAgo(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t-[0.5px] border-[var(--color-border-subtle)] flex gap-2">
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="输入消息..."
                maxLength={500}
                className="flex-1 px-3 py-2 rounded-full bg-[var(--color-bg-card)] border-[0.5px] border-[var(--color-border-subtle)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)]"
              />
              <button onClick={sendMessage} disabled={!newMsg.trim()} className="px-4 py-2 rounded-full bg-[var(--color-accent)] text-white text-[13px] font-medium disabled:opacity-40">
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
