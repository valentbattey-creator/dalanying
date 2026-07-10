"use client";

export default function AdminBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[10px]";
  return (
    <span
      className={`${s} inline-flex items-center justify-center rounded-full bg-amber-500 text-black font-extrabold shrink-0`}
      title="管理员"
    >
      <svg width="60%" height="60%" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </span>
  );
}
