"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import { Loader2, Trophy, Lock } from "lucide-react"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  type: string
  earned: boolean
  progress?: number
  target?: number
  earned_at?: string
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push("/login")
      try {
        const res = await api.achievements.list()
        setAchievements(res.achievements || [])
      } catch {}
      setLoading(false)
    })
  }, [router])

  const earned = achievements.filter((a) => a.earned)
  const total = achievements.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
        </div>
        <p className="text-sm text-gray-500 ml-[52px] mb-8">
          {earned.length}/{total} unlocked
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((badge) => {
            const earned_state = badge.earned
            return (
              <div
                key={badge.id}
                className={`relative p-5 rounded-2xl border transition-all ${
                  earned_state
                    ? "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.02]"
                    : "border-white/[0.06] bg-white/[0.02] opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-3xl ${earned_state ? "" : "grayscale"}`}>{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold ${earned_state ? "text-gray-200" : "text-gray-500"}`}>
                        {badge.name}
                      </p>
                      {!earned_state && <Lock className="w-3 h-3 text-gray-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                    {earned_state && badge.earned_at && (
                      <p className="text-[10px] text-amber-400/70 mt-1">
                        Earned {new Date(badge.earned_at).toLocaleDateString()}
                      </p>
                    )}
                    {!earned_state && badge.type === "progress" && badge.progress !== undefined && badge.target && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>{badge.progress}/{badge.target}</span>
                          <span>{Math.round((badge.progress / badge.target) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
                            style={{ width: `${Math.min((badge.progress / badge.target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
