"use client";

import { useState, useRef, useEffect } from "react";

const EMOJIS = [
  // 常用表情
  "😂", "❤️", "🔥", "👍", "😭", "😊", "🙏", "💪",
  "🎉", "😍", "🤣", "💯", "✨", "😎", "🤔", "👀",
  "💀", "🚀", "💩", "🤡", "🐶", "🍉", "⚽", "🎮",
  // 大岚荧定制
  "🦾", "🏆", "💰", "📈", "🎯", "⚡", "🔞", "🍺",
  "🏀", "🎸", "⌨️", "📱", "🚗", "✈️", "🌍", "🔞",
  "💊", "🛒", "💡", "🗿", "🎪", "🎲", "🍻", "🥇",
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

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
      className="absolute bottom-full left-0 mb-2 bg-[var(--color-bg-elevated)] border-[0.5px] border-[var(--color-border-default)] rounded-xl shadow-2xl p-3 z-50 w-72 animate-fade-up"
    >
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
    </div>
  );
}

export { EMOJIS };
