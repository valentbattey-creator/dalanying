import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import LoginModal from "@/components/LoginModal";
import "./globals.css";

export const metadata: Metadata = {
  title: "dalanying",
  description: "发现科技、汽车、运动、游戏、财经等男性兴趣领域的热门内容",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <DataProvider>
            {children}
            <LoginModal />
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
