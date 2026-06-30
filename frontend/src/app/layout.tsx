import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "QuizzVerse - AI-Powered Quiz Platform",
  description: "Create, play, and compete in AI-generated quizzes",
  icons: { icon: "/logo.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="particles">
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
        </div>
        <Navbar />
        <main className="md:ml-16 relative z-10">
          <div className="md:hidden h-16" />
          {children}
        </main>
      </body>
    </html>
  )
}
