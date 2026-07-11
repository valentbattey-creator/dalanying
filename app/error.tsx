"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-purple-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
          蓝
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">出了点问题</h1>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-6 leading-relaxed">
          页面遇到了一些错误，请尝试刷新。
        </p>
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        >
          刷新页面
        </button>
      </div>
    </div>
  );
}
