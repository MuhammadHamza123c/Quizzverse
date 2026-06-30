"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import BadgePopup from "@/components/BadgePopup"
import {
  Loader2, RotateCcw, CheckCircle2, Circle, ChevronDown,
  ChevronRight, AlertCircle, Filter
} from "lucide-react"

interface Flashcard {
  id: string
  quiz_id: string
  quiz_title?: string
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  user_wrong_answer: string | null
  explanation: string | null
  difficulty: string
  created_at: string
  reviewed: boolean
}

export default function ReviewPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "unreviewed" | "reviewed">("all")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [badgePopup, setBadgePopup] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push("/login")
      try {
        const res = await api.flashcards.list()
        setFlashcards(res.flashcards || [])
      } catch (err: any) {
        setError(err.message)
      }
      setLoading(false)
    })
  }, [router])

  const filteredCards = useMemo(() => {
    let cards = flashcards
    if (filter === "unreviewed") cards = cards.filter((c) => !c.reviewed)
    if (filter === "reviewed") cards = cards.filter((c) => c.reviewed)
    if (difficultyFilter !== "all") cards = cards.filter((c) => c.difficulty === difficultyFilter)
    return cards
  }, [flashcards, filter, difficultyFilter])

  const grouped = useMemo(() => {
    const map: Record<string, Flashcard[]> = {}
    for (const card of filteredCards) {
      const key = card.quiz_title || "Untitled Quiz"
      if (!map[key]) map[key] = []
      map[key].push(card)
    }
    return map
  }, [filteredCards])

  const stats = useMemo(() => ({
    total: flashcards.length,
    reviewed: flashcards.filter((c) => c.reviewed).length,
    unreviewed: flashcards.filter((c) => !c.reviewed).length,
  }), [flashcards])

  const handleToggleReview = async (id: string) => {
    try {
      const res = await api.flashcards.toggleReview(id)
      const becameReviewed = res.flashcard.reviewed
      setFlashcards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, reviewed: becameReviewed } : c))
      )
      if (becameReviewed) {
        const reviewedCount = flashcards.filter((c) => c.id !== id && c.reviewed).length + 1
        const achRes = await api.achievements.check({
          event: "flashcard_reviewed",
          data: { total_reviewed: reviewedCount },
        })
        if (achRes.new_achievements?.length > 0) setBadgePopup(achRes.new_achievements[0])
      }
    } catch {}
  }

  const handleMarkAllReviewed = async (cards: Flashcard[]) => {
    const unreviewed = cards.filter((c) => !c.reviewed)
    for (const card of unreviewed) {
      await api.flashcards.toggleReview(card.id).catch(() => {})
      setFlashcards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, reviewed: true } : c))
      )
    }
  }

  const toggleGroup = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wrong Answer Bank</h1>
            <p className="text-sm text-gray-500">
              {stats.total} total &middot; {stats.reviewed} reviewed
              {stats.total > 0 && ` (${Math.round((stats.reviewed / stats.total) * 100)}%)`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/15 text-sm text-red-400">{error}</div>
        )}

        {/* Filters */}
        {flashcards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Filter className="w-4 h-4 text-gray-500" />
            {(["all", "unreviewed", "reviewed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "unreviewed" && stats.unreviewed > 0 && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                    {stats.unreviewed}
                  </span>
                )}
              </button>
            ))}
            <div className="w-px h-5 bg-white/5 mx-1" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-purple-500/30"
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        )}

        {/* Empty state */}
        {flashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">No Wrong Answers</h2>
            <p className="text-sm text-gray-500 max-w-md mb-8">
              You haven&apos;t answered any questions wrong yet. Take a quiz and get some wrong to see them here!
            </p>
            <Link
              href="/quiz"
              className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              Take a Quiz
            </Link>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-500/10 flex items-center justify-center mb-6">
              <Filter className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">No Matches</h2>
            <p className="text-sm text-gray-500 max-w-md">
              No wrong answers match the current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([quizTitle, cards]) => (
              <div
                key={quizTitle}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(quizTitle)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {expanded[quizTitle] !== false ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm font-medium text-gray-200">{quizTitle}</span>
                    <span className="text-xs text-gray-500">
                      ({cards.length} wrong{cards.filter((c) => c.reviewed).length > 0 ? `, ${cards.filter((c) => c.reviewed).length} reviewed` : ""})
                    </span>
                  </div>
                  {cards.some((c) => !c.reviewed) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkAllReviewed(cards) }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition-all"
                    >
                      Mark All Reviewed
                    </button>
                  )}
                </button>

                {/* Cards */}
                {(expanded[quizTitle] !== false) && (
                  <div className="divide-y divide-white/[0.04]">
                    {cards.map((card) => (
                      <div key={card.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Question */}
                            <p className="text-sm text-gray-200 mb-3 leading-relaxed">
                              {card.question_text}
                            </p>

                            {/* Options */}
                            {card.options ? (
                              <div className="space-y-1.5 mb-3">
                                {Object.entries(card.options).map(([key, val]) => {
                                  const isUserWrong = key === card.user_wrong_answer
                                  const isCorrect = key === card.correct_answer
                                  let bgClass = "bg-white/[0.03] text-gray-500"
                                  let label = ""
                                  if (isCorrect && isUserWrong) {
                                    bgClass = "bg-amber-500/10 text-amber-300"
                                    label = "correct + yours"
                                  } else if (isCorrect) {
                                    bgClass = "bg-emerald-500/8 text-emerald-300"
                                    label = "correct"
                                  } else if (isUserWrong) {
                                    bgClass = "bg-red-500/8 text-red-300"
                                    label = "your answer"
                                  }
                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${bgClass}`}
                                    >
                                      <span>
                                        <span className="font-medium mr-1.5">{key}.</span>
                                        {val}
                                      </span>
                                      {label && (
                                        <span className="text-[10px] opacity-70 ml-2 shrink-0">({label})</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-xs mb-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/8 text-red-300">
                                  <AlertCircle className="w-3 h-3" />
                                  Your answer: {card.user_wrong_answer || "(empty)"}
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Correct: {card.correct_answer}
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {card.explanation && (
                              <p className="text-xs text-gray-500 italic leading-relaxed">
                                {card.explanation}
                              </p>
                            )}
                          </div>

                          {/* Review toggle */}
                          <button
                            onClick={() => handleToggleReview(card.id)}
                            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                              card.reviewed
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "text-gray-500 hover:text-emerald-400 hover:bg-white/[0.04]"
                            }`}
                            title={card.reviewed ? "Mark unreviewed" : "Mark reviewed"}
                          >
                            {card.reviewed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BadgePopup badge={badgePopup} onClose={() => setBadgePopup(null)} />
    </div>
  )
}
