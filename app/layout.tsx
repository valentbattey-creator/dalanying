import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import LoginModal from "@/components/LoginModal";
import ProfileSetup from "@/components/ProfileSetup";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "sonner";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "大岚荧 - 发现你的兴趣世界",
    template: "%s | 大岚荧",
  },
  description: "大岚荧，一个面向新一代的内容社区。发现科技、汽车、运动、游戏、财经、美食、旅游等热门领域，分享你的热爱。",
  keywords: ["社区", "内容", "分享", "科技", "汽车", "运动", "游戏", "数码", "男性社区"],
  authors: [{ name: "大岚荧" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "大岚荧",
    title: "大岚荧 - 发现你的兴趣世界",
    description: "一个面向新一代的内容社区",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>蓝</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var bg = localStorage.getItem("dalanying_bg_image");
                if (bg) document.documentElement.style.setProperty("--user-bg-image", "url(" + bg + ")");
              } catch(e) {}
            `,
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white focus:rounded-lg focus:text-sm"
        >
          跳到主内容
        </a>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <div id="main-content">{children}</div>
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
