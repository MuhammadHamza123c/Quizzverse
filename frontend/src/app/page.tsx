"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Sparkles, Brain, FileText, Users, Trophy, Zap, ArrowRight, Shield, BarChart3, TrendingUp, ChevronRight, Bot, Rocket, Star, Quote } from "lucide-react"

export default function Home() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
  }, [])

  return (
    <div className="min-h-screen">
      {/* ──────────── Hero ──────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/6 rounded-full blur-[140px] animate-float-delayed" />

        <div className="absolute top-1/3 right-[15%] w-2 h-2 rounded-full bg-purple-400/40 animate-ping-slow hidden md:block" />
        <div className="absolute bottom-1/3 left-[15%] w-3 h-3 rounded-full bg-cyan-400/30 animate-ping-slower hidden md:block" />
        <div className="absolute top-[20%] left-[10%] w-1.5 h-1.5 rounded-full bg-pink-400/40 animate-ping-slower hidden md:block" />

        <div className="relative text-center max-w-5xl mx-auto pt-16 md:pt-24">
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6 animate-fade-in-up tracking-tight">
            Learn Smarter
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
              with AI Quizzes
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up-delay">
            Create intelligent quizzes on any topic, upload documents for instant question generation,
            and compete with friends in real-time multiplayer rooms.
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up-delay-2">
            {user && (
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg
                  bg-gradient-to-r from-purple-600 to-purple-500 text-white
                  shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35
                  transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                <span className="relative">Go to Dashboard</span>
                <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <Link
              href="/quiz"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg
                border border-white/10 text-gray-300
                hover:bg-white/[0.03] hover:border-white/20
                transition-all duration-300 hover:-translate-y-0.5"
            >
              Try a Quiz
              <Zap className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-8 mt-16 text-sm text-gray-500 animate-fade-in-up-delay-2">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400/60" /> No credit card
            </span>
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400/60" /> AI-powered
            </span>
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400/60" /> Free to start
            </span>
          </div>
        </div>
      </section>

      

      {/* ──────────── Features ──────────── */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/8 border border-purple-500/15 text-purple-300 text-xs font-medium mb-4">
              <Star className="w-3 h-3" /> Features
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Three powerful features that make learning and quizzing effortless
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                accent: "from-purple-500/10 to-purple-600/5",
                border: "hover:border-purple-500/25",
                iconBg: "bg-purple-500/10",
                iconColor: "text-purple-400",
                badgeColor: "bg-purple-500/10 text-purple-400",
                title: "AI Quiz Generator",
                desc: "Type any topic and get intelligent questions instantly. Choose difficulty, number of questions, and start learning.",
                link: "/quiz",
              },
              {
                icon: FileText,
                accent: "from-cyan-500/10 to-blue-600/5",
                border: "hover:border-cyan-500/25",
                iconBg: "bg-cyan-500/10",
                iconColor: "text-cyan-400",
                badgeColor: "bg-cyan-500/10 text-cyan-400",
                title: "Document Quizzes",
                desc: "Upload PDF, DOCX, or TXT files. Our AI extracts the content and generates a complete quiz from your material.",
                link: "/documents",
              },
              {
                icon: Users,
                accent: "from-amber-500/10 to-orange-600/5",
                border: "hover:border-amber-500/25",
                iconBg: "bg-amber-500/10",
                iconColor: "text-amber-400",
                badgeColor: "bg-amber-500/10 text-amber-400",
                title: "Multiplayer Rooms",
                desc: "Create rooms, invite friends, and compete in real-time. Final leaderboards show who&apos;s on top.",
                link: "/rooms/create",
              },
            ].map((feature, i) => (
              <Link
                key={i}
                href={feature.link}
                className="group relative p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1"
                style={{ animation: `fade-in-up 0.5s ease-out ${i * 0.1}s both` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]`} />
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-white transition-colors">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">{feature.desc}</p>
                  <div className={`flex items-center gap-1.5 mt-6 text-sm font-medium ${feature.iconColor} opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0`}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── How It Works ──────────── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/8 border border-cyan-500/15 text-cyan-300 text-xs font-medium mb-4">
              <Rocket className="w-3 h-3" /> Process
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Four simple steps to start learning
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-[3.25rem] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { num: "01", icon: Bot, title: "Choose Method", desc: "Type a topic, upload a doc, or join a room", color: "from-purple-500/15 to-purple-600/10", border: "border-purple-500/15" },
                { num: "02", icon: Sparkles, title: "AI Generates", desc: "Our AI creates smart questions in seconds", color: "from-cyan-500/15 to-blue-600/10", border: "border-cyan-500/15" },
                { num: "03", icon: Zap, title: "Start Playing", desc: "Answer questions solo or with friends", color: "from-amber-500/15 to-orange-600/10", border: "border-amber-500/15" },
                { num: "04", icon: Trophy, title: "Track Progress", desc: "See scores, accuracy, and improvement", color: "from-emerald-500/15 to-green-600/10", border: "border-emerald-500/15" },
              ].map((step, i) => (
                <div key={i} className="text-center group" style={{ animation: `fade-in-up 0.5s ease-out ${i * 0.15}s both` }}>
                  <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 border ${step.border} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <step.icon className="w-8 h-8 text-gray-300 group-hover:text-white transition-colors" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-gray-900 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 text-base">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── Testimonial ──────────── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-6 sm:p-10 md:p-14 rounded-3xl border border-white/[0.06] bg-gradient-to-br from-purple-500/[0.02] to-cyan-500/[0.02] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[60px]" />
            <div className="relative">
              <Quote className="w-10 h-10 text-purple-400/20 mb-6" />
              <blockquote className="text-xl md:text-2xl text-gray-300 leading-relaxed mb-8 font-medium">
                &ldquo;QuizzVerse has completely changed how I study. The AI generates perfect questions from my notes, and playing with friends makes learning actually fun.&rdquo;
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div>
                  <div className="font-medium">Alex Chen</div>
                  <div className="text-sm text-gray-500">Computer Science Student</div>
                </div>
                <div className="ml-auto flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="py-16 sm:py-24 px-4 text-center relative">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/15 to-yellow-600/10 flex items-center justify-center mx-auto mb-6 border border-amber-400/15">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Ready to Start Your Quiz Journey?
          </h2>
          <p className="text-gray-400 mb-10 text-lg max-w-xl mx-auto leading-relaxed">
            Join thousands of learners who are using AI to study smarter and compete with friends.
          </p>
          {!user && (
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg
                bg-gradient-to-r from-purple-600 to-cyan-500 text-white
                shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35
                transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
              <span className="relative">Create Free Account</span>
              <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </section>

      {/* ──────────── Footer ──────────── */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400/60" />
            <span className="font-medium text-gray-400">QuizzVerse</span>
          </div>
          <div className="flex items-center gap-6">
            <span>&copy; 2026 QuizzVerse. All rights reserved.</span>
            <span className="text-gray-600 text-sm">Designed &amp; developed by Alex Chen — Pakistani Student</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
