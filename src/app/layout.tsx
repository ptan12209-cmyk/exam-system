import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { MobileNav } from "@/components/pwa/MobileNav";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExamHub - Hệ thống thi trắc nghiệm online",
  description: "Nền tảng thi trắc nghiệm thông minh - Tạo đề nhanh, chấm điểm tự động",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ExamHub",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
};

const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('theme') || 'system';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
      document.documentElement.classList.add(resolved);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className="color-scheme-dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} antialiased selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]`}>
        <NextTopLoader 
          color="hsl(var(--foreground))"
          initialPosition={0.08}
          crawlSpeed={200}
          height={2}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="none"
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[hsl(var(--foreground))] focus:px-4 focus:py-2 focus:text-[hsl(var(--background))]">
          Bỏ qua đến nội dung chính
        </a>
        <ThemeProvider>
          <div id="main-content" className="relative">
            {children}
          </div>
          <MobileNav />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
