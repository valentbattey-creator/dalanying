"use client";

const ADS = [
  { title: "让你的内容也被看到", desc: "在这里投放广告 →", color: "from-violet-600 to-purple-700" },
  { title: "流量变现 · 商务合作", desc: "点击了解详情", color: "from-amber-600 to-orange-700" },
  { title: "大岚荧 · 推广位招租", desc: "精准触达高质量用户", color: "from-emerald-600 to-teal-700" },
];

export default function AdCard({ index }: { index: number }) {
  const ad = ADS[index % ADS.length];

  return (
    <article className="bg-[var(--color-bg-card)] border-[0.5px] border-dashed border-[var(--color-border-default)]/50 rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[var(--color-accent)]/40 active:scale-[0.98]">
      {/* Ad gradient header */}
      <div className={`aspect-[4/3] bg-gradient-to-br ${ad.color} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYxMCIgZmlsbC1vcGFjaXR5PSIwLjEiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10 text-center">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-white text-xs font-semibold">广告</p>
        </div>
      </div>

      {/* Text */}
      <div className="p-2.5 space-y-1.5">
        <h3 className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-1">
          {ad.title}
        </h3>
        <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)] line-clamp-2">
          {ad.desc}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
            推广
          </span>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">了解更多 →</span>
        </div>
      </div>
    </article>
  );
}
