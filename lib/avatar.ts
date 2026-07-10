// Auto-generated avatar system - generates unique colorful avatars based on name

const COLORS = [
  "#FF6B6B", "#FF8E53", "#FFD93D", "#6BCB77", "#4D96FF",
  "#9B59B6", "#E056A0", "#00BCD4", "#FF7043", "#26A69A",
  "#7E57C2", "#42A5F5", "#EF5350", "#66BB6A", "#FFA726",
  "#AB47BC", "#29B6F6", "#EC407A", "#8D6E63", "#78909C",
];

const PATTERNS = [
  "gradient", "dots", "waves", "grid", "circles",
];

// Generate a deterministic index from a name string
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate avatar SVG data URL from name
export function generateAvatar(name: string, size = 80): string {
  const hash = hashName(name);
  const color1 = COLORS[hash % COLORS.length];
  const color2 = COLORS[(hash * 7 + 3) % COLORS.length];
  const pattern = PATTERNS[hash % PATTERNS.length];
  const initial = name.charAt(0).toUpperCase();

  const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1}"/>
        <stop offset="100%" style="stop-color:${color2}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
    ${pattern === "dots" ? `<circle cx="${size * 0.3}" cy="${size * 0.25}" r="${size * 0.08}" fill="rgba(255,255,255,0.15)"/><circle cx="${size * 0.7}" cy="${size * 0.75}" r="${size * 0.06}" fill="rgba(255,255,255,0.12)"/><circle cx="${size * 0.2}" cy="${size * 0.7}" r="${size * 0.04}" fill="rgba(255,255,255,0.1)"/>` : ""}
    ${pattern === "circles" ? `<circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.35}" fill="rgba(255,255,255,0.08)"/><circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.2}" fill="rgba(255,255,255,0.06)"/>` : ""}
    ${pattern === "waves" ? `<path d="M0 ${size * 0.6} Q${size * 0.25} ${size * 0.45} ${size * 0.5} ${size * 0.6} T${size} ${size * 0.6} L${size} ${size} L0 ${size}Z" fill="rgba(255,255,255,0.1)"/>` : ""}
    <text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="${size * 0.4}" font-weight="700">${initial}</text>
  </svg>`;

  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(canvas)));
}

// Pre-defined avatar collection for selection
export const AVATAR_PRESETS = [
  { id: "robot", label: "🤖", bg: "from-slate-700 to-slate-900" },
  { id: "dragon", label: "🐉", bg: "from-red-700 to-orange-900" },
  { id: "lion", label: "🦁", bg: "from-amber-600 to-yellow-800" },
  { id: "eagle", label: "🦅", bg: "from-blue-700 to-indigo-900" },
  { id: "wolf", label: "🐺", bg: "from-gray-600 to-gray-800" },
  { id: "tiger", label: "🐯", bg: "from-orange-600 to-red-800" },
  { id: "shark", label: "🦈", bg: "from-cyan-700 to-blue-900" },
  { id: "phoenix", label: "🔥", bg: "from-red-600 to-pink-800" },
  { id: "knight", label: "⚔️", bg: "from-zinc-600 to-zinc-800" },
  { id: "skull", label: "💀", bg: "from-purple-700 to-violet-900" },
  { id: "crown", label: "👑", bg: "from-yellow-500 to-amber-700" },
  { id: "star", label: "⭐", bg: "from-blue-500 to-purple-700" },
];
