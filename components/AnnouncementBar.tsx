"use client";
import { useState } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
}

export default function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  if (!announcements || announcements.length === 0) return null;

  // Show first announcement in the bar
  const current = announcements[0];

  return (
    <>
      {/* Announcement strip */}
      <div
        onClick={() => setSelectedAnnouncement(current)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 16px",
          backgroundColor: "var(--color-bg-secondary)",
          cursor: "pointer",
          transition: "all 0.2s",
          borderBottom: "0.5px solid var(--color-border-subtle)"
        }}
      >
        {/* Speaker icon */}
        <span style={{ fontSize: "14px", flexShrink: 0 }}>📢</span>

        {/* Announcement text - single line with ellipsis */}
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "13px",
          color: "var(--color-text-secondary)",
          lineHeight: "1.4"
        }}>
          {current.title}
        </div>

        {/* Right arrow */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Modal / Bottom Sheet */}
      {selectedAnnouncement && (
        <div
          onClick={() => setSelectedAnnouncement(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="md:rounded-2xl"
            style={{
              width: "90%",
              maxWidth: "480px",
              maxHeight: "70vh",
              backgroundColor: "var(--color-bg-card)",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "0.5px solid var(--color-border-subtle)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>📢</span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)" }}>公告</span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "var(--color-bg-hover)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-tertiary)"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              WebkitOverflowScrolling: "touch"
            }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: "12px",
                lineHeight: "1.5"
              }}>
                {selectedAnnouncement.title}
              </h3>
              <p style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                lineHeight: "1.8",
                whiteSpace: "pre-wrap"
              }}>
                {selectedAnnouncement.content}
              </p>
            </div>

            {/* Footer button */}
            <div style={{
              padding: "16px 20px",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              borderTop: "0.5px solid var(--color-border-subtle)"
            }}>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "10px",
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
