"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import { Sparkles, User, LogOut, LayoutDashboard, Brain, FileText, Users, LogIn, Bot, BookOpen, Trophy, Menu, X, ChevronRight } from "lucide-react"

export default function Sidebar() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hovered, setHovered] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const loadProfile = async (session: any | null) => {
      if (!session?.user) { setProfile(null); return }
      try { setProfile(await api.users.getProfile()) }
      catch { setProfile(null) }
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session || null
      setUser(session?.user || null)
      await loadProfile(session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)
      await loadProfile(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfileOpen(false)
    router.push("/")
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/quiz", label: "Generate", icon: Brain },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/rooms/create", label: "Create Room", icon: Users },
    { href: "/rooms/join", label: "Join Room", icon: LogIn },
    { href: "/flashcards", label: "Flashcards", icon: BookOpen },
    { href: "/achievements", label: "Achievements", icon: Trophy },
    { href: "/chat", label: "Chat", icon: Bot },
  ]

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-xl bg-gray-900/80 backdrop-blur-lg border border-white/5 flex items-center justify-center text-gray-400"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <nav
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col glass-strong border-r border-white/5 transition-all duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${hovered ? "w-56" : "w-16"}`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 h-16 px-4 border-b border-white/5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.png" alt="QuizzVerse" className="w-8 h-8 object-contain" />
          </div>
          <span className={`text-lg font-bold gradient-text whitespace-nowrap transition-opacity duration-300 ${
            hovered ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}>
            QuizzVerse
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap ${
                  active
                    ? "bg-purple-500/10 text-purple-300"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
                title={!hovered ? link.label : undefined}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                <span className={`transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  {link.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Profile / Login */}
        <div className="p-2 border-t border-white/5 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className={`text-left transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                  <p className="text-sm font-medium text-gray-300 truncate max-w-[120px]">
                    {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate max-w-[120px]">{user?.email}</p>
                </div>
                <ChevronRight className={`w-4 h-4 ml-auto shrink-0 transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute left-2 right-2 bottom-full mb-1 rounded-xl glass-strong border border-white/5 overflow-hidden shadow-2xl z-50 animate-scale-in">
                    <div className="p-1.5">
                      <Link href="/dashboard" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.04] transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-purple-400" /> Dashboard
                      </Link>
                      <Link href="/profile" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.04] transition-colors">
                        <User className="w-4 h-4 text-purple-400" /> Profile
                      </Link>
                      <hr className="border-white/5 my-1" />
                      <button onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-red-400 hover:bg-red-500/10 w-full transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link href="/login"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition-all">
                <LogIn className="w-5 h-5 shrink-0" />
                <span className={`transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>Sign In</span>
              </Link>
              <Link href="/signup"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all mt-1">
                <User className="w-5 h-5 shrink-0" />
                <span className={`transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>Get Started</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
