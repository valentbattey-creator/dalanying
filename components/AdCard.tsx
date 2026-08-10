"use client";

const ADS = [
  { title: "让你的内容也被看到", desc: "在这里投放广告 →" },
  { title: "流量变现 · 商务合作", desc: "点击了解详情" },
  { title: "大岚荧 · 推广位招租", desc: "精准触达高质量用户" },
];

export default function AdCard({ index }: { index: number }) {
  const ad = ADS[index % ADS.length];

  return (
    <article className="bg-[var(--color-bg-card)] rounded-[12px] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", border: "0.5px solid var(--color-border-subtle)" }}>
      {/* Subtle header */}
      <div className="aspect-[4/3] flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "var(--color-bg-hover)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>广告</p>
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
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "var(--color-bg-hover)", color: "var(--color-text-tertiary)" }}>
            推广
          </span>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">了解更多 →</span>
        </div>
      </div>
    </article>
  );
}
