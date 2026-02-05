import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { MobileNav } from "@/components/pwa/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// Script to prevent theme flash on load
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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ServiceWorkerRegister />
          <div className="pb-16 md:pb-0">
            {children}
          </div>
          <MobileNav />
          {/* <InstallPrompt /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}

