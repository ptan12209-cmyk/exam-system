import { Instrument_Serif, JetBrains_Mono, Inter } from "next/font/google"
import "@/app/globals.css"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains-mono",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
})

export default function StudentLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <div
      className={`theme-dream-engine dark ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} min-h-screen`}
    >
      {children}
    </div>
  )
}
