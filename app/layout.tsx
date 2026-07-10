import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import LoginModal from "@/components/LoginModal";
import ProfileSetup from "@/components/ProfileSetup";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "大岚荧",
  description: "发现科技、汽车、运动、游戏、财经等男性兴趣领域的热门内容",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              {children}
              <BottomNav />
              <LoginModal />
              <ProfileSetup />
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: "rgba(28,28,31,0.85)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid #333336",
                    color: "#e8e8ea",
                    fontSize: "13px",
                    borderRadius: "12px",
                  },
                }}
              />
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
