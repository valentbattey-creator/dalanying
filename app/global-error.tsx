"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: "#0c0c0e" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "20px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "28px",
                fontWeight: "bold",
                margin: "0 auto 24px",
              }}
            >
              蓝
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#e8e8ea",
                marginBottom: "8px",
              }}
            >
              出了点问题
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#71717a",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              页面遇到了一些错误，请尝试刷新页面。
              {error.digest && (
                <span
                  style={{ display: "block", fontSize: "11px", marginTop: "4px" }}
                >
                  ID: {error.digest}
                </span>
              )}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
