import type { Metadata, Viewport } from "next"
import {
  Inter,
  JetBrains_Mono,
  Instrument_Serif,
  Plus_Jakarta_Sans,
  IBM_Plex_Sans,
} from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { ToastProvider } from "@/components/ui/toast"
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister"
import { DeviceSessionGuard } from "@/components/DeviceSessionGuard"
import { MobileNav } from "@/components/pwa/MobileNav"
import NextTopLoader from "nextjs-toploader"
import { cn } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const instrumentSerif = Instrument_Serif({
  weight: "400",
  // Instrument Serif has no Vietnamese glyphs — keep latin only for decorative English.
  // User content (folder/lesson titles) must use Inter / Plus Jakarta / IBM Plex (vietnamese subset).
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
})

const ibmPlex = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "StudyHub - Hệ thống học tập & bài giảng online",
  description:
    "Nền tảng học trực tuyến thông minh - Xem video bài giảng, ôn tập tài liệu hiệu quả",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudyHub",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0A13" },
  ],
}

const themeScript = `
  (function() {
    try {
      var root = document.documentElement;
      var theme = localStorage.getItem('theme') || 'system';
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
      if (resolved !== 'light' && resolved !== 'dark') resolved = 'dark';
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.dataset.mode = resolved;

      var brand = localStorage.getItem('design-theme') || 'dream';
      if (brand !== 'dream' && brand !== 'dol' && brand !== 'swiss') brand = 'dream';
      root.classList.remove('theme-dream', 'theme-dol', 'theme-swiss');
      root.classList.add('theme-' + brand);
      root.dataset.design = brand;
    } catch (e) {}
  })();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn(
        inter.variable,
        jetbrainsMono.variable,
        instrumentSerif.variable,
        plusJakarta.variable,
        ibmPlex.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased font-sans selection:bg-[hsl(var(--primary))] selection:text-[hsl(var(--primary-foreground))]">
        <NextTopLoader
          color="hsl(var(--primary))"
          initialPosition={0.08}
          crawlSpeed={200}
          height={2}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="none"
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[hsl(var(--foreground))] focus:px-4 focus:py-2 focus:text-[hsl(var(--background))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          Bỏ qua đến nội dung chính
        </a>
        <ThemeProvider>
          <ToastProvider>
            <div id="main-content" className="relative" tabIndex={-1}>
              {children}
            </div>
            <MobileNav />
            <ServiceWorkerRegister />
            <DeviceSessionGuard />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
