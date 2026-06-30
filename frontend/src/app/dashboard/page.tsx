"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import { Brain, FileText, Users, Sparkles, Clock, Zap, TrendingUp, ArrowRight, BarChart3, ChevronRight, X, Target } from "lucide-react"
import type { Quiz } from "@/types"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push("/login")
      setUser(data.session.user)
      try {
        const [profileData, quizData] = await Promise.all([
          api.users.getProfile(),
          api.quizzes.list(),
        ])
        setProfile(profileData)
        setQuizzes(quizData || [])
      } catch {}
      setLoading(false)
    })
  }, [router])

  const handleDeleteQuiz = async (quizId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await api.quizzes.delete(quizId)
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  const played = profile?.total_quizzes_played || 0
  const totalScore = profile?.total_score || 0

  const stats = [
    { label: "Total Quizzes", value: quizzes.length, icon: Brain, border: "border-purple-500/15", iconColor: "text-purple-400", bg: "bg-purple-500/8" },
    { label: "Quizzes Played", value: played, icon: BarChart3, border: "border-cyan-500/15", iconColor: "text-cyan-400", bg: "bg-cyan-500/8" },
    { label: "Total Score", value: totalScore, icon: TrendingUp, border: "border-amber-500/15", iconColor: "text-amber-400", bg: "bg-amber-500/8" },
    { label: "Avg Score", value: played > 0 ? Math.round(totalScore / played) : "—", icon: Target, border: "border-emerald-500/15", iconColor: "text-emerald-400", bg: "bg-emerald-500/8" },
  ]

  const quickActions = [
    { href: "/quiz", icon: Brain, label: "Generate Quiz", desc: "Create with AI", color: "text-purple-400" },
    { href: "/documents", icon: FileText, label: "Upload Document", desc: "PDF → Quiz", color: "text-cyan-400" },
    { href: "/rooms/create", icon: Users, label: "Create Room", desc: "Play together", color: "text-amber-400" },
  ]

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, <span className="text-gray-300 font-medium">{profile?.full_name || user?.email?.split("@")[0]}</span>
            </p>
          </div>
          <Link href="/quiz" className="btn-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> New Quiz
          </Link>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className={`card p-5 ${stat.bg} ${stat.border}`}>
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm text-gray-400 uppercase tracking-wider">
          <Zap className="w-4 h-4 text-purple-400" /> Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="card p-5 flex items-center gap-4 group"
            >
              <div className={`w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:border-purple-500/20 transition-colors`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-gray-500">{action.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-all group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        {/* Recent Quizzes */}
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm text-gray-400 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-purple-400" /> Recent Quizzes
        </h2>
        {quizzes.length === 0 ? (
          <div className="card p-16 text-center">
            <Brain className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">No quizzes yet. Create your first one!</p>
            <Link href="/quiz" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Create Quiz
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.slice(0, 6).map((quiz, i) => (
              <Link
                key={quiz.id}
                href={`/quiz/${quiz.id}`}
                className="card p-5 card-glow relative"
                style={{ animation: `fade-in-up 0.4s ease-out ${i * 0.05}s both` }}
              >
                <button
                  onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-red-500/15 border border-white/5 hover:border-red-500/30 flex items-center justify-center transition-all"
                >
                  <X className="w-3 h-3 text-gray-500 hover:text-red-400" />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`badge ${
                    quiz.difficulty === "easy" ? "badge-easy" : quiz.difficulty === "medium" ? "badge-medium" : "badge-hard"
                  }`}>{quiz.difficulty}</span>
                  <span className="text-xs text-gray-600">{quiz.source}</span>
                </div>
                <h3 className="font-medium text-sm truncate mb-2">{quiz.title}</h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{quiz.question_count} questions</span>
                  <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
