"use client";

import { useMemo } from "react";
import { generateAvatar } from "@/lib/avatar";

interface Props {
  name: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ name, avatarUrl, size = 32, className = "" }: Props) {
  const generated = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    return generateAvatar(name, size * 2); // 2x for retina
  }, [name, avatarUrl, size]);

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-zinc-600 to-zinc-500 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={generated}
        alt={name}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback: show initial
          (e.target as HTMLImageElement).style.display = "none";
          const parent = (e.target as HTMLImageElement).parentElement;
          if (parent) {
            parent.style.display = "flex";
            parent.style.alignItems = "center";
            parent.style.justifyContent = "center";
            parent.style.color = "white";
            parent.style.fontWeight = "bold";
            parent.style.fontSize = `${size * 0.4}px`;
            parent.textContent = name.charAt(0).toUpperCase();
          }
        }}
      />
    </div>
  );
}

// Reusable inline avatar for small spaces (like in post cards)
export function TinyAvatar({ name, avatarUrl, size = 20 }: Props) {
  const generated = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    return generateAvatar(name, size * 2);
  }, [name, avatarUrl, size]);

  return (
    <div
      className="rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-zinc-600 to-zinc-500"
      style={{ width: size, height: size }}
    >
      <img src={generated} alt={name} className="w-full h-full object-cover" />
    </div>
  );
}
