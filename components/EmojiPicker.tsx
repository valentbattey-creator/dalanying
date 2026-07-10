"use client";

import { useState, useRef, useEffect } from "react";

const EMOJIS = [
  // 常用表情
  "😂", "❤️", "🔥", "👍", "😭", "😊", "🙏", "💪",
  "🎉", "😍", "🤣", "💯", "✨", "😎", "🤔", "👀",
  "💀", "🚀", "🤡", "🐶", "🍉", "⚽", "🎮",
  // 大岚荧定制
  "🦾", "🏆", "💰", "📈", "🎯", "⚡", "🍺",
  "🏀", "🎸", "⌨️", "📱", "🚗", "✈️", "🌍",
  "💡", "🗿", "🎲", "🍻", "🥇", "🎪",
];

// Custom "Dalan Ying" styled small emoticon stickers
const CUSTOM_STICKERS = [
  { emoji: "💪", label: "加油" },
  { emoji: "🔥", label: "火" },
  { emoji: "👍", label: "赞" },
  { emoji: "🎯", label: "精准" },
  { emoji: "🏆", label: "冠军" },
  { emoji: "💰", label: "发财" },
  { emoji: "🚀", label: "起飞" },
  { emoji: "💀", label: "无语" },
  { emoji: "😎", label: "酷" },
  { emoji: "🍺", label: "干杯" },
  { emoji: "⚡", label: "快" },
  { emoji: "🗿", label: "沉默" },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"emoji" | "sticker">("emoji");

  useEffect(() => {
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 bg-[var(--color-bg-elevated)] border-[0.5px] border-[var(--color-border-default)] rounded-xl shadow-2xl z-50 w-80 animate-fade-up overflow-hidden"
    >
      {/* Tab bar */}
      <div className="flex border-b-[0.5px] border-[var(--color-border-subtle)]">
        <button
          onClick={() => setTab("emoji")}
          className={`flex-1 py-2 text-[11px] font-medium transition-all duration-200 ${
            tab === "emoji" ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
          }`}
        >
          😊 表情
        </button>
        <button
          onClick={() => setTab("sticker")}
          className={`flex-1 py-2 text-[11px] font-medium transition-all duration-200 ${
            tab === "sticker" ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
          }`}
        >
          ✨ 贴纸
        </button>
      </div>

      <div className="p-3">
        {tab === "emoji" ? (
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => { onSelect(emoji); onClose(); }}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[var(--color-bg-hover)] rounded-lg transition-all duration-150 hover:scale-125 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {CUSTOM_STICKERS.map((sticker, i) => (
              <button
                key={i}
                onClick={() => { onSelect(sticker.emoji); onClose(); }}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl hover:bg-[var(--color-bg-hover)] transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <span className="text-2xl">{sticker.emoji}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{sticker.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { EMOJIS, CUSTOM_STICKERS };
