"use client";
import React, { useState, useEffect } from "react";

interface MasonryGridProps {
  children: React.ReactNode[];
  columns?: { mobile: number; desktop: number };
  gap?: number;
  breakpoint?: number;
}

export default function MasonryGrid({ 
  children, 
  columns = { mobile: 1, desktop: 3 },
  gap = 16,
  breakpoint = 1024
}: MasonryGridProps) {
  const [columnCount, setColumnCount] = useState(columns.mobile);

  useEffect(() => {
    const checkScreen = () => {
      setColumnCount(window.innerWidth >= breakpoint ? columns.desktop : columns.mobile);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, [breakpoint, columns.mobile, columns.desktop]);

  // Simple column distribution - no useMemo to avoid stale closures
  const cols: React.ReactNode[][] = Array.from({ length: columnCount }, () => []);
  children.forEach((child, i) => {
    cols[i % columnCount].push(child);
  });

  return (
    <div style={{ 
      display: "flex", 
      gap: `${gap}px`,
      width: "100%",
      alignItems: "flex-start"
    }}>
      {cols.map((colItems, colIndex) => (
        <div key={colIndex} style={{ flex: 1, minWidth: 0 }}>
          {colItems.map((item, i) => (
            <div key={i} style={{ marginBottom: `${gap}px` }}>
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
