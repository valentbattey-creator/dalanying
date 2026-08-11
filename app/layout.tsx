import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import LoginModal from "@/components/LoginModal";
import ProfileSetup from "@/components/ProfileSetup";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "sonner";
import "./tailwind.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.dalanying.work"),
  title: {
    default: "大岚荧 - 发现你的兴趣世界",
    template: "%s | 大岚荧",
  },
  description: "大岚荧(dalanying)，一个面向新一代年轻人的内容社区。在这里讨论科技数码、汽车运动、游戏健身、美食旅游、月落浮生、思维探讨等热门话题，分享你的热爱与见解。",
  keywords: [
    "大岚荧", "dalanying", "社区", "论坛", "内容社区", "年轻人社区",
    "科技", "数码", "汽车", "运动", "游戏", "健身", "户外", "财经",
    "美食", "旅游", "穿搭", "摄影", "宠物", "音乐", "电影", "动漫",
    "缘渡", "思维探讨", "月落", "浮生", "成长",
    "男性社区", "兴趣社区", "分享", "讨论",
  ],
  authors: [{ name: "大岚荧" }],
  creator: "大岚荧",
  publisher: "大岚荧",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "大岚荧",
    title: "大岚荧 - 发现你的兴趣世界",
    description: "一个面向新一代年轻人的内容社区，发现科技、汽车、游戏、美食等热门话题",
    url: "https://www.dalanying.work",
  },
  twitter: {
    card: "summary",
    title: "大岚荧 - 发现你的兴趣世界",
    description: "一个面向新一代年轻人的内容社区",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://www.dalanying.work",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>蓝</text></svg>",
  },
  other: {
    "baidu-site-verification": "codeva-placeholder",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "大岚荧",
    alternateName: "dalanying",
    url: "https://www.dalanying.work",
    description: "一个面向新一代年轻人的内容社区",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.dalanying.work/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* 字体：使用国内可访问的镜像源 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 搜索引擎收录提示 */}
        <meta name="applicable-device" content="pc,mobile" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var bg = localStorage.getItem("dalanying_bg_image");
                var fs = localStorage.getItem("dalanying_font_size");
                if (fs) document.documentElement.style.setProperty("--font-scale", fs + "px");
                if (bg) document.documentElement.style.setProperty("--user-bg-image", "url(" + bg + ")");
              } catch(e) {}
            `,
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not:sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white focus:rounded-lg focus:text-sm"
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
