import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
          蓝
        </div>
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">404</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">页面不存在，可能已被移除或输入了错误的地址</p>
        <Link
          href="/"
          className="btn-primary text-sm px-6 py-2.5 rounded-xl inline-flex transition-all duration-300"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
